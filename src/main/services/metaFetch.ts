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

/** OpenGraph 메타 수집. 실패해도 도메인 기반 fallback을 반환한다. */
export async function fetchMeta(url: string): Promise<OgMeta> {
  const domain = hostname(url)
  const fallback: OgMeta = {
    title: domain,
    description: null,
    favicon: faviconFor(domain),
    thumbnail: null,
    domain
  }

  try {
    const { result } = await ogs({ url, timeout: 5000 })
    if (!result.success) return fallback

    const image = Array.isArray(result.ogImage) ? result.ogImage[0]?.url : undefined
    const favicon = result.favicon
      ? new URL(result.favicon, url).href
      : faviconFor(domain)

    return {
      title: result.ogTitle || result.twitterTitle || domain,
      description: result.ogDescription || result.twitterDescription || null,
      favicon,
      thumbnail: image ?? null,
      domain
    }
  } catch {
    return fallback
  }
}
