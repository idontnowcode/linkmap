import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FolderClosed,
  Link2,
  Plus,
  Settings,
  Share2,
  Star,
  StickyNote,
  Trash2
} from 'lucide-react'
import type { Collection } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore, type ActiveView } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ContextMenu } from '@/components/ui/ContextMenu'

function sameView(a: ActiveView, b: ActiveView): boolean {
  return a.kind === b.kind && a.id === b.id
}

type RailMenu = { x: number; y: number; kind: 'tag' | 'collection'; id: string; name: string }

export function LeftRail(): JSX.Element {
  const tags = useAppStore((s) => s.snapshot.tags)
  const collections = useAppStore((s) => s.snapshot.collections)
  const counts = useAppStore((s) => s.counts)
  const deleteCollection = useAppStore((s) => s.deleteCollection)
  const moveCollection = useAppStore((s) => s.moveCollection)
  const addLinkToCollection = useAppStore((s) => s.addLinkToCollection)
  const addTagToLink = useAppStore((s) => s.addTagToLink)
  const deleteTag = useAppStore((s) => s.deleteTag)
  const activeView = useUiStore((s) => s.activeView)
  const setView = useUiStore((s) => s.setView)
  const openLinkForm = useUiStore((s) => s.openLinkForm)
  const openTagForm = useUiStore((s) => s.openTagForm)
  const openCollectionForm = useUiStore((s) => s.openCollectionForm)
  const openSettings = useUiStore((s) => s.openSettings)

  const [menu, setMenu] = useState<RailMenu | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [tagsCollapsed, setTagsCollapsed] = useState(false)
  const [colsCollapsed, setColsCollapsed] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | 'root' | null>(null)

  const removeItem = (m: RailMenu): void => {
    const what = m.kind === 'tag' ? '태그' : '컬렉션'
    const extra = m.kind === 'collection' ? ' (하위 폴더 포함, 링크 자체는 보존)' : ' (링크 자체는 보존)'
    if (!confirm(`'${m.name}' ${what}을(를) 삭제할까요?${extra}`)) return
    if (m.kind === 'tag') void deleteTag(m.id)
    else void deleteCollection(m.id)
    if (sameView(activeView, { kind: m.kind, id: m.id })) setView({ kind: 'smart', id: 'all' })
  }

  // 컬렉션 트리 (parentId 기반)
  const childrenOf = useMemo(() => {
    const m = new Map<string | null, Collection[]>()
    for (const c of collections) {
      const k = c.parentId ?? null
      const arr = m.get(k) ?? []
      arr.push(c)
      m.set(k, arr)
    }
    return m
  }, [collections])

  const toggleCollapse = (id: string): void =>
    setCollapsed((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const descendantsOf = (id: string): Set<string> => {
    const out = new Set<string>()
    const stack = (childrenOf.get(id) ?? []).map((c) => c.id)
    while (stack.length) {
      const x = stack.pop()!
      if (out.has(x)) continue
      out.add(x)
      for (const ch of childrenOf.get(x) ?? []) stack.push(ch.id)
    }
    return out
  }

  // drag→target 이동 가능 여부 (자기 자신/하위로는 불가 = 사이클 방지)
  const canDropOn = (target: string): boolean =>
    !!dragId && dragId !== target && !descendantsOf(dragId).has(target)

  const renderCollection = (c: Collection, depth: number): JSX.Element => {
    const kids = childrenOf.get(c.id) ?? []
    const hasKids = kids.length > 0
    const isCollapsed = collapsed.has(c.id)
    const active = sameView(activeView, { kind: 'collection', id: c.id })
    const isDropHere = dropTarget === c.id
    return (
      <div key={c.id}>
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            setDragId(c.id)
            e.dataTransfer.setData('application/x-linkmap-collection', c.id)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={() => {
            setDragId(null)
            setDropTarget(null)
          }}
          onDragOver={(e) => {
            const t = e.dataTransfer.types
            const linkDrag = t.includes('application/x-linkmap-link')
            const colDrag = t.includes('application/x-linkmap-collection') && canDropOn(c.id)
            if (!linkDrag && !colDrag) return
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = linkDrag ? 'copy' : 'move'
            if (dropTarget !== c.id) setDropTarget(c.id)
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const linkId = e.dataTransfer.getData('application/x-linkmap-link')
            if (linkId) void addLinkToCollection(c.id, linkId)
            else if (canDropOn(c.id)) void moveCollection(dragId!, c.id)
            setDragId(null)
            setDropTarget(null)
          }}
          onClick={() => setView({ kind: 'collection', id: c.id })}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setMenu({ x: e.clientX, y: e.clientY, kind: 'collection', id: c.id, name: c.name })
          }}
          style={{ paddingLeft: 8 + depth * 14 }}
          className={cn(
            'group/col flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2.5 text-body',
            isDropHere
              ? 'bg-brand/30 ring-1 ring-brand'
              : active
                ? 'bg-rail-active text-white'
                : 'text-ink-dark hover:bg-rail-hover'
          )}
        >
          {hasKids ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleCollapse(c.id)
              }}
              className="shrink-0 text-ink-dark-muted hover:text-white"
            >
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : (
            <span className="w-[13px] shrink-0" />
          )}
          <FolderClosed size={15} className="shrink-0 opacity-80" />
          <span className="flex-1 truncate text-left">{c.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              openCollectionForm(c.id)
            }}
            className="hidden shrink-0 text-ink-dark-muted hover:text-white group-hover/col:block"
            title="하위 컬렉션 추가"
          >
            <Plus size={13} />
          </button>
          <span className="text-sm text-ink-dark-muted group-hover/col:hidden">
            {counts.byCollection[c.id] ?? 0}
          </span>
        </div>
        {hasKids && !isCollapsed && kids.map((k) => renderCollection(k, depth + 1))}
      </div>
    )
  }

  const smartViews = [
    { id: 'all', label: '모든 링크', icon: Link2, count: counts.all },
    { id: 'favorites', label: '즐겨찾기', icon: Star, count: counts.favorites },
    { id: 'recent', label: '최근 추가', icon: Clock, count: counts.recent },
    { id: 'trash', label: '휴지통', icon: Trash2, count: counts.trash }
  ] as const

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-rail text-ink-dark">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <Share2 size={20} className="text-brand" />
        <span className="text-logo text-white">Link Map</span>
      </div>

      {/* Actions */}
      <div className="space-y-2 px-3 pb-3">
        <Button block onClick={() => openLinkForm()}>
          <Plus size={16} /> 새 링크 추가
        </Button>
        <div className="flex gap-2">
          <Button block variant="secondary" onClick={() => openLinkForm({ kind: 'note' })}>
            <StickyNote size={15} /> 새 메모
          </Button>
          <Button block variant="secondary" onClick={openTagForm}>
            <Plus size={15} /> 새 태그
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {/* Smart views */}
        <nav className="mb-4 space-y-0.5">
          {smartViews.map((v) => {
            const Icon = v.icon
            const active = sameView(activeView, { kind: 'smart', id: v.id })
            return (
              <button
                key={v.id}
                onClick={() => setView({ kind: 'smart', id: v.id })}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-body',
                  active ? 'bg-rail-active text-white' : 'text-ink-dark hover:bg-rail-hover'
                )}
              >
                <Icon size={16} className="shrink-0 opacity-80" />
                <span className="flex-1 text-left">{v.label}</span>
                <span className="text-sm text-ink-dark-muted">{v.count}</span>
              </button>
            )
          })}
        </nav>

        {/* Collections (트리) — 폴더가 먼저 */}
        <SectionLabel
          label="폴더(컬렉션)"
          onAdd={() => openCollectionForm()}
          collapsed={colsCollapsed}
          onToggle={() => setColsCollapsed((v) => !v)}
        />
        {!colsCollapsed && (
          <>
            <div className="space-y-0.5">
              {(childrenOf.get(null) ?? []).map((c) => renderCollection(c, 0))}
              {collections.length === 0 && <Empty>컬렉션 없음</Empty>}
            </div>
            {dragId && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.dataTransfer.dropEffect = 'move'
                  if (dropTarget !== 'root') setDropTarget('root')
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void moveCollection(dragId, null)
                  setDragId(null)
                  setDropTarget(null)
                }}
                className={cn(
                  'mt-1.5 rounded-md border border-dashed px-2.5 py-2 text-center text-sm transition-colors',
                  dropTarget === 'root'
                    ? 'border-brand bg-brand/20 text-white'
                    : 'border-white/15 text-ink-dark-muted'
                )}
              >
                ↥ 여기에 놓으면 최상위로
              </div>
            )}
          </>
        )}

        {/* Tags — 폴더 아래로 */}
        <div className="mt-4">
          <SectionLabel
            label="태그"
            onAdd={openTagForm}
            collapsed={tagsCollapsed}
            onToggle={() => setTagsCollapsed((v) => !v)}
          />
          {!tagsCollapsed && (
            <div className="space-y-0.5">
              {tags.map((t) => {
                const active = sameView(activeView, { kind: 'tag', id: t.id })
                return (
                  <button
                    key={t.id}
                    onClick={() => setView({ kind: 'tag', id: t.id })}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenu({ x: e.clientX, y: e.clientY, kind: 'tag', id: t.id, name: t.name })
                    }}
                    onDragOver={(e) => {
                      if (!e.dataTransfer.types.includes('application/x-linkmap-link')) return
                      e.preventDefault()
                      e.stopPropagation()
                      e.dataTransfer.dropEffect = 'copy'
                      if (dropTarget !== t.id) setDropTarget(t.id)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const linkId = e.dataTransfer.getData('application/x-linkmap-link')
                      if (linkId) void addTagToLink(linkId, t.id)
                      setDropTarget(null)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-body',
                      dropTarget === t.id
                        ? 'bg-brand/30 ring-1 ring-brand'
                        : active
                          ? 'bg-rail-active text-white'
                          : 'text-ink-dark hover:bg-rail-hover'
                    )}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
                    <span className="flex-1 truncate text-left">{t.name}</span>
                    <span className="text-sm text-ink-dark-muted">{counts.byTag[t.id] ?? 0}</span>
                  </button>
                )
              })}
              {tags.length === 0 && <Empty>태그 없음</Empty>}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <button
        onClick={openSettings}
        className="flex items-center gap-2.5 border-t border-white/5 px-4 py-3 text-body text-ink-dark-muted hover:text-white"
      >
        <Settings size={16} /> 설정
      </button>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={
            menu.kind === 'collection'
              ? [
                  {
                    label: '하위 컬렉션 추가',
                    icon: <Plus size={14} />,
                    onClick: () => openCollectionForm(menu.id)
                  },
                  {
                    label: '컬렉션 삭제',
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: () => removeItem(menu)
                  }
                ]
              : [
                  {
                    label: '태그 삭제',
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: () => removeItem(menu)
                  }
                ]
          }
        />
      )}
    </aside>
  )
}

function SectionLabel({
  label,
  onAdd,
  collapsed,
  onToggle
}: {
  label: string
  onAdd?: () => void
  collapsed?: boolean
  onToggle?: () => void
}): JSX.Element {
  return (
    <div className="flex items-center justify-between px-2.5 pb-1 pt-1">
      <button
        onClick={onToggle}
        disabled={!onToggle}
        className="flex items-center gap-1 text-label uppercase text-ink-dark-muted hover:text-white disabled:hover:text-ink-dark-muted"
      >
        {onToggle &&
          (collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />)}
        {label}
      </button>
      {onAdd && (
        <button onClick={onAdd} className="text-ink-dark-muted hover:text-white">
          <Plus size={14} />
        </button>
      )}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }): JSX.Element {
  return <p className="px-2.5 py-1 text-sm text-ink-dark-muted/70">{children}</p>
}
