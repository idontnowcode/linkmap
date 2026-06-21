import { useEffect, useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { LinkWithTags } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export function NotesTab({ link }: { link: LinkWithTags }): JSX.Element {
  const updateLink = useAppStore((s) => s.updateLink)
  const [draft, setDraft] = useState(link.note ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>(link.note ? 'preview' : 'edit')

  // 다른 링크 선택 시 draft 동기화
  useEffect(() => {
    setDraft(link.note ?? '')
  }, [link.id, link.note])

  const save = (): void => {
    if (draft !== (link.note ?? '')) void updateLink(link.id, { note: draft })
  }

  return (
    <div className="flex h-full flex-col px-4 py-3">
      <div className="mb-2 flex items-center justify-end gap-1">
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
