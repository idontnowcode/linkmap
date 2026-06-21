import { useState } from 'react'
import { MoreVertical, Search } from 'lucide-react'
import { useVisibleLinks } from './useVisibleLinks'
import { LinkCard } from './LinkCard'
import { cn } from '@/lib/utils'

export function LinkListColumn(): JSX.Element {
  const { links, viewTitle } = useVisibleLinks()
  const [localQuery, setLocalQuery] = useState('')

  const filtered = localQuery
    ? links.filter(
        (l) =>
          l.title.toLowerCase().includes(localQuery.toLowerCase()) ||
          l.url.toLowerCase().includes(localQuery.toLowerCase())
      )
    : links

  return (
    <section className="flex h-full flex-col border-r border-line bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-node" />
            <h1 className="text-h text-ink-strong">{viewTitle}</h1>
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">{links.length}개 링크</p>
        </div>
        <button className="rounded-sm p-1 text-ink-muted hover:bg-list">
          <MoreVertical size={16} />
        </button>
      </div>

      {/* In-context search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-md border border-line bg-list px-2.5">
          <Search size={14} className="text-ink-muted" />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="이 목록 내 검색"
            className="h-8 w-full bg-transparent text-body text-ink-strong outline-none placeholder:text-ink-muted"
          />
        </div>
      </div>

      {/* List */}
      <div className={cn('flex-1 overflow-y-auto')}>
        {filtered.map((l) => (
          <LinkCard key={l.id} link={l} />
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-body text-ink-muted">표시할 링크가 없습니다</p>
        )}
      </div>
    </section>
  )
}
