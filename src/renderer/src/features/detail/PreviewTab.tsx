import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { LinkWithTags } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { Favicon } from '@/features/links/LinkCard'

export function PreviewTab({ link }: { link: LinkWithTags }): JSX.Element {
  const updateLink = useAppStore((s) => s.updateLink)
  const [loading, setLoading] = useState(false)

  const refetch = async (): Promise<void> => {
    setLoading(true)
    try {
      const meta = await window.api.fetchMeta(link.url)
      await updateLink(link.id, {
        favicon: meta.favicon,
        thumbnail: meta.thumbnail,
        description: meta.description ?? link.description
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-4">
      {link.thumbnail ? (
        <img
          src={link.thumbnail}
          alt=""
          className="mb-3 w-full rounded-md border border-line object-cover"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
        />
      ) : (
        <div className="mb-3 grid h-32 w-full place-items-center rounded-md border border-dashed border-line text-sm text-ink-muted">
          썸네일 없음
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <Favicon link={link} size={18} />
        <span className="truncate text-body font-medium text-ink-strong">{link.domain ?? link.url}</span>
      </div>

      <p className="mb-1 text-label uppercase text-ink-muted">메타 제목</p>
      <p className="mb-3 text-body text-ink-strong">{link.title}</p>

      <p className="mb-1 text-label uppercase text-ink-muted">메타 설명</p>
      <p className="mb-4 text-body text-ink-muted">{link.description ?? '—'}</p>

      {link.kind === 'web' && (
        <button
          onClick={() => void refetch()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-body text-ink-strong hover:bg-list disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? '수집 중…' : '메타데이터 다시 수집'}
        </button>
      )}
    </div>
  )
}
