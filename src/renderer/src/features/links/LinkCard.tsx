import { File, Folder, StickyNote, Star } from 'lucide-react'
import type { LinkWithTags } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { cn, initials } from '@/lib/utils'
import { contentSnippet, parseSearch } from '@/lib/search'

/** 스니펫에서 검색어를 강조 표시 */
function highlight(text: string, term: string): React.ReactNode {
  if (!term) return text
  const lower = text.toLowerCase()
  const t = term.toLowerCase()
  const out: React.ReactNode[] = []
  let i = 0
  let k = 0
  while (i < text.length) {
    const idx = lower.indexOf(t, i)
    if (idx === -1) {
      out.push(text.slice(i))
      break
    }
    if (idx > i) out.push(text.slice(i, idx))
    out.push(
      <mark key={k++} className="rounded-sm bg-amber-200 px-0.5 text-amber-900">
        {text.slice(idx, idx + term.length)}
      </mark>
    )
    i = idx + term.length
  }
  return out
}

interface LinkCardProps {
  link: LinkWithTags
  selectMode?: boolean
  checked?: boolean
  onToggleSelect?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, link: LinkWithTags) => void
}

export function LinkCard({
  link,
  selectMode = false,
  checked = false,
  onToggleSelect,
  onContextMenu
}: LinkCardProps): JSX.Element {
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
  const searchQuery = useUiStore((s) => s.searchQuery)
  const selectNode = useUiStore((s) => s.selectNode)
  const focusNode = useUiStore((s) => s.focusNode)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)

  const selected = selectedNodeId === link.id

  // 전문검색: 본문에서만 매칭됐을 때 스니펫 표시
  const q = parseSearch(searchQuery)
  const inMeta = !!q.text && `${link.title} ${link.domain ?? ''} ${link.url}`.toLowerCase().includes(q.text)
  const snip = q.text && !inMeta ? contentSnippet(link.content, q.text) : null

  return (
    <div
      draggable={!selectMode}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-linkmap-link', link.id)
        e.dataTransfer.effectAllowed = 'copyMove'
      }}
      onClick={() => {
        if (selectMode) {
          onToggleSelect?.(link.id)
          return
        }
        selectNode(link.id, 'link')
        focusNode(link.id)
      }}
      onContextMenu={(e) => onContextMenu?.(e, link)}
      className={cn(
        'group flex cursor-pointer items-start gap-2.5 border-b border-line px-3 py-2.5',
        selectMode && checked ? 'bg-brand/10' : selected ? 'bg-brand/5' : 'hover:bg-[#EEF2F7]'
      )}
    >
      {selectMode && (
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggleSelect?.(link.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 shrink-0 accent-brand"
        />
      )}
      <div className="pt-0.5">
        <Favicon link={link} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-ink-strong">{link.title}</p>
        <p className="truncate text-sm text-ink-muted">{link.domain ?? link.url}</p>
        {snip && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
            <span className="mr-1 rounded-sm bg-amber-100 px-1 text-[10px] font-medium text-amber-700">
              본문
            </span>
            {highlight(snip, q.text)}
          </p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          void toggleFavorite(link.id)
        }}
        className="shrink-0 p-0.5"
        title="즐겨찾기"
      >
        <Star
          size={15}
          className={link.favorite ? 'fill-brand text-brand' : 'text-ink-muted/50 group-hover:text-ink-muted'}
        />
      </button>
    </div>
  )
}

export function Favicon({ link, size = 18 }: { link: LinkWithTags; size?: number }): JSX.Element {
  if (link.kind !== 'web') {
    const Icon = link.kind === 'folder' ? Folder : link.kind === 'note' ? StickyNote : File
    const tint = link.kind === 'folder' ? '#F97316' : link.kind === 'note' ? '#EAB308' : '#14B8A6'
    return (
      <span
        className="grid shrink-0 place-items-center rounded-sm"
        style={{ width: size, height: size, background: `${tint}1F` }}
      >
        <Icon size={size * 0.62} style={{ color: tint }} />
      </span>
    )
  }
  if (link.favicon) {
    return (
      <img
        src={link.favicon}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="shrink-0 rounded-sm"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-sm bg-brand/10 text-[9px] font-semibold text-brand"
      style={{ width: size, height: size }}
    >
      {initials(link.title)}
    </span>
  )
}
