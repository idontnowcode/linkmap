import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { ChevronDown, HelpCircle, LayoutGrid, Search, SlidersHorizontal } from 'lucide-react'
import { useUiStore, type LayoutMode } from '@/store/uiStore'
import { GraphCanvas } from './GraphCanvas'
import { cn } from '@/lib/utils'

const LAYOUTS: { id: LayoutMode; label: string }[] = [
  { id: 'force', label: 'Force Directed' },
  { id: 'hierarchical', label: 'Hierarchical' },
  { id: 'radial', label: 'Radial' }
]

export function GraphPanel(): JSX.Element {
  const searchQuery = useUiStore((s) => s.searchQuery)
  const setSearch = useUiStore((s) => s.setSearch)
  const layout = useUiStore((s) => s.layout)
  const setLayout = useUiStore((s) => s.setLayout)
  const [layoutOpen, setLayoutOpen] = useState(false)

  return (
    <section className="flex h-full flex-col bg-canvas">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-line bg-list px-3">
          <Search size={15} className="text-ink-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="링크, 태그, 메모 검색 (예: openai, tag:AI)"
            className="h-full w-full bg-transparent text-body text-ink-strong outline-none placeholder:text-ink-muted"
          />
        </div>

        <ToolbarButton icon={<SlidersHorizontal size={15} />} label="필터" />

        <div className="relative">
          <ToolbarButton
            icon={<LayoutGrid size={15} />}
            label={LAYOUTS.find((l) => l.id === layout)?.label ?? '레이아웃'}
            chevron
            onClick={() => setLayoutOpen((v) => !v)}
          />
          {layoutOpen && (
            <div
              className="absolute right-0 top-10 z-20 w-44 rounded-md border border-line bg-white py-1 shadow-pop"
              onMouseLeave={() => setLayoutOpen(false)}
            >
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setLayout(l.id)
                    setLayoutOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center px-3 py-1.5 text-body hover:bg-list',
                    layout === l.id ? 'font-semibold text-brand' : 'text-ink-strong'
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="rounded-md p-2 text-ink-muted hover:bg-list" title="도움말">
          <HelpCircle size={16} />
        </button>
      </div>

      {/* Canvas */}
      <div className="relative flex-1">
        <ReactFlowProvider>
          <GraphCanvas />
        </ReactFlowProvider>
      </div>
    </section>
  )
}

function ToolbarButton({
  icon,
  label,
  chevron,
  onClick
}: {
  icon: React.ReactNode
  label: string
  chevron?: boolean
  onClick?: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-body text-ink-strong hover:bg-list"
    >
      {icon}
      {label}
      {chevron && <ChevronDown size={14} className="text-ink-muted" />}
    </button>
  )
}
