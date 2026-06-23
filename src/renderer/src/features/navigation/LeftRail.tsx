import {
  Clock,
  FolderClosed,
  Link2,
  Plus,
  Settings,
  Share2,
  Star,
  Trash2
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useUiStore, type ActiveView } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

function sameView(a: ActiveView, b: ActiveView): boolean {
  return a.kind === b.kind && a.id === b.id
}

export function LeftRail(): JSX.Element {
  const tags = useAppStore((s) => s.snapshot.tags)
  const collections = useAppStore((s) => s.snapshot.collections)
  const counts = useAppStore((s) => s.counts)
  const deleteCollection = useAppStore((s) => s.deleteCollection)
  const activeView = useUiStore((s) => s.activeView)
  const setView = useUiStore((s) => s.setView)
  const openLinkForm = useUiStore((s) => s.openLinkForm)
  const openTagForm = useUiStore((s) => s.openTagForm)
  const openCollectionForm = useUiStore((s) => s.openCollectionForm)
  const openSettings = useUiStore((s) => s.openSettings)

  const smartViews = [
    { id: 'all', label: '모든 링크', icon: Link2, count: counts.all },
    { id: 'favorites', label: '즐겨찾기', icon: Star, count: counts.favorites },
    { id: 'recent', label: '최근 추가', icon: Clock, count: counts.recent },
    { id: 'trash', label: '휴지통', icon: Trash2, count: counts.trash }
  ] as const

  return (
    <aside className="flex h-full flex-col bg-rail text-ink-dark">
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
        <Button block variant="secondary" onClick={openTagForm}>
          <Plus size={16} /> 새 태그 추가
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
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

        {/* Tags */}
        <SectionLabel label="태그" onAdd={openTagForm} />
        <div className="mb-4 space-y-0.5">
          {tags.map((t) => {
            const active = sameView(activeView, { kind: 'tag', id: t.id })
            return (
              <button
                key={t.id}
                onClick={() => setView({ kind: 'tag', id: t.id })}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-body',
                  active ? 'bg-rail-active text-white' : 'text-ink-dark hover:bg-rail-hover'
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

        {/* Collections */}
        <SectionLabel label="폴더(컬렉션)" onAdd={openCollectionForm} />
        <div className="space-y-0.5">
          {collections.map((c) => {
            const active = sameView(activeView, { kind: 'collection', id: c.id })
            return (
              <div
                key={c.id}
                onClick={() => setView({ kind: 'collection', id: c.id })}
                className={cn(
                  'group/col flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-body',
                  active ? 'bg-rail-active text-white' : 'text-ink-dark hover:bg-rail-hover'
                )}
              >
                <FolderClosed size={15} className="shrink-0 opacity-80" />
                <span className="flex-1 truncate text-left">{c.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`'${c.name}' 컬렉션을 삭제할까요? (링크는 삭제되지 않습니다)`)) {
                      void deleteCollection(c.id)
                    }
                  }}
                  className="hidden shrink-0 text-ink-dark-muted hover:text-white group-hover/col:block"
                  title="컬렉션 삭제"
                >
                  <Trash2 size={13} />
                </button>
                <span className="text-sm text-ink-dark-muted group-hover/col:hidden">
                  {counts.byCollection[c.id] ?? 0}
                </span>
              </div>
            )
          })}
          {collections.length === 0 && <Empty>컬렉션 없음</Empty>}
        </div>
      </div>

      {/* Footer */}
      <button
        onClick={openSettings}
        className="flex items-center gap-2.5 border-t border-white/5 px-4 py-3 text-body text-ink-dark-muted hover:text-white"
      >
        <Settings size={16} /> 설정
      </button>
    </aside>
  )
}

function SectionLabel({ label, onAdd }: { label: string; onAdd?: () => void }): JSX.Element {
  return (
    <div className="flex items-center justify-between px-2.5 pb-1 pt-1">
      <span className="text-label uppercase text-ink-dark-muted">{label}</span>
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
