// 도메인 타입 — main/renderer 공유. 직렬화 경계를 넘으므로 Date 대신 number(epoch ms) 사용.

export type NodeKind = 'link' | 'tag' | 'collection'

/** 링크 대상 종류: 웹 URL / 로컬 파일 / 로컬 폴더 */
export type LinkKind = 'web' | 'file' | 'folder'

export type RelationType =
  | 'related'
  | 'reference'
  | 'uses'
  | 'part_of'
  | 'supports'
  | 'custom'

// 사용자가 선택 가능한 관계 타입(단순화). 'reference'/'supports'는 레거시 데이터 렌더용으로만 유지.
export const RELATION_TYPES: RelationType[] = ['related', 'uses', 'part_of', 'custom']

export interface Link {
  id: string
  kind: LinkKind
  title: string
  /** web: URL · file/folder: 로컬 절대 경로 */
  url: string
  description: string | null
  favicon: string | null
  thumbnail: string | null
  note: string | null
  /** 전문검색용 본문 텍스트 (수집 시 추출, 잘린 형태) */
  content: string | null
  domain: string | null
  favorite: boolean
  deletedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Relation {
  id: string
  sourceId: string
  sourceKind: NodeKind
  targetId: string
  targetKind: NodeKind
  type: RelationType
  label: string | null
  createdAt: number
}

export interface Collection {
  id: string
  name: string
  createdAt: number
}

/** 그래프 노드별 부가 데이터 포함 응답 */
export interface LinkWithTags extends Link {
  tagIds: string[]
}

export interface GraphSnapshot {
  links: LinkWithTags[]
  tags: Tag[]
  collections: Collection[]
  relations: Relation[]
  linkTags: { linkId: string; tagId: string }[]
  collectionLinks: { collectionId: string; linkId: string }[]
}

export interface LinkCounts {
  all: number
  favorites: number
  recent: number
  trash: number
  byTag: Record<string, number>
  byCollection: Record<string, number>
}

// ── 요청 페이로드 ──────────────────────────────────────────
export interface CreateLinkInput {
  kind?: LinkKind
  title: string
  url: string
  description?: string | null
  content?: string | null
  favicon?: string | null
  thumbnail?: string | null
  note?: string | null
  favorite?: boolean
  tagIds?: string[]
}

export type UpdateLinkInput = Partial<
  Omit<Link, 'id' | 'createdAt' | 'updatedAt'>
> & { tagIds?: string[] }

export interface CreateTagInput {
  name: string
  color: string
}

export interface CreateRelationInput {
  sourceId: string
  sourceKind?: NodeKind
  targetId: string
  targetKind?: NodeKind
  type: RelationType
  label?: string | null
}

export interface OgMeta {
  title: string | null
  description: string | null
  favicon: string | null
  thumbnail: string | null
  domain: string | null
  content: string | null
}

/** 로컬 경로 분류 결과 (main의 fs.stat 기반) */
export interface PathInfo {
  kind: 'file' | 'folder'
  title: string
  exists: boolean
  /** 텍스트/코드 파일이면 본문(전문검색용), 아니면 null */
  content: string | null
}
