import type { LinkWithTags, Tag } from '@shared/types'

export interface ParsedQuery {
  text: string
  tagNames: string[]
  urlIncludes: string[]
  memoIncludes: string[]
}

/** 그룹 하나("openai tag:AI …") 파싱 — 그룹 내부는 AND */
function parseGroup(raw: string): ParsedQuery {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  const q: ParsedQuery = { text: '', tagNames: [], urlIncludes: [], memoIncludes: [] }
  const free: string[] = []
  for (const tok of tokens) {
    const lower = tok.toLowerCase()
    if (lower.startsWith('tag:')) q.tagNames.push(tok.slice(4).toLowerCase())
    else if (lower.startsWith('url:')) q.urlIncludes.push(tok.slice(4).toLowerCase())
    else if (lower.startsWith('memo:')) q.memoIncludes.push(tok.slice(5).toLowerCase())
    else free.push(tok)
  }
  q.text = free.join(' ').toLowerCase()
  return q
}

/**
 * 전체 검색어를 콤마(,)로 나눠 여러 그룹으로 파싱.
 * 그룹 간 = OR, 그룹 내부 = AND.  예: "tag:MCU, tag:RTOS" → MCU 또는 RTOS
 */
export function parseSearch(raw: string): ParsedQuery[] {
  return raw
    .split(',')
    .map((s) => parseGroup(s))
    .filter((q) => !groupEmpty(q))
}

function groupEmpty(q: ParsedQuery): boolean {
  return !q.text && !q.tagNames.length && !q.urlIncludes.length && !q.memoIncludes.length
}

export function isEmpty(queries: ParsedQuery[]): boolean {
  return queries.length === 0
}

/** 그룹 하나에 대한 링크 매칭 (AND) */
function matchGroup(link: LinkWithTags, q: ParsedQuery, tagsById: Map<string, Tag>): boolean {
  if (q.text) {
    const hay =
      `${link.title} ${link.url} ${link.description ?? ''} ${link.note ?? ''} ${link.content ?? ''}`.toLowerCase()
    if (!hay.includes(q.text)) return false
  }
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

/** 그룹들의 자유 텍스트 토큰 모음 (스니펫/강조용) */
export function queryTexts(queries: ParsedQuery[]): string[] {
  return queries.map((q) => q.text).filter(Boolean)
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
