// 폴더 가져오기(P3) + 폴더 동기화(P4) — 컬렉션(트리)을 대체하지 않고 "폴더를 태그로 추적"하는
// 신규 기능만 추가한다. 신규 버전(Linkmap)의 server/linkmap/folderImport.js 로직을 참고해
// 기존 아키텍처의 async repository 패턴(libsql/Drizzle)으로 재작성.
import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { basename, join, relative } from 'node:path'
import type { FolderEntry, FolderImportResult, FolderListResult, FolderSyncResult } from '@shared/ipc'
import { linkRepo, linkTagRepo, tagRepo } from '../repositories'

// 흔히 수천~수만 개 파일을 갖는 폴더(node_modules, .git 등)를 실수로 고르는 경우를 대비한
// 안전장치 — 넘으면 결과를 잘라내고 truncated:true를 돌려준다.
const MAX_ENTRIES = 3000
const SKIP_DIR_NAMES = new Set(['.git', 'node_modules', '.svn', '.hg', '__pycache__'])

async function walk(rootPath: string, dir: string, entries: FolderEntry[]): Promise<void> {
  let items: Dirent[]
  try {
    items = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const item of items) {
    if (entries.length >= MAX_ENTRIES) return
    if (item.isDirectory()) {
      if (item.name.startsWith('.') || SKIP_DIR_NAMES.has(item.name)) continue
      await walk(rootPath, join(dir, item.name), entries)
    } else if (item.isFile()) {
      const absolutePath = join(dir, item.name)
      entries.push({ relativePath: relative(rootPath, absolutePath), absolutePath })
    }
  }
}

/** rootPath 아래 모든 파일을 재귀 나열(디렉터리 자체는 제외). 점폴더/흔한 대용량 폴더는 건너뜀. */
export async function listFolderTree(rootPath: string): Promise<FolderListResult> {
  if (!rootPath) throw new Error('invalid_input: path_required')
  const entries: FolderEntry[] = []
  await walk(rootPath, rootPath, entries)
  return {
    root: rootPath,
    entries: entries.slice(0, MAX_ENTRIES),
    truncated: entries.length > MAX_ENTRIES
  }
}

async function ensureFolderTag(rootPath: string) {
  const existing = await tagRepo.findBySourcePath(rootPath)
  if (existing) return existing
  return tagRepo.create({
    name: basename(rootPath) || rootPath,
    color: '#3B82F6',
    sourcePath: rootPath
  })
}

/** 선택된 상대경로들을 일괄로 링크 생성 + 폴더명 태그 부착. 이미 활성 링크가 있으면 재사용. */
export async function importFolderFiles(
  rootPath: string,
  selectedRelativePaths: string[]
): Promise<FolderImportResult> {
  if (!rootPath) throw new Error('invalid_input: root_path_required')
  if (!selectedRelativePaths?.length) throw new Error('invalid_input: paths_required')

  const tag = await ensureFolderTag(rootPath)
  let created = 0
  let alreadyLinked = 0
  for (const relativePath of selectedRelativePaths) {
    const absolutePath = join(rootPath, relativePath)
    const existing = await linkRepo.findActiveByUrl(absolutePath)
    const link = existing ?? (await linkRepo.create({ kind: 'file', title: basename(absolutePath), url: absolutePath }))
    if (existing) alreadyLinked++
    else created++
    await linkTagRepo.add(link.id, tag.id)
  }
  return { tag, created, alreadyLinked }
}

/** 이미 가져온 폴더(태그)를 재스캔 — 추가된 파일은 링크 생성, 삭제된 파일은 링크를 휴지통으로. */
export async function syncFolderTag(tagId: string): Promise<FolderSyncResult> {
  const tag = await tagRepo.get(tagId)
  if (!tag) throw new Error('invalid_input: unknown_tag')
  if (!tag.sourcePath) throw new Error('invalid_input: not_a_folder_tag')

  const { entries } = await listFolderTree(tag.sourcePath)
  const currentPaths = new Set(entries.map((e) => e.absolutePath))

  const taggedLinkIds = await linkTagRepo.linkIdsForTag(tagId)
  const trackedLinks = await linkRepo.listActiveByIds(taggedLinkIds)
  const trackedPaths = new Set(trackedLinks.map((l) => l.url))

  let addedCount = 0
  for (const entry of entries) {
    if (trackedPaths.has(entry.absolutePath)) continue
    const existing = await linkRepo.findActiveByUrl(entry.absolutePath)
    const link =
      existing ?? (await linkRepo.create({ kind: 'file', title: basename(entry.absolutePath), url: entry.absolutePath }))
    await linkTagRepo.add(link.id, tagId)
    if (!existing) addedCount++
  }

  let removedCount = 0
  for (const link of trackedLinks) {
    if (!currentPaths.has(link.url)) {
      await linkRepo.trash(link.id)
      removedCount++
    }
  }

  return { tag, addedCount, removedCount }
}
