import type { GraphSnapshot, LinkWithTags } from '@shared/types'

export interface Suggestion {
  link: LinkWithTags
  score: number
  reason: string
}

const STOP = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'for', 'in', 'on', 'with', 'is',
  'api', 'app', 'home', 'docs', 'doc', 'page', 'www', 'com'
])

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/)
      .filter((t) => t.length >= 3 && !STOP.has(t))
  )
}

/**
 * 로컬 휴리스틱 관계 추천 (외부 AI/네트워크 불필요, 오프라인).
 * 점수: 공유 태그 ×3, 같은 도메인 ×2, 제목 토큰 겹침 ×1.
 * 자기 자신 / 이미 관계가 있는 링크 / 무시된 링크는 제외.
 */
export function suggestRelations(
  targetId: string,
  snapshot: GraphSnapshot,
  dismissed: Set<string> = new Set(),
  limit = 4
): Suggestion[] {
  const target = snapshot.links.find((l) => l.id === targetId)
  if (!target || target.deletedAt != null) return []

  // 이미 관계가 있는 상대 id
  const related = new Set<string>()
  for (const r of snapshot.relations) {
    if (r.sourceId === targetId) related.add(r.targetId)
    if (r.targetId === targetId) related.add(r.sourceId)
  }

  const targetTags = new Set(target.tagIds)
  const targetTokens = tokens(target.title)

  const results: Suggestion[] = []
  for (const l of snapshot.links) {
    if (l.id === targetId || l.deletedAt != null) continue
    if (related.has(l.id) || dismissed.has(l.id)) continue

    let score = 0
    const reasons: string[] = []

    const sharedTags = l.tagIds.filter((t) => targetTags.has(t))
    if (sharedTags.length) {
      score += sharedTags.length * 3
      reasons.push(`태그 ${sharedTags.length}개 공유`)
    }
    if (target.domain && l.domain && target.domain === l.domain) {
      score += 2
      reasons.push('같은 도메인')
    }
    let overlap = 0
    for (const tok of tokens(l.title)) if (targetTokens.has(tok)) overlap++
    if (overlap) {
      score += overlap
      reasons.push('제목 유사')
    }

    if (score > 0) results.push({ link: l, score, reason: reasons.join(' · ') })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}
