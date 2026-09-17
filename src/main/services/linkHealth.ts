// 깨진 링크(데드링크) 검사(P7) — kind='web' 링크의 URL이 아직 살아있는지 확인한다.
// 매번 전체 링크를 자동으로 검사하면 느릴 수 있어 설정 화면의 수동 "깨진 링크 확인"
// 버튼으로만 시작한다(자동/주기 검사는 이번 범위 밖). Electron 33(Node 20+)의 전역
// fetch를 그대로 사용 — 별도 http 클라이언트 의존성 추가 없음.
import { linkRepo } from '../repositories'

const TIMEOUT_MS = 8000
const CONCURRENCY = 5

async function fetchWithTimeout(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { method, redirect: 'follow', signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** HEAD를 우선 시도하고, 일부 서버가 HEAD를 막아두는 경우(405/501 등)만 GET으로 재확인. */
async function checkLinkAlive(url: string): Promise<boolean> {
  try {
    const head = await fetchWithTimeout(url, 'HEAD')
    if (head.ok) return true
    if (head.status !== 405 && head.status !== 501) return false
  } catch {
    /* HEAD 자체가 실패하면 GET으로 한 번 더 확인 */
  }
  try {
    const get = await fetchWithTimeout(url, 'GET')
    return get.ok
  } catch {
    return false
  }
}

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let idx = 0
  async function worker(): Promise<void> {
    while (idx < items.length) {
      const cur = idx++
      await fn(items[cur])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
}

export interface CheckBrokenLinksResult {
  checked: number
  brokenIds: string[]
}

/** 모든 활성 웹 링크를 동시성 제한(5)을 두고 검사해 DB에 결과를 기록한다. */
export async function checkAllBrokenLinks(): Promise<CheckBrokenLinksResult> {
  const targets = await linkRepo.listActiveWeb()
  const brokenIds: string[] = []
  await mapWithConcurrency(targets, CONCURRENCY, async (link) => {
    const alive = await checkLinkAlive(link.url)
    await linkRepo.setLinkHealth(link.id, !alive)
    if (!alive) brokenIds.push(link.id)
  })
  return { checked: targets.length, brokenIds }
}
