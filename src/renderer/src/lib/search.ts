import type { LinkWithTags, Tag } from '@shared/types'

export interface ParsedQuery {
  text: string
  tagNames: string[]
  urlIncludes: string[]
  memoIncludes: string[]
}

/** "openai tag:AI url:openai memo:vector" → 구조화 */
export function parseSearch(raw: string): ParsedQuery {
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

export function isEmptyQuery(q: ParsedQuery): boolean {
  return !q.text && !q.tagNames.length && !q.urlIncludes.length && !q.memoIncludes.length
}

/** 본문에서 검색어 주변 스니펫을 추출 (전문검색 결과 표시용). 매칭 없으면 null. */
export function contentSnippet(content: string | null, text: string, pad = 45): string | null {
  if (!content || !text) return null
  const lower = content.toLowerCase()
  const idx = lower.indexOf(text.toLowerCase())
  if (idx === -1) return null
  const start = Math.max(0, idx - pad)
  const end = Math.min(content.length, idx + text.length + pad)
  return (start > 0 ? '…' : '') + content.slice(start, end).trim() + (end < content.length ? '…' : '')
}

/** 링크가 파싱된 쿼리에 매칭되는지 */
export function matchLink(link: LinkWithTags, q: ParsedQuery, tagsById: Map<string, Tag>): boolean {
  if (isEmptyQuery(q)) return true

  if (q.text) {
    const hay =
      `${link.title} ${link.url} ${link.description ?? ''} ${link.note ?? ''} ${link.content ?? ''}`.toLowerCase()
    if (!hay.includes(q.text)) return false
  }
  for (const u of q.urlIncludes) {
    if (!link.url.toLowerCase().includes(u)) return false
  }
  for (const m of q.memoIncludes) {
    if (!(link.note ?? '').toLowerCase().includes(m)) return false
  }
  for (const tn of q.tagNames) {
    const names = link.tagIds.map((id) => tagsById.get(id)?.name.toLowerCase() ?? '')
    if (!names.some((n) => n.includes(tn))) return false
  }
  return true
}
