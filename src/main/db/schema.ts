import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core'

export const links = sqliteTable(
  'links',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull().default('web'),
    title: text('title').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    favicon: text('favicon'),
    thumbnail: text('thumbnail'),
    note: text('note'),
    content: text('content'),
    domain: text('domain'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    /** kind='file' 링크를 저장한 시점의 원본 파일 mtime — 외부에서 파일이 바뀌었는지 감지용 */
    fileMtime: integer('file_mtime', { mode: 'timestamp_ms' })
  },
  (t) => ({
    deletedIdx: index('links_deleted_idx').on(t.deletedAt),
    favoriteIdx: index('links_favorite_idx').on(t.favorite)
  })
)

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3B82F6'),
  /** 폴더 가져오기(P3)로 생성된 태그의 원본 폴더 절대경로. 수동 생성 태그는 null. */
  sourcePath: text('source_path')
})

export const linkTags = sqliteTable(
  'link_tags',
  {
    linkId: text('link_id')
      .notNull()
      .references(() => links.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' })
  },
  (t) => ({
    pk: primaryKey({ columns: [t.linkId, t.tagId] }),
    tagIdx: index('link_tags_tag_idx').on(t.tagId)
  })
)

export const relations = sqliteTable(
  'relations',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id').notNull(),
    sourceKind: text('source_kind').notNull().default('link'),
    targetId: text('target_id').notNull(),
    targetKind: text('target_kind').notNull().default('link'),
    type: text('type').notNull().default('related'),
    label: text('label'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => ({
    sourceIdx: index('relations_source_idx').on(t.sourceId),
    targetIdx: index('relations_target_idx').on(t.targetId)
  })
)

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
})

export const collectionLinks = sqliteTable(
  'collection_links',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    linkId: text('link_id')
      .notNull()
      .references(() => links.id, { onDelete: 'cascade' })
  },
  (t) => ({ pk: primaryKey({ columns: [t.collectionId, t.linkId] }) })
)

/** 폴더 동기화(6.13절) 제외 범위 — tagId(폴더 태그)별로 제외된 상대경로(파일 또는 폴더) 목록.
 * 폴더 경로가 등록되면 gitignore 스타일로 그 조상 경로에 해당하는 파일도 전부 제외 취급한다. */
export const folderSyncExclusions = sqliteTable(
  'folder_sync_exclusions',
  {
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    relativePath: text('relative_path').notNull()
  },
  (t) => ({ pk: primaryKey({ columns: [t.tagId, t.relativePath] }) })
)

// 런타임 테이블 생성용 DDL (마이그레이션 없이 첫 실행 시 보장)
export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'web',
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    favicon TEXT,
    thumbnail TEXT,
    note TEXT,
    content TEXT,
    domain TEXT,
    favorite INTEGER NOT NULL DEFAULT 0,
    deleted_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    file_mtime INTEGER
  );
  CREATE INDEX IF NOT EXISTS links_deleted_idx ON links(deleted_at);
  CREATE INDEX IF NOT EXISTS links_favorite_idx ON links(favorite);

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    source_path TEXT
  );

  CREATE TABLE IF NOT EXISTS link_tags (
    link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (link_id, tag_id)
  );
  CREATE INDEX IF NOT EXISTS link_tags_tag_idx ON link_tags(tag_id);

  CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_kind TEXT NOT NULL DEFAULT 'link',
    target_id TEXT NOT NULL,
    target_kind TEXT NOT NULL DEFAULT 'link',
    type TEXT NOT NULL DEFAULT 'related',
    label TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS relations_source_idx ON relations(source_id);
  CREATE INDEX IF NOT EXISTS relations_target_idx ON relations(target_id);

  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS collection_links (
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    PRIMARY KEY (collection_id, link_id)
  );

  CREATE TABLE IF NOT EXISTS folder_sync_exclusions (
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    relative_path TEXT NOT NULL,
    PRIMARY KEY (tag_id, relative_path)
  );
`

// 기존 DB 업그레이드용 idempotent 마이그레이션 (각각 try/catch로 적용)
export const MIGRATIONS: string[] = [
  `ALTER TABLE links ADD COLUMN kind TEXT NOT NULL DEFAULT 'web'`,
  `ALTER TABLE links ADD COLUMN content TEXT`,
  `ALTER TABLE collections ADD COLUMN parent_id TEXT REFERENCES collections(id) ON DELETE CASCADE`,
  `ALTER TABLE tags ADD COLUMN source_path TEXT`,
  `ALTER TABLE links ADD COLUMN file_mtime INTEGER`
]
