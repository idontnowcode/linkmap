// 폴더 가져오기(P3) + 폴더 동기화(P4) — 컬렉션(트리)을 대체하지 않고 "폴더를 태그로 추적"하는
// 신규 기능만 추가한다. 신규 버전(Linkmap)의 server/linkmap/folderImport.js 로직을 참고해
// 기존 아키텍처의 async repository 패턴(libsql/Drizzle)으로 재작성.
import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { basename, extname, join, relative } from 'node:path'
import type {
  FolderEntry,
  FolderImportResult,
  FolderListResult,
  FolderSyncPreviewResult,
  FolderSyncResult
} from '@shared/ipc'
import { TAG_PALETTE, type Tag } from '@shared/types'
import { isPathExcluded } from '@shared/pathExclusion'
import { folderExclusionRepo, linkRepo, linkTagRepo, tagRepo } from '../repositories'
import { readTextFileContent } from './fileContent'

// 흔히 수천~수만 개 파일을 갖는 폴더(node_modules, .git 등)를 실수로 고르는 경우를 대비한
// 안전장치 — 넘으면 결과를 잘라내고 truncated:true를 돌려준다.
const MAX_ENTRIES = 3000
const SKIP_DIR_NAMES = new Set(['.git', 'node_modules', '.svn', '.hg', '__pycache__'])

// 폴더 자체도 항목으로 넣는다(트리 UI가 파일 경로 문자열만으로는 빈 폴더·펼침 상태를 표현할
// 수 없어서) — depth는 루트 바로 아래가 1.
async function walk(
  rootPath: string,
  dir: string,
  depth: number,
  entries: FolderEntry[]
): Promise<void> {
  let items: Dirent[]
  try {
    items = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const item of items) {
    if (entries.length >= MAX_ENTRIES) return
    const absolutePath = join(dir, item.name)
    if (item.isDirectory()) {
      if (item.name.startsWith('.') || SKIP_DIR_NAMES.has(item.name)) continue
      entries.push({ relativePath: relative(rootPath, absolutePath), absolutePath, isDirectory: true, depth })
      await walk(rootPath, absolutePath, depth + 1, entries)
    } else if (item.isFile()) {
      entries.push({ relativePath: relative(rootPath, absolutePath), absolutePath, isDirectory: false, depth })
    }
  }
}

/** rootPath 아래 모든 파일·폴더를 재귀 나열. 점폴더/흔한 대용량 폴더는 건너뜀. */
export async function listFolderTree(rootPath: string): Promise<FolderListResult> {
  if (!rootPath) throw new Error('invalid_input: path_required')
  const entries: FolderEntry[] = []
  await walk(rootPath, rootPath, 1, entries)
  return {
    root: rootPath,
    entries: entries.slice(0, MAX_ENTRIES),
    truncated: entries.length > MAX_ENTRIES
  }
}

/** 한 폴더 레벨(root 자신 포함)의 태그를 찾거나 만든다. cache로 같은 배치 내 중복 조회/생성을 막는다. */
async function ensureFolderTagLevel(
  absolutePath: string,
  name: string,
  cache: Map<string, Tag>
): Promise<Tag> {
  const cached = cache.get(absolutePath)
  if (cached) return cached
  const existing = await tagRepo.findBySourcePath(absolutePath)
  if (existing) {
    cache.set(absolutePath, existing)
    return existing
  }
  // 고정 파랑이면 폴더 태그를 여러 개 만들수록 전부 같은 색이 된다("너무 파랑파랑해",
  // 2026-09-17) — 기존 태그 개수만큼 팔레트를 돌려 수동 생성 태그(TagFormDialog)와
  // 같은 방식으로 다양하게 배정한다.
  const count = await tagRepo.count()
  const tag = await tagRepo.create({
    name,
    color: TAG_PALETTE[count % TAG_PALETTE.length],
    sourcePath: absolutePath
  })
  cache.set(absolutePath, tag)
  return tag
}

/**
 * 파일 하나의 조상 폴더 전부(루트 포함)에 대응하는 태그 체인을 반환(루트가 chain[0]).
 * 이름은 "부모태그이름/폴더명"으로 이어붙여 tagTree.ts가 그대로 계층으로 파싱하게 한다.
 * relativeDirSegments가 빈 배열이면 루트 바로 아래 파일이라 chain은 루트 태그 하나뿐이다.
 * 모든 레벨에 sourcePath를 부여해 하위 폴더 태그도 각자 독립적으로 동기화될 수 있게 한다.
 */
