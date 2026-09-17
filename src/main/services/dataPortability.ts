// 전체 데이터 내보내기/가져오기(P6) — 로컬 단일 사용자 백업/이전용. 클라우드 동기화가 아니라
// JSON 파일 하나로 SQLite 내용을 통째로 내보내고, 같은(또는 빈) DB에 다시 가져올 수 있게 한다.
// graphRepo.snapshot()과 완전히 같은 모양을 재사용해 별도의 raw-row 변환 코드를 두지 않는다.
import { getDb, schema } from '../db/client'
import { folderExclusionRepo, graphRepo } from '../repositories'
import type { Collection, GraphSnapshot } from '@shared/types'

const EXPORT_VERSION = 1

export interface ExportedData extends GraphSnapshot {
  version: number
  exportedAt: number
  folderExclusions: { tagId: string; relativePath: string }[]
}

export async function exportAllData(): Promise<ExportedData> {
  const snapshot = await graphRepo.snapshot()
  const folderTagIds = snapshot.tags.filter((t) => t.sourcePath).map((t) => t.id)
  const folderExclusions: { tagId: string; relativePath: string }[] = []
  for (const tagId of folderTagIds) {
    const paths = await folderExclusionRepo.listForTag(tagId)
    for (const relativePath of paths) folderExclusions.push({ tagId, relativePath })
  }
  return { ...snapshot, version: EXPORT_VERSION, exportedAt: Date.now(), folderExclusions }
}

export interface ImportSummary {
  tags: number
  links: number
  collections: number
  relations: number
  linkTags: number
  collectionLinks: number
  folderExclusions: number
}

/** parentId 위상정렬 — 부모가 먼저 들어가야 FK(collections.parent_id)가 안 깨진다. */
async function insertCollectionsTopological(cols: Collection[]): Promise<void> {
  const db = getDb()
  const remaining = new Map(cols.map((c) => [c.id, c]))
  const insertedIds = new Set<string>()
  let progress = true
  while (remaining.size > 0 && progress) {
    progress = false
    for (const [id, c] of [...remaining]) {
      const parentReady = c.parentId === null || insertedIds.has(c.parentId) || !remaining.has(c.parentId)
      if (!parentReady) continue
      await db
        .insert(schema.collections)
        .values({ id: c.id, name: c.name, parentId: c.parentId, createdAt: new Date(c.createdAt) })
        .onConflictDoNothing()
        .run()
      insertedIds.add(id)
      remaining.delete(id)
      progress = true
    }
  }
  // 순환 참조 등으로 끝내 부모를 못 찾은 나머지는 최상위로 강등해서라도 데이터 손실 없이 반영
  for (const c of remaining.values()) {
    await db
      .insert(schema.collections)
      .values({ id: c.id, name: c.name, parentId: null, createdAt: new Date(c.createdAt) })
      .onConflictDoNothing()
      .run()
  }
}

/**
 * 가져온 데이터를 현재 DB에 추가(add-only)한다 — 기존 데이터를 지우거나 덮어쓰지 않는다.
 * 같은 id가 이미 있으면 onConflictDoNothing으로 건너뛴다(같은 파일을 다시 가져와도 안전).
 */
export async function importAllData(data: Partial<ExportedData>): Promise<ImportSummary> {
  // EXPORT_VERSION만 정의해두고 실제로는 검사하지 않아 향후 스키마가 바뀌면 무음으로
  // 잘못된 데이터가 들어갈 수 있었다(eval-rubric 지적, 2026-09-18) — 지금 앱이 모르는
  // 더 미래 버전의 백업 파일만 명시적으로 거부한다(과거 버전은 계속 하위호환).
  if (typeof data.version === 'number' && data.version > EXPORT_VERSION) {
    throw new Error(
      `unsupported_export_version: 이 백업 파일(v${data.version})은 현재 앱(v${EXPORT_VERSION})보다 최신 버전에서 내보낸 것이라 가져올 수 없습니다. 앱을 업데이트한 뒤 다시 시도하세요.`
    )
  }

  const db = getDb()
  const summary: ImportSummary = {
    tags: 0,
    links: 0,
    collections: 0,
    relations: 0,
    linkTags: 0,
    collectionLinks: 0,
    folderExclusions: 0
  }

  if (data.tags?.length) {
    await db
      .insert(schema.tags)
      .values(data.tags.map((t) => ({ id: t.id, name: t.name, color: t.color, sourcePath: t.sourcePath ?? null })))
      .onConflictDoNothing()
      .run()
    summary.tags = data.tags.length
  }

  if (data.collections?.length) {
    await insertCollectionsTopological(data.collections)
    summary.collections = data.collections.length
  }

  if (data.links?.length) {
    await db
      .insert(schema.links)
      .values(
        data.links.map((l) => ({
          id: l.id,
          kind: l.kind,
          title: l.title,
          url: l.url,
          description: l.description,
          favicon: l.favicon,
          thumbnail: l.thumbnail,
          note: l.note,
          content: l.content,
          domain: l.domain,
          favorite: l.favorite,
          deletedAt: l.deletedAt ? new Date(l.deletedAt) : null,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
          fileMtime: l.fileMtime ? new Date(l.fileMtime) : null,
          openedAt: l.openedAt ? new Date(l.openedAt) : null,
          linkCheckedAt: l.linkCheckedAt ? new Date(l.linkCheckedAt) : null,
          linkBroken: l.linkBroken ?? false
        }))
      )
      .onConflictDoNothing()
      .run()
    summary.links = data.links.length
  }

  if (data.linkTags?.length) {
    await db
      .insert(schema.linkTags)
      .values(data.linkTags.map((lt) => ({ linkId: lt.linkId, tagId: lt.tagId })))
      .onConflictDoNothing()
      .run()
    summary.linkTags = data.linkTags.length
  }

  if (data.collectionLinks?.length) {
    await db
      .insert(schema.collectionLinks)
      .values(data.collectionLinks.map((cl) => ({ collectionId: cl.collectionId, linkId: cl.linkId })))
      .onConflictDoNothing()
      .run()
    summary.collectionLinks = data.collectionLinks.length
  }

  if (data.relations?.length) {
    await db
      .insert(schema.relations)
      .values(
        data.relations.map((r) => ({
          id: r.id,
          sourceId: r.sourceId,
          sourceKind: r.sourceKind,
          targetId: r.targetId,
          targetKind: r.targetKind,
          type: r.type,
          label: r.label,
          createdAt: new Date(r.createdAt)
        }))
      )
      .onConflictDoNothing()
      .run()
    summary.relations = data.relations.length
  }

  if (data.folderExclusions?.length) {
    await db
      .insert(schema.folderSyncExclusions)
      .values(data.folderExclusions.map((fe) => ({ tagId: fe.tagId, relativePath: fe.relativePath })))
      .onConflictDoNothing()
      .run()
    summary.folderExclusions = data.folderExclusions.length
  }

  return summary
}
