import { Network, Star, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useUiStore, type DetailTab } from '@/store/uiStore'
import { Favicon } from '@/features/links/LinkCard'
import { cn } from '@/lib/utils'
import { DetailsTab } from './DetailsTab'
import { RelationsTab } from './RelationsTab'
import { NotesTab } from './NotesTab'
import { PreviewTab } from './PreviewTab'

export function DetailPanel(): JSX.Element {
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
  const selectedKind = useUiStore((s) => s.selectedKind)
  const activeTab = useUiStore((s) => s.activeTab)
  const setTab = useUiStore((s) => s.setTab)
  const selectNode = useUiStore((s) => s.selectNode)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const link = useAppStore((s) =>
    s.snapshot.links.find((l) => l.id === selectedNodeId)
  )
  const relations = useAppStore((s) => s.snapshot.relations)

  if (!selectedNodeId || selectedKind !== 'link' || !link) {
    return (
      <aside className="flex h-full flex-col items-center justify-center border-l border-line bg-white px-6 text-center">
        <Network size={32} className="mb-3 text-ink-muted/40" />
        <p className="text-body text-ink-muted">
          {selectedNodeId && selectedKind !== 'link'
            ? '태그/컬렉션 노드입니다.\n링크 노드를 선택하면 상세가 표시됩니다.'
            : '노드를 선택하면\n상세 정보가 표시됩니다.'}
        </p>
      </aside>
    )
  }

  const relCount = relations.filter(
    (r) => r.sourceId === link.id || r.targetId === link.id
  ).length

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'details', label: '상세 정보' },
    { id: 'relations', label: `관계 (${relCount})` },
    { id: 'notes', label: '메모' },
    { id: 'preview', label: '미리보기' }
  ]

  return (
    <aside className="flex h-full flex-col border-l border-line bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-4">
        <Favicon link={link} size={22} />
        <h2 className="flex-1 truncate text-h text-ink-strong">{link.title}</h2>
        <button onClick={() => void toggleFavorite(link.id)} title="즐겨찾기">
          <Star size={17} className={link.favorite ? 'fill-brand text-brand' : 'text-ink-muted/50'} />
        </button>
        <button onClick={() => selectNode(null)} className="text-ink-muted hover:text-ink-strong">
          <X size={17} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative px-2.5 py-2 text-sm transition-colors',
              activeTab === t.id ? 'font-semibold text-ink-strong' : 'text-ink-muted hover:text-ink-strong'
            )}
          >
            {t.label}
            {activeTab === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
            )}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && <DetailsTab link={link} />}
        {activeTab === 'relations' && <RelationsTab link={link} />}
        {activeTab === 'notes' && <NotesTab link={link} />}
        {activeTab === 'preview' && <PreviewTab link={link} />}
      </div>
    </aside>
  )
}
