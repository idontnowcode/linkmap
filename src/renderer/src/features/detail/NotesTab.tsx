import { useEffect, useState } from 'react'
import { Eye, Pencil, Quote } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { LinkWithTags } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export function NotesTab({ link }: { link: LinkWithTags }): JSX.Element {
  const updateLink = useAppStore((s) => s.updateLink)
  const [draft, setDraft] = useState(link.note ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>(link.note ? 'preview' : 'edit')
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quotePage, setQuotePage] = useState('')
  const [quoteText, setQuoteText] = useState('')

  // 다른 링크 선택 시 draft 동기화
  useEffect(() => {
    setDraft(link.note ?? '')
    setQuoteOpen(false)
    setQuotePage('')
    setQuoteText('')
  }, [link.id, link.note])

  const save = (): void => {
    if (draft !== (link.note ?? '')) void updateLink(link.id, { note: draft })
  }

  // 미리보기 중인 파일의 특정 부분을 인용해 메모에 남기는 빠른 액션(P13) — 정교한 좌표 기반
  // 하이라이트 대신, 실용적으로 "p.N: 텍스트" 형식을 메모 끝에 append하는 수준으로 구현.
  const addQuote = (): void => {
    const text = quoteText.trim()
    if (!text) return
    const prefix = quotePage.trim() ? `p.${quotePage.trim()}: ` : ''
    const appended = `${draft}${draft.trim() ? '\n\n' : ''}> ${prefix}${text}`
    setDraft(appended)
    void updateLink(link.id, { note: appended })
    setQuoteOpen(false)
    setQuotePage('')
    setQuoteText('')
    setMode('preview')
  }

  return (
    <div className="flex h-full flex-col px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-1">
        <Toggle active={quoteOpen} onClick={() => setQuoteOpen((v) => !v)} icon={<Quote size={13} />}>
          인용 추가
        </Toggle>
        <div className="flex items-center gap-1">
          <Toggle active={mode === 'edit'} onClick={() => setMode('edit')} icon={<Pencil size={13} />}>
            편집
          </Toggle>
          <Toggle
            active={mode === 'preview'}
            onClick={() => {
              save()
              setMode('preview')
            }}
            icon={<Eye size={13} />}
          >
            미리보기
          </Toggle>
        </div>
      </div>

      {quoteOpen && (
        <div className="mb-3 space-y-1.5 rounded-md border border-line bg-list p-2.5">
          <p className="text-sm text-ink-muted">
            미리보기 중인 파일의 일부를 메모에 인용으로 남깁니다(예: PDF의 특정 페이지 내용).
          </p>
          <div className="flex gap-1.5">
            <input
              value={quotePage}
              onChange={(e) => setQuotePage(e.target.value)}
              placeholder="p. (선택, 예: 3)"
              className="h-8 w-24 rounded-sm border border-line px-2 text-sm text-ink-strong outline-none focus:border-brand"
            />
          </div>
          <textarea
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            placeholder="인용할 내용을 붙여넣거나 입력하세요…"
            rows={3}
            className="w-full resize-none rounded-sm border border-line px-2 py-1.5 text-sm text-ink-strong outline-none focus:border-brand"
          />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => setQuoteOpen(false)}
              className="rounded-sm px-2 py-1 text-sm text-ink-muted hover:bg-white"
            >
              취소
            </button>
            <button
              onClick={addQuote}
              disabled={!quoteText.trim()}
              className="rounded-sm bg-brand px-2.5 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              메모에 추가
            </button>
          </div>
        </div>
      )}

      {mode === 'edit' ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          placeholder={'# Notes\n\nMarkdown으로 메모를 작성하세요…'}
          className="min-h-[200px] flex-1 resize-none rounded-md border border-line p-3 text-body text-ink-strong outline-none focus:border-brand"
        />
      ) : (
        <div className="prose-sm flex-1 overflow-y-auto text-body text-ink-strong">
          {draft ? (
            <div className="markdown-body space-y-2">
              <Markdown remarkPlugins={[remarkGfm]}>{draft}</Markdown>
            </div>
          ) : (
            <p className="py-6 text-center text-ink-muted">메모가 없습니다</p>
          )}
        </div>
      )}
    </div>
  )
}

function Toggle({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-sm px-2 py-1 text-sm',
        active ? 'bg-brand/10 font-semibold text-brand' : 'text-ink-muted hover:bg-list'
      )}
    >
      {icon}
      {children}
    </button>
  )
}
