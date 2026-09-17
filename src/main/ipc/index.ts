import { ipcMain, shell, dialog, clipboard } from 'electron'
import { stat, readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { IPC } from '@shared/ipc'
import type {
  CreateLinkInput,
  CreateRelationInput,
  CreateTagInput,
  PathInfo,
  UpdateLinkInput
} from '@shared/types'
import {
  collectionRepo,
  folderExclusionRepo,
  graphRepo,
  linkRepo,
  relationRepo,
  tagRepo
} from '../repositories'
import { fetchMeta } from '../services/metaFetch'
import { readTextFileContent, readBinaryFile } from '../services/fileContent'
import { importFolderFiles, listFolderTree, previewFolderSync, syncFolderTag } from '../services/folderImport'
import { checkAllBrokenLinks } from '../services/linkHealth'
import { exportAllData, importAllData, type ExportedData } from '../services/dataPortability'
import { broadcastGraphChanged } from '../windowEvents'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.graphSnapshot, () => graphRepo.snapshot())
  ipcMain.handle(IPC.counts, () => graphRepo.counts())

  ipcMain.handle(IPC.linkCreate, async (_e, input: CreateLinkInput) => {
    const link = await linkRepo.create(input)
    // 빠른 캡처 팝업(P12) 등 다른 창에서 만든 링크도 메인 창이 알아채고 새로고침하도록 알림
    broadcastGraphChanged()
    return link
  })
  ipcMain.handle(IPC.linkUpdate, (_e, id: string, patch: UpdateLinkInput) =>
    linkRepo.update(id, patch)
  )
  ipcMain.handle(IPC.linkTrash, (_e, id: string) => linkRepo.trash(id))
  ipcMain.handle(IPC.linkRestore, (_e, id: string) => linkRepo.restore(id))
  ipcMain.handle(IPC.linkDelete, (_e, id: string) => linkRepo.remove(id))
  ipcMain.handle(IPC.linkToggleFavorite, (_e, id: string) => linkRepo.toggleFavorite(id))
  ipcMain.handle(IPC.linkMarkOpened, (_e, id: string) => linkRepo.markOpened(id))

  ipcMain.handle(IPC.tagCreate, (_e, input: CreateTagInput) => tagRepo.create(input))
  ipcMain.handle(IPC.tagUpdate, (_e, id: string, patch: Partial<CreateTagInput>) =>
    tagRepo.update(id, patch)
  )
  ipcMain.handle(IPC.tagDelete, (_e, id: string) => tagRepo.remove(id))
  ipcMain.handle(IPC.tagMerge, (_e, sourceTagId: string, targetTagId: string) =>
    tagRepo.mergeInto(sourceTagId, targetTagId)
  )

  ipcMain.handle(IPC.relationCreate, (_e, input: CreateRelationInput) =>
    relationRepo.create(input)
  )
  ipcMain.handle(IPC.relationDelete, (_e, id: string) => relationRepo.remove(id))

  ipcMain.handle(IPC.collectionCreate, (_e, name: string, parentId: string | null) =>
    collectionRepo.create(name, parentId)
  )
  ipcMain.handle(IPC.collectionDelete, (_e, id: string) => collectionRepo.remove(id))
  ipcMain.handle(IPC.collectionMove, (_e, id: string, parentId: string | null) =>
    collectionRepo.move(id, parentId)
  )
  ipcMain.handle(IPC.collectionAddLink, (_e, collectionId: string, linkId: string) =>
    collectionRepo.addLink(collectionId, linkId)
  )
  ipcMain.handle(IPC.collectionRemoveLink, (_e, collectionId: string, linkId: string) =>
    collectionRepo.removeLink(collectionId, linkId)
  )

  ipcMain.handle(IPC.metaFetch, (_e, url: string) => fetchMeta(url))
  ipcMain.handle(IPC.openExternal, (_e, url: string) => shell.openExternal(url))

  // 로컬 파일/폴더
  ipcMain.handle(IPC.openPath, (_e, path: string) => shell.openPath(path))
  ipcMain.handle(IPC.pickPaths, async (_e, mode: 'file' | 'folder') => {
    const properties: Array<'openFile' | 'openDirectory' | 'multiSelections'> =
      mode === 'folder' ? ['openDirectory'] : ['openFile', 'multiSelections']
    const res = await dialog.showOpenDialog({ properties })
    return res.canceled ? [] : res.filePaths
  })
  ipcMain.handle(IPC.pathInfo, async (_e, path: string): Promise<PathInfo> => {
    const title = basename(path) || path
    try {
      const s = await stat(path)
      const kind = s.isDirectory() ? 'folder' : 'file'
      const content = kind === 'file' ? await readTextFileContent(path) : null
      return { kind, title, exists: true, content }
    } catch {
      return { kind: 'file', title, exists: false, content: null }
    }
  })

  ipcMain.handle(IPC.pathMtime, async (_e, path: string) => {
    try {
      const s = await stat(path)
      return { exists: true, mtime: s.mtimeMs }
    } catch {
      return { exists: false, mtime: null }
    }
  })

  ipcMain.handle(IPC.readBinary, (_e, path: string) => readBinaryFile(path))

  ipcMain.handle(IPC.copyText, (_e, text: string) => clipboard.writeText(text))

  // 폴더 가져오기(P3) / 폴더 동기화(P4)
  ipcMain.handle(IPC.folderList, (_e, rootPath: string) => listFolderTree(rootPath))
  ipcMain.handle(
    IPC.folderImport,
    (_e, rootPath: string, relativePaths: string[], extTags?: boolean) =>
      importFolderFiles(rootPath, relativePaths, extTags)
  )
  ipcMain.handle(IPC.folderSyncPreview, (_e, tagId: string) => previewFolderSync(tagId))
  ipcMain.handle(IPC.folderSync, (_e, tagId: string) => syncFolderTag(tagId))
  ipcMain.handle(IPC.folderExclusionsGet, (_e, tagId: string) => folderExclusionRepo.listForTag(tagId))
  ipcMain.handle(IPC.folderExclusionsSet, (_e, tagId: string, excluded: string[]) =>
    folderExclusionRepo.setForTag(tagId, excluded)
  )

  ipcMain.handle(IPC.linksCheckBroken, () => checkAllBrokenLinks())

  // 전체 데이터 내보내기/가져오기(P6) — 로컬 백업/이전용. 클라우드 동기화 없음.
  ipcMain.handle(IPC.dataExport, async () => {
    const res = await dialog.showSaveDialog({
      defaultPath: `linkmap-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePath) return { canceled: true }
    const data = await exportAllData()
    await writeFile(res.filePath, JSON.stringify(data, null, 2), 'utf8')
    return { canceled: false, path: res.filePath }
  })
  ipcMain.handle(IPC.dataImport, async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePaths[0]) return { canceled: true }
    try {
      const raw = await readFile(res.filePaths[0], 'utf8')
      const data = JSON.parse(raw) as Partial<ExportedData>
      const summary = await importAllData(data)
      return { canceled: false, summary }
    } catch (e) {
      const message = e instanceof Error && e.message.startsWith('unsupported_export_version:')
        ? e.message.slice('unsupported_export_version:'.length).trim()
        : '파일을 읽지 못했거나 형식이 올바르지 않습니다.'
      return { canceled: false, error: message }
    }
  })
}
