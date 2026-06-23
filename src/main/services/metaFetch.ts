import ogs from 'open-graph-scraper'
import type { OgMeta } from '@shared/types'

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function faviconFor(domain: string | null): string | null {
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

/** 페이지 HTML을 받아 본문 텍스트만 추출(전문검색용). 실패 시 null. 최대 4000자. */
async function fetchPageText(url: string): Promise<string | null> {
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 5000)
    const res = await fetch(url, { signal: ac.signal, redirect: 'follow' })
    clearTimeout(timer)
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html')) return null
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text ? text.slice(0, 4000) : null
  } catch {
    return null
  }
}

/** OpenGraph 메타 + 본문 텍스트 수집. 실패해도 도메인 기반 fallback을 반환한다. */
export async function fetchMeta(url: string): Promise<OgMeta> {
  const domain = hostname(url)
  // 본문 텍스트는 OG 수집과 병렬로 (best-effort)
  const contentPromise = fetchPageText(url)

  const fallback: OgMeta = {
    title: domain,
    description: null,
    favicon: faviconFor(domain),
    thumbnail: null,
    domain,
    content: null
  }

  try {
    const { result } = await ogs({ url, timeout: 5000 })
    const content = await contentPromise
    if (!result.success) return { ...fallback, content }

    const image = Array.isArray(result.ogImage) ? result.ogImage[0]?.url : undefined
    const favicon = result.favicon
      ? new URL(result.favicon, url).href
      : faviconFor(domain)

    return {
      title: result.ogTitle || result.twitterTitle || domain,
      description: result.ogDescription || result.twitterDescription || null,
      favicon,
      thumbnail: image ?? null,
      domain,
      content
    }
  } catch {
    return { ...fallback, content: await contentPromise }
  }
}
