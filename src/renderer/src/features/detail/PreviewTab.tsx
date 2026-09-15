import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { LinkWithTags } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { Favicon } from '@/features/links/LinkCard'
import { FilePreview } from './FilePreview'
import { previewKindFor } from './previewKind'

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
        description: meta.description ?? link.description,
        content: meta.content ?? link.content
      })
    } finally {
      setLoading(false)
    }
  }

  // 로컬 파일 링크 + 렌더링 가능한 확장자면 리치 미리보기를 상단에 우선 표시.
  // 이 경우 아래 썸네일/메타 제목·설명 필드는 web 링크(OG 수집) 전용이라 파일에는
  // 의미가 없고(파일명을 "메타 제목"이라 되풀이 표시하는 등) 미리보기가 차지할 공간만
  // 줄여 "PDF가 너무 작다"는 피드백(2026-09-16)의 원인이었다 — 파일 링크는 이 필드들을
  // 건너뛰고 미리보기 하나에 전체 폭을 준다.
  const richPreviewKind = previewKindFor(link.kind, link.url)
  if (richPreviewKind) {
    return (
      <div className="px-4 py-4">
        <FilePreview link={link} />
      </div>
    )
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
