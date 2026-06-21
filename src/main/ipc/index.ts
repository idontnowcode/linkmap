import { ipcMain, shell, dialog, clipboard } from 'electron'
import { stat } from 'node:fs/promises'
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
  graphRepo,
  linkRepo,
  relationRepo,
  tagRepo
} from '../repositories'
import { fetchMeta } from '../services/metaFetch'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.graphSnapshot, () => graphRepo.snapshot())
  ipcMain.handle(IPC.counts, () => graphRepo.counts())

  ipcMain.handle(IPC.linkCreate, (_e, input: CreateLinkInput) => linkRepo.create(input))
  ipcMain.handle(IPC.linkUpdate, (_e, id: string, patch: UpdateLinkInput) =>
    linkRepo.update(id, patch)
  )
  ipcMain.handle(IPC.linkTrash, (_e, id: string) => linkRepo.trash(id))
  ipcMain.handle(IPC.linkRestore, (_e, id: string) => linkRepo.restore(id))
  ipcMain.handle(IPC.linkDelete, (_e, id: string) => linkRepo.remove(id))
  ipcMain.handle(IPC.linkToggleFavorite, (_e, id: string) => linkRepo.toggleFavorite(id))

  ipcMain.handle(IPC.tagCreate, (_e, input: CreateTagInput) => tagRepo.create(input))
  ipcMain.handle(IPC.tagUpdate, (_e, id: string, patch: Partial<CreateTagInput>) =>
    tagRepo.update(id, patch)
  )
  ipcMain.handle(IPC.tagDelete, (_e, id: string) => tagRepo.remove(id))

  ipcMain.handle(IPC.relationCreate, (_e, input: CreateRelationInput) =>
    relationRepo.create(input)
  )
  ipcMain.handle(IPC.relationDelete, (_e, id: string) => relationRepo.remove(id))

  ipcMain.handle(IPC.collectionCreate, (_e, name: string) => collectionRepo.create(name))
  ipcMain.handle(IPC.collectionDelete, (_e, id: string) => collectionRepo.remove(id))
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
      return { kind: s.isDirectory() ? 'folder' : 'file', title, exists: true }
    } catch {
      return { kind: 'file', title, exists: false }
    }
  })

  ipcMain.handle(IPC.copyText, (_e, text: string) => clipboard.writeText(text))
}