async function ensureFolderTagChain(
  rootPath: string,
  relativeDirSegments: string[],
  cache: Map<string, Tag>
): Promise<Tag[]> {
  const rootTag = await ensureFolderTagLevel(rootPath, basename(rootPath) || rootPath, cache)
  const chain: Tag[] = [rootTag]
  let cumulativeRelative = ''
  let parentTag = rootTag
  for (const segment of relativeDirSegments) {
    cumulativeRelative = cumulativeRelative ? `${cumulativeRelative}/${segment}` : segment
    const absolutePath = join(rootPath, cumulativeRelative)
    const tag = await ensureFolderTagLevel(absolutePath, `${parentTag.name}/${segment}`, cache)
    chain.push(tag)
    parentTag = tag
  }
  return chain
}

/**
 * 대량 파일을 가져올 때 전문검색용 본문(텍스트/코드 + pdf/docx/xlsx)을 즉시 다 추출하면
 * 느려질 수 있어(pdf 파싱은 특히) IPC 응답 이후 백그라운드에서 순차적으로 채운다 —
 * UI를 블로킹하지 않고, 각 파일 처리 직후 바로 linkRepo.update로 반영한다.
 */
async function backfillContentInBackground(items: { id: string; absolutePath: string }[]): Promise<void> {
  for (const { id, absolutePath } of items) {
    try {
      const content = await readTextFileContent(absolutePath)
      if (content) await linkRepo.update(id, { content })
    } catch {
      /* best-effort — 실패한 파일은 건너뛰고 계속 진행 */
    }
  }
}

/** 확장자별 보조 태그(P4) — 폴더 계층 태그와 달리 sourcePath 없는 일반 태그라 "태그"
 * 섹션에 뜨고, 같은 이름의 기존 태그가 있으면(수동 생성분 포함) 그대로 재사용한다. */
async function ensureExtTag(ext: string, cache: Map<string, Tag>): Promise<Tag | null> {
  if (!ext) return null
  const cached = cache.get(ext)
  if (cached) return cached
  const existing = await tagRepo.findByName(ext)
  if (existing) {
    cache.set(ext, existing)
    return existing
  }
  const count = await tagRepo.count()
  const tag = await tagRepo.create({ name: ext, color: TAG_PALETTE[count % TAG_PALETTE.length], sourcePath: null })
  cache.set(ext, tag)
  return tag
}

/** relativePath(파일)의 디렉터리 부분을 "/"·"\\" 무관하게 세그먼트 배열로 쪼갠다. */
function dirSegmentsOf(relativeFilePath: string): string[] {
  const segments = relativeFilePath.split(/[\\/]/).filter(Boolean)
  segments.pop() // 파일명 제거 — 남는 건 조상 폴더 세그먼트들
  return segments
}

/** 선택된 상대경로들을 일괄로 링크 생성 + 조상 폴더 전체의 계층 태그 부착. 이미 활성 링크가 있으면 재사용. */
export async function importFolderFiles(
  rootPath: string,
  selectedRelativePaths: string[],
  extTags = false
): Promise<FolderImportResult> {
  if (!rootPath) throw new Error('invalid_input: root_path_required')
  if (!selectedRelativePaths?.length) throw new Error('invalid_input: paths_required')

  const cache = new Map<string, Tag>()
  const extCache = new Map<string, Tag>()
  let created = 0
  let alreadyLinked = 0
  let rootTag: Tag | null = null
  const newlyCreated: { id: string; absolutePath: string }[] = []

  for (const relativePath of selectedRelativePaths) {
    const absolutePath = join(rootPath, relativePath)
    const chain = await ensureFolderTagChain(rootPath, dirSegmentsOf(relativePath), cache)
    if (!rootTag) rootTag = chain[0]
    const existing = await linkRepo.findActiveByUrl(absolutePath)
    const link = existing ?? (await linkRepo.create({ kind: 'file', title: basename(absolutePath), url: absolutePath }))
    if (existing) alreadyLinked++
    else {
      created++
      newlyCreated.push({ id: link.id, absolutePath })
    }
    for (const tag of chain) await linkTagRepo.add(link.id, tag.id)
    if (extTags) {
      const ext = extname(absolutePath).toLowerCase().replace(/^\./, '')
      const extTag = await ensureExtTag(ext, extCache)
      if (extTag) await linkTagRepo.add(link.id, extTag.id)
    }
  }
  if (newlyCreated.length) void backfillContentInBackground(newlyCreated)
  return { tag: rootTag!, created, alreadyLinked }
}

