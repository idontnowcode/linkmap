// 도메인 타입 — main/renderer 공유. 직렬화 경계를 넘으므로 Date 대신 number(epoch ms) 사용.

export type NodeKind = 'link' | 'tag' | 'collection'

/** 링크 대상 종류: 웹 URL / 로컬 파일 / 로컬 폴더 / 단순 메모(URL 없음) */
export type LinkKind = 'web' | 'file' | 'folder' | 'note'

export type RelationType =
  | 'related'
  | 'reference'
  | 'uses'
  | 'part_of'
  | 'supports'
  | 'custom'

// 사용자가 선택 가능한 관계 타입(단순화). 'reference'/'supports'는 레거시 데이터 렌더용으로만 유지.
export const RELATION_TYPES: RelationType[] = ['related', 'uses', 'part_of', 'custom']

// 태그 색상 팔레트 — main(폴더 가져오기 자동 태그)과 renderer(TagFormDialog)가 함께 쓴다.
// 새 태그가 항상 팔레트 첫 색(파랑)으로 만들어지던 버그(2026-09-17, "너무 파랑파랑해")로
// 색이 다양해지려면 두 생성 경로 모두 이 배열을 기존 태그 개수만큼 회전시켜야 한다.
export const TAG_PALETTE = [
  '#3B82F6',
  '#22C55E',
  '#F97316',
  '#A855F7',
  '#EAB308',
  '#14B8A6',
  '#EF4444',
  '#0EA5E9'
]

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
  /** kind='file' 링크를 저장한 시점의 원본 파일 mtime(epoch ms) — 없으면(웹/메모 등) null */
  fileMtime: number | null
  /** 실제로 열었던(openTarget) 마지막 시각(epoch ms) — 한 번도 안 열었으면 null */
  openedAt: number | null
  /** kind='web' 링크의 마지막 깨진 링크 검사 시각(epoch ms) — 검사한 적 없으면 null */
  linkCheckedAt: number | null
  /** 마지막 검사에서 응답하지 않았으면 true. 검사 전에는 항상 false */
  linkBroken: boolean
}

export interface Tag {
  id: string
  name: string
  color: string
  /** 폴더 가져오기(P3)로 생성된 태그의 원본 폴더 절대경로. 수동 생성 태그는 null. */
  sourcePath: string | null
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
  /** 상위 컬렉션 id (없으면 최상위) — 폴더 안 폴더 */
  parentId: string | null
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
  /** 최근 7일 이내 openTarget으로 열어본 활성 링크 수 — "최근 연 링크" 스마트뷰 카운트 */
  openedRecent: number
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
  sourcePath?: string | null
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
