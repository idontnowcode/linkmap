import { and, eq, isNull, isNotNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { dirname } from 'node:path'
import { getDb, schema } from '../db/client'
import type {
  Collection,
  CreateLinkInput,
  CreateRelationInput,
  CreateTagInput,
  GraphSnapshot,
  Link,
  LinkCounts,
  LinkKind,
  NodeKind,
  Relation,
  RelationType,
  Tag,
  UpdateLinkInput
} from '@shared/types'

const { links, tags, linkTags, relations, collections, collectionLinks } = schema

function deriveDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** web이면 호스트, file/folder이면 상위 디렉터리를 "위치"로 사용 */
function deriveLocation(kind: LinkKind, value: string): string | null {
  return kind === 'web' ? deriveDomain(value) : dirname(value)
}

type LinkRow = typeof links.$inferSelect

function toLink(row: LinkRow): Link {
  return {
    id: row.id,
    kind: row.kind as LinkKind,
    title: row.title,
    url: row.url,
    description: row.description,
    favicon: row.favicon,
    thumbnail: row.thumbnail,
    note: row.note,
    domain: row.domain,
    favorite: row.favorite,
    deletedAt: row.deletedAt ? row.deletedAt.getTime() : null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  }
}

// ── Links ────────────────────────────────────────────────
export const linkRepo = {
  async create(input: CreateLinkInput): Promise<Link> {
    const db = getDb()
    const now = new Date()
    const id = nanoid()
    const kind = input.kind ?? 'web'
    const row = {
      id,
      kind,
      title: input.title,
      url: input.url,
      description: input.description ?? null,
      favicon: input.favicon ?? null,
      thumbnail: input.thumbnail ?? null,
      note: input.note ?? null,
      domain: deriveLocation(kind, input.url),
      favorite: input.favorite ?? false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    }
    await db.insert(links).values(row).run()
    if (input.tagIds?.length) {
      await db
        .insert(linkTags)
        .values(input.tagIds.map((tagId) => ({ linkId: id, tagId })))
        .run()
    }
    return toLink(row as LinkRow)
  },

  async update(id: string, patch: UpdateLinkInput): Promise<Link> {
    const db = getDb()
    const { tagIds, ...fields } = patch
    const data: Partial<typeof links.$inferInsert> = { updatedAt: new Date() }
    if (fields.kind !== undefined) data.kind = fields.kind
    if (fields.title !== undefined) data.title = fields.title
    if (fields.url !== undefined) {
      data.url = fields.url
      data.domain = deriveLocation(fields.kind ?? 'web', fields.url)
    }
    if (fields.description !== undefined) data.description = fields.description
    if (fields.favicon !== undefined) data.favicon = fields.favicon
    if (fields.thumbnail !== undefined) data.thumbnail = fields.thumbnail
    if (fields.note !== undefined) data.note = fields.note
    if (fields.favorite !== undefined) data.favorite = fields.favorite
    await db.update(links).set(data).where(eq(links.id, id)).run()

    if (tagIds) {
      await db.delete(linkTags).where(eq(linkTags.linkId, id)).run()
      if (tagIds.length) {
        await db
          .insert(linkTags)
          .values(tagIds.map((tagId) => ({ linkId: id, tagId })))
          .run()
      }
    }
    const row = await db.select().from(links).where(eq(links.id, id)).get()
    return toLink(row!)
  },

  async trash(id: string): Promise<void> {
    await getDb().update(links).set({ deletedAt: new Date() }).where(eq(links.id, id)).run()
  },

  async restore(id: string): Promise<void> {
    await getDb().update(links).set({ deletedAt: null }).where(eq(links.id, id)).run()
  },

  async remove(id: string): Promise<void> {
    await getDb().delete(links).where(eq(links.id, id)).run()
  },

  async toggleFavorite(id: string): Promise<Link> {
    const db = getDb()
    const row = (await db.select().from(links).where(eq(links.id, id)).get())!
    await db
      .update(links)
      .set({ favorite: !row.favorite, updatedAt: new Date() })
      .where(eq(links.id, id))
      .run()
    return toLink({ ...row, favorite: !row.favorite })
  }
}

// ── Tags ─────────────────────────────────────────────────
export const tagRepo = {
  async create(input: CreateTagInput): Promise<Tag> {
    const db = getDb()
    const tag = { id: nanoid(), name: input.name, color: input.color }
    await db.insert(tags).values(tag).run()
    return tag
  },
  async update(id: string, patch: Partial<CreateTagInput>): Promise<Tag> {
    const db = getDb()
    await db.update(tags).set(patch).where(eq(tags.id, id)).run()
    return (await db.select().from(tags).where(eq(tags.id, id)).get())!
  },
  async remove(id: string): Promise<void> {
    await getDb().delete(tags).where(eq(tags.id, id)).run()
  }
}

// ── Relations ────────────────────────────────────────────
export const relationRepo = {
  async create(input: CreateRelationInput): Promise<Relation> {
    const db = getDb()
    const rel = {
      id: nanoid(),
      sourceId: input.sourceId,
      sourceKind: (input.sourceKind ?? 'link') as NodeKind,
      targetId: input.targetId,
      targetKind: (input.targetKind ?? 'link') as NodeKind,
      type: input.type as RelationType,
      label: input.label ?? null,
      createdAt: new Date()
    }
    await db.insert(relations).values(rel).run()
    return { ...rel, createdAt: rel.createdAt.getTime() }
  },
  async remove(id: string): Promise<void> {
    await getDb().delete(relations).where(eq(relations.id, id)).run()
  }
}

// ── Collections ──────────────────────────────────────────
export const collectionRepo = {
  async create(name: string): Promise<Collection> {
    const db = getDb()
    const col = { id: nanoid(), name, createdAt: new Date() }
    await db.insert(collections).values(col).run()
    return { ...col, createdAt: col.createdAt.getTime() }
  },
  async remove(id: string): Promise<void> {
    await getDb().delete(collections).where(eq(collections.id, id)).run()
  },
  async addLink(collectionId: string, linkId: string): Promise<void> {
    await getDb()
      .insert(collectionLinks)
      .values({ collectionId, linkId })
      .onConflictDoNothing()
      .run()
  },
  async removeLink(collectionId: string, linkId: string): Promise<void> {
    await getDb()
      .delete(collectionLinks)
      .where(
        and(
          eq(collectionLinks.collectionId, collectionId),
          eq(collectionLinks.linkId, linkId)
        )
      )
      .run()
  }
}

// ── Aggregates ───────────────────────────────────────────
export const graphRepo = {
  async snapshot(): Promise<GraphSnapshot> {
    // 모든 링크(휴지통 포함)를 반환하고, 휴지통 필터는 렌더러가 view별로 처리한다.
    const db = getDb()
    const linkRows = await db.select().from(links).all()
    const tagRows = await db.select().from(tags).all()
    const colRows = await db.select().from(collections).all()
    const relRows = await db.select().from(relations).all()
    const ltRows = await db.select().from(linkTags).all()
    const clRows = await db.select().from(collectionLinks).all()

    const tagsByLink = new Map<string, string[]>()
    for (const lt of ltRows) {
      const arr = tagsByLink.get(lt.linkId) ?? []
      arr.push(lt.tagId)
      tagsByLink.set(lt.linkId, arr)
    }

    return {
      links: linkRows.map((r) => ({ ...toLink(r), tagIds: tagsByLink.get(r.id) ?? [] })),
      tags: tagRows,
      collections: colRows.map((c) => ({ ...c, createdAt: c.createdAt.getTime() })),
      relations: relRows.map((r) => ({
        ...r,
        sourceKind: r.sourceKind as NodeKind,
        targetKind: r.targetKind as NodeKind,
        type: r.type as RelationType,
        createdAt: r.createdAt.getTime()
      })),
      linkTags: ltRows.map((lt) => ({ linkId: lt.linkId, tagId: lt.tagId })),
      collectionLinks: clRows.map((cl) => ({ collectionId: cl.collectionId, linkId: cl.linkId }))
    }
  },

  async counts(): Promise<LinkCounts> {
    const db = getDb()
    const RECENT_DAYS = 7
    const since = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000

    const active = await db.select().from(links).where(isNull(links.deletedAt)).all()
    const trashRows = await db.select().from(links).where(isNotNull(links.deletedAt)).all()
    const ltRows = await db.select().from(linkTags).all()
    const clRows = await db.select().from(collectionLinks).all()
    const activeIds = new Set(active.map((l) => l.id))

    const byTag: Record<string, number> = {}
    for (const lt of ltRows) {
      if (activeIds.has(lt.linkId)) byTag[lt.tagId] = (byTag[lt.tagId] ?? 0) + 1
    }
    const byCollection: Record<string, number> = {}
    for (const cl of clRows) {
      if (activeIds.has(cl.linkId)) byCollection[cl.collectionId] = (byCollection[cl.collectionId] ?? 0) + 1
    }

    return {
      all: active.length,
      favorites: active.filter((l) => l.favorite).length,
      recent: active.filter((l) => l.createdAt.getTime() >= since).length,
      trash: trashRows.length,
      byTag,
      byCollection
    }
  }
}
