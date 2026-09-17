// IPC 채널 이름 + window.api 타입 계약 (preload와 renderer가 공유)

import type {
  Collection,
  CreateLinkInput,
  CreateRelationInput,
  CreateTagInput,
  GraphSnapshot,
  Link,
  LinkCounts,
  OgMeta,
  PathInfo,
  Relation,
  Tag,
  UpdateLinkInput
} from './types'

export const IPC = {
  graphSnapshot: 'graph:snapshot',
  counts: 'counts:get',

  linkCreate: 'links:create',
  linkUpdate: 'links:update',
  linkTrash: 'links:trash',
  linkRestore: 'links:restore',
  linkDelete: 'links:delete',
  linkToggleFavorite: 'links:toggleFavorite',

  tagCreate: 'tags:create',
  tagUpdate: 'tags:update',
  tagDelete: 'tags:delete',

  relationCreate: 'relations:create',
  relationDelete: 'relations:delete',

  collectionCreate: 'collections:create',
  collectionDelete: 'collections:delete',
  collectionMove: 'collections:move',
  collectionAddLink: 'collections:addLink',
  collectionRemoveLink: 'collections:removeLink',

  metaFetch: 'meta:fetch',
  openExternal: 'shell:openExternal',
  openPath: 'shell:openPath',
  pickPaths: 'dialog:pick',
  pathInfo: 'path:info',
  readBinary: 'path:readBinary',
  copyText: 'clipboard:writeText',

  folderList: 'folder:list',
  folderImport: 'folder:import',
  folderSyncPreview: 'folder:syncPreview',
  folderSync: 'folder:sync',
  folderExclusionsGet: 'folder:exclusionsGet',
  folderExclusionsSet: 'folder:exclusionsSet'
} as const

/** path:readBinary 결과 — 실패 시 data는 null, reason에 사유 표시 */
export interface ReadBinaryResult {
  ok: boolean
  data: Uint8Array | null
  reason?: 'not_found' | 'too_large' | 'unsupported' | 'error'
}

/** folder:list 결과 항목 — 파일뿐 아니라 폴더 자체도 포함(트리 렌더링용). depth 1 = 루트 바로 아래 */
export interface FolderEntry {
  relativePath: string
  absolutePath: string
  isDirectory: boolean
  depth: number
}

export interface FolderListResult {
  root: string
  entries: FolderEntry[]
  truncated: boolean
}

export interface FolderImportResult {
  tag: Tag
  created: number
  alreadyLinked: number
}

/** folder:syncPreview 결과 — 아무것도 반영하지 않고 변경분만 계산해 보여준다(New/Deleted 미리보기용) */
export interface FolderSyncPreviewEntry {
  relativePath: string
  absolutePath: string
}
export interface FolderSyncPreviewRemoved {
  linkId: string
  title: string
  url: string
}
export interface FolderSyncPreviewResult {
  tagId: string
  added: FolderSyncPreviewEntry[]
  removed: FolderSyncPreviewRemoved[]
  unchangedCount: number
}

export interface FolderSyncResult {
  tag: Tag
  addedCount: number
  removedCount: number
}

/** preload가 contextBridge로 노출하는 API 표면 */
export interface LinkMapApi {
  getSnapshot(): Promise<GraphSnapshot>
  getCounts(): Promise<LinkCounts>

  createLink(input: CreateLinkInput): Promise<Link>
  updateLink(id: string, patch: UpdateLinkInput): Promise<Link>
  trashLink(id: string): Promise<void>
  restoreLink(id: string): Promise<void>
  deleteLink(id: string): Promise<void>
  toggleFavorite(id: string): Promise<Link>

  createTag(input: CreateTagInput): Promise<Tag>
  updateTag(id: string, patch: Partial<CreateTagInput>): Promise<Tag>
  deleteTag(id: string): Promise<void>

  createRelation(input: CreateRelationInput): Promise<Relation>
  deleteRelation(id: string): Promise<void>

  createCollection(name: string, parentId?: string | null): Promise<Collection>
  deleteCollection(id: string): Promise<void>
  moveCollection(id: string, parentId: string | null): Promise<void>
  addLinkToCollection(collectionId: string, linkId: string): Promise<void>
  removeLinkFromCollection(collectionId: string, linkId: string): Promise<void>

  fetchMeta(url: string): Promise<OgMeta>
  openExternal(url: string): Promise<void>

  // 로컬 파일/폴더
  openPath(path: string): Promise<string>
  pickPaths(mode: 'file' | 'folder'): Promise<string[]>
  pathInfo(path: string): Promise<PathInfo>
  /** 바이너리 파일(PDF/이미지/docx/xlsx 등) 원문을 Uint8Array로 읽기. 확장자 화이트리스트 + 용량 제한 적용 */
  readBinary(path: string): Promise<ReadBinaryResult>
  /** 드롭된 File 객체의 절대 경로 (Electron webUtils, 동기) */
  getPathForFile(file: File): string

  /** 클립보드에 텍스트 복사 */
  copyText(text: string): Promise<void>

  // 폴더 가져오기/동기화
  folderList(rootPath: string): Promise<FolderListResult>
  folderImport(rootPath: string, relativePaths: string[]): Promise<FolderImportResult>
  /** 실제로 반영하지 않고 추가/삭제될 항목만 미리 계산 */
  folderSyncPreview(tagId: string): Promise<FolderSyncPreviewResult>
  folderSync(tagId: string): Promise<FolderSyncResult>
  /** 이 폴더 태그의 동기화 제외 목록(상대경로, 파일 또는 폴더) 조회 */
  folderExclusionsGet(tagId: string): Promise<string[]>
  /** 동기화 제외 목록 전체 교체 */
  folderExclusionsSet(tagId: string, excludedRelativePaths: string[]): Promise<void>
}

declare global {
  interface Window {
    api: LinkMapApi
  }
}
