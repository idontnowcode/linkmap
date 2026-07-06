import type { LinkWithTags, Tag } from '@shared/types'

export interface ParsedQuery {
  /** 모두 포함되어야 하는 자유 텍스트 키워드들 (AND) */
  texts: string[]
  tagNames: string[]
  urlIncludes: string[]
  memoIncludes: string[]
}

function strip(tok: string): string {
  return tok.replace(/^"|"$/g, '')
}

/** 그룹 하나 파싱 — 그룹 내부는 AND. 공백=키워드 AND, "따옴표"=구절, tag:/url:/memo: 지원 */
function parseGroup(raw: string): ParsedQuery {
  const q: ParsedQuery = { texts: [], tagNames: [], urlIncludes: [], memoIncludes: [] }
  const tokens = raw.trim().match(/"[^"]*"|\S+/g) ?? []
  for (const tok of tokens) {
    const lower = tok.toLowerCase()
    if (lower.startsWith('tag:')) q.tagNames.push(strip(tok.slice(4)).toLowerCase())
    else if (lower.startsWith('url:')) q.urlIncludes.push(strip(tok.slice(4)).toLowerCase())
    else if (lower.startsWith('memo:')) q.memoIncludes.push(strip(tok.slice(5)).toLowerCase())
    else {
      const t = strip(tok).toLowerCase()
      if (t) q.texts.push(t)
    }
  }
  return q
}

/**
 * 전체 검색어를 콤마(,)로 나눠 여러 그룹으로 파싱.
 * 그룹 간 = OR, 그룹 내부 = AND.
 *   "MCU Datasheet"      → MCU 그리고 Datasheet (전부 포함)
 *   "tag:MCU, tag:RTOS"  → MCU 또는 RTOS
 *   "\"vector db\""       → 정확한 구절
 */
export function parseSearch(raw: string): ParsedQuery[] {
  return raw
    .split(',')
    .map((s) => parseGroup(s))
    .filter((q) => !groupEmpty(q))
}

function groupEmpty(q: ParsedQuery): boolean {
  return !q.texts.length && !q.tagNames.length && !q.urlIncludes.length && !q.memoIncludes.length
}

export function isEmpty(queries: ParsedQuery[]): boolean {
  return queries.length === 0
}

/** 그룹 하나에 대한 링크 매칭 (모든 조건 AND) */
function matchGroup(link: LinkWithTags, q: ParsedQuery, tagsById: Map<string, Tag>): boolean {
  const hay =
    `${link.title} ${link.url} ${link.description ?? ''} ${link.note ?? ''} ${link.content ?? ''}`.toLowerCase()
  for (const t of q.texts) if (!hay.includes(t)) return false
  for (const u of q.urlIncludes) if (!link.url.toLowerCase().includes(u)) return false
  for (const m of q.memoIncludes) if (!(link.note ?? '').toLowerCase().includes(m)) return false
  for (const tn of q.tagNames) {
    const names = link.tagIds.map((id) => tagsById.get(id)?.name.toLowerCase() ?? '')
    if (!names.some((n) => n.includes(tn))) return false
  }
  return true
}

/** 링크가 어느 한 그룹이라도 만족하면 매칭 (OR). 빈 쿼리는 전부 매칭. */
export function matchLink(
  link: LinkWithTags,
  queries: ParsedQuery[],
  tagsById: Map<string, Tag>
): boolean {
  if (queries.length === 0) return true
  return queries.some((q) => matchGroup(link, q, tagsById))
}

/** 그룹들의 자유 텍스트 키워드 모음 (스니펫/강조용) */
export function queryTexts(queries: ParsedQuery[]): string[] {
  return queries.flatMap((q) => q.texts)
}

/** 본문에서 검색어 주변 스니펫을 추출. 매칭 없으면 null. */
export function contentSnippet(content: string | null, text: string, pad = 45): string | null {
  if (!content || !text) return null
  const lower = content.toLowerCase()
  const idx = lower.indexOf(text.toLowerCase())
  if (idx === -1) return null
  const start = Math.max(0, idx - pad)
  const end = Math.min(content.length, idx + text.length + pad)
  return (start > 0 ? '…' : '') + content.slice(start, end).trim() + (end < content.length ? '…' : '')
}
