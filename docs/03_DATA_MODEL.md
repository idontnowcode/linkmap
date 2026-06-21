# 03 — Data Model

> SQLite + Drizzle ORM. 로컬 우선. 모든 id는 `nanoid` 문자열, 시간은 epoch millis(INTEGER) 저장 → 앱에서 `Date` 변환.

## 1. 엔티티 개요
```
Link ─┬─< LinkTag >─┬─ Tag
      │              
      ├─< Relation >── Link   (self-referential, source→target)
      │
      └─< CollectionLink >─── Collection
```

## 2. 타입 정의 (도메인)

```ts
interface Link {
  id: string
  title: string
  url: string
  description?: string
  favicon?: string
  thumbnail?: string
  note?: string            // Markdown
  domain?: string          // 파생: new URL(url).hostname
  favorite: boolean
  deletedAt?: Date | null  // soft delete (휴지통)
  createdAt: Date
  updatedAt: Date
}

interface Tag {
  id: string
  name: string
  color: string            // hex, 예: "#3B82F6"
}

interface LinkTag {        // N:M
  linkId: string
  tagId: string
}

type RelationType =
  | 'related' | 'reference' | 'uses'
  | 'part_of' | 'supports' | 'custom'

interface Relation {
  id: string
  sourceId: string         // Link.id (또는 Tag/Collection node id)
  targetId: string
  type: RelationType
  label?: string           // 엣지 표시 라벨 (예: "provides")
  createdAt: Date
}

interface Collection {
  id: string
  name: string
  createdAt: Date
}

interface CollectionLink {
  collectionId: string
  linkId: string
}
```

> **노드 통합 모델 주의**: 그래프 노드는 Link / Tag / Collection 세 종류다. `Relation.sourceId/targetId`는 어떤 노드 종류든 가리킬 수 있으므로, 앱 레벨에서 `nodeKind`(`'link'|'tag'|'collection'`)를 함께 저장·해석한다. v1 단순화안: Relation에 `sourceKind`/`targetKind` 컬럼 추가(아래 스키마 반영).

## 3. Drizzle 스키마 (SQLite)

```ts
// db/schema.ts
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  favicon: text('favicon'),
  thumbnail: text('thumbnail'),
  note: text('note'),
  domain: text('domain'),
  favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3B82F6'),
})

export const linkTags = sqliteTable('link_tags', {
  linkId: text('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.linkId, t.tagId] }) }))

export const relations = sqliteTable('relations', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull(),
  sourceKind: text('source_kind').notNull().default('link'), // 'link'|'tag'|'collection'
  targetId: text('target_id').notNull(),
  targetKind: text('target_kind').notNull().default('link'),
  type: text('type').notNull().default('related'),
  label: text('label'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const collectionLinks = sqliteTable('collection_links', {
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  linkId: text('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.collectionId, t.linkId] }) }))
```

## 4. 인덱스 / 제약
- `links.url` — 유니크는 강제하지 않음(같은 URL 다른 맥락 허용). 대신 추가 시 중복 경고.
- 인덱스: `links.deletedAt`, `links.favorite`, `relations.sourceId`, `relations.targetId`, `linkTags.tagId`.
- 카운트(태그별 N, 즐겨찾기 N)는 쿼리로 파생(저장 안 함).

## 5. 그래프 직렬화 (React Flow 변환)
- `nodes`: links/tags/collections → `{ id, type: 'linkNode'|'tagNode'|'collectionNode', data, position }`
- `edges`: relations → `{ id, source, target, type: 'relationEdge', data: { relationType, label } }`
- position은 별도 `node_positions` 테이블 또는 force 레이아웃 계산값 캐시(v1: 메모리 + 마지막 위치 localStorage 캐시).

## 6. IPC 데이터 경계
- 모든 DB 접근은 **메인 프로세스**(Electron main)에서만. 렌더러는 `window.api.*` (preload, contextBridge)로 호출.
- 채널 예: `links:list`, `links:create`, `links:update`, `links:trash`, `tags:*`, `relations:*`, `meta:fetch`.
