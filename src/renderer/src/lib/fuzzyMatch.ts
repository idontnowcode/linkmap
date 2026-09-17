// 커맨드 팔레트(P10)용 경량 퍼지 매칭 — 외부 라이브러리 없이 자체 구현한다(신규 의존성 회피).
// 1) 부분문자열 그대로 포함되면 최우선(등장 위치가 앞쪽일수록 높은 점수)
// 2) 아니면 subsequence 매칭(쿼리 문자가 순서대로 등장하는지) — 연속으로 이어질수록 가점
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const t = target.toLowerCase()

  const idx = t.indexOf(q)
  if (idx !== -1) return 1000 - idx

  let ti = 0
  let score = 0
  let consecutive = 0
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti)
    if (found === -1) return null
    score += (found === ti ? 3 : 1) + consecutive
    consecutive = found === ti ? consecutive + 1 : 0
    ti = found + 1
  }
  return score
}