/** 폴더 재스캔 결과와 현재 추적 중인 링크를 비교만 하고, 아무것도 반영하지 않는다(New/Deleted 미리보기용). */
export async function previewFolderSync(tagId: string): Promise<FolderSyncPreviewResult> {
  const tag = await tagRepo.get(tagId)
  if (!tag) throw new Error('invalid_input: unknown_tag')
  if (!tag.sourcePath) throw new Error('invalid_input: not_a_folder_tag')

  const { entries } = await listFolderTree(tag.sourcePath)
  const excluded = new Set(await folderExclusionRepo.listForTag(tagId))
  const files = entries.filter((e) => !e.isDirectory && !isPathExcluded(e.relativePath, excluded))
  const currentPaths = new Set(files.map((e) => e.absolutePath))

  const taggedLinkIds = await linkTagRepo.linkIdsForTag(tagId)
  const trackedLinks = await linkRepo.listActiveByIds(taggedLinkIds)
  const trackedPaths = new Set(trackedLinks.map((l) => l.url))

  // 제외 설정으로 새로 빠진, 기존에 추적 중이던 파일도 "삭제됨"과 동일하게 취급된다
  // (currentPaths에서 빠지므로) — 별도 UI 없이 기존 미리보기 흐름을 그대로 재사용.
  const added = files.filter((e) => !trackedPaths.has(e.absolutePath))
  const removed = trackedLinks
    .filter((l) => !currentPaths.has(l.url))
    .map((l) => ({ linkId: l.id, title: l.title, url: l.url }))
  const unchangedCount = trackedLinks.length - removed.length

  return { tagId, added, removed, unchangedCount }
}

/** 이미 가져온 폴더(태그)를 재스캔 — 추가된 파일은 링크 생성, 삭제된 파일은 링크를 휴지통으로. */
export async function syncFolderTag(tagId: string): Promise<FolderSyncResult> {
  const tag = await tagRepo.get(tagId)
  if (!tag) throw new Error('invalid_input: unknown_tag')
  if (!tag.sourcePath) throw new Error('invalid_input: not_a_folder_tag')

  const { entries } = await listFolderTree(tag.sourcePath)
  const excluded = new Set(await folderExclusionRepo.listForTag(tagId))
  const files = entries.filter((e) => !e.isDirectory && !isPathExcluded(e.relativePath, excluded))
  const currentPaths = new Set(files.map((e) => e.absolutePath))

  const taggedLinkIds = await linkTagRepo.linkIdsForTag(tagId)
  const trackedLinks = await linkRepo.listActiveByIds(taggedLinkIds)
  const trackedPaths = new Set(trackedLinks.map((l) => l.url))

  // 이 태그(루트 또는 하위 폴더 태그)의 폴더를 "로컬 루트" 삼아 계층 체인을 재구성한다 —
  // 캐시에 자기 자신을 미리 심어 ensureFolderTagChain이 새로 만들지 않고 그대로 재사용하게 한다.
  const cache = new Map<string, Tag>([[tag.sourcePath, tag]])
  let addedCount = 0
  const newlyCreated: { id: string; absolutePath: string }[] = []
  for (const entry of files) {
    if (trackedPaths.has(entry.absolutePath)) continue
    const existing = await linkRepo.findActiveByUrl(entry.absolutePath)
    const link =
      existing ?? (await linkRepo.create({ kind: 'file', title: basename(entry.absolutePath), url: entry.absolutePath }))
    const chain = await ensureFolderTagChain(tag.sourcePath, dirSegmentsOf(entry.relativePath), cache)
    for (const t of chain) await linkTagRepo.add(link.id, t.id)
    if (!existing) {
      addedCount++
      newlyCreated.push({ id: link.id, absolutePath: entry.absolutePath })
    }
  }
  if (newlyCreated.length) void backfillContentInBackground(newlyCreated)

  let removedCount = 0
  for (const link of trackedLinks) {
    if (!currentPaths.has(link.url)) {
      await linkRepo.trash(link.id)
      removedCount++
    }
  }

  return { tag, addedCount, removedCount }
}
