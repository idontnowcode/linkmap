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
  collectionAddLink: 'collections:addLink',
  collectionRemoveLink: 'collections:removeLink',

  metaFetch: 'meta:fetch',
  openExternal: 'shell:openExternal',
  openPath: 'shell:openPath',
  pickPaths: 'dialog:pick',
  pathInfo: 'path:info',
  copyText: 'clipboard:writeText'
} as const

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
  addLinkToCollection(collectionId: string, linkId: string): Promise<void>
  removeLinkFromCollection(collectionId: string, linkId: string): Promise<void>

  fetchMeta(url: string): Promise<OgMeta>
  openExternal(url: string): Promise<void>

  // 로컬 파일/폴더
  openPath(path: string): Promise<string>
  pickPaths(mode: 'file' | 'folder'): Promise<string[]>
  pathInfo(path: string): Promise<PathInfo>
  /** 드롭된 File 객체의 절대 경로 (Electron webUtils, 동기) */
  getPathForFile(file: File): string

  /** 클립보드에 텍스트 복사 */
  copyText(text: string): Promise<void>
}

declare global {
  interface Window {
    api: LinkMapApi
  }
}
