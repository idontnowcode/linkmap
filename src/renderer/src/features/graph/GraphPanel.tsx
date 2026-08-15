import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import {
  ChevronDown,
  HelpCircle,
  LayoutGrid,
  Plus,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react'
import { useUiStore, type LayoutMode } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
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
  const savedFilters = useSettingsStore((s) => s.savedFilters)
  const addSavedFilter = useSettingsStore((s) => s.addSavedFilter)
  const removeSavedFilter = useSettingsStore((s) => s.removeSavedFilter)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const saveCurrent = (): void => {
    const q = searchQuery.trim()
    if (!q) return
    const name = prompt('필터 이름을 입력하세요', q.slice(0, 24))
    if (name && name.trim()) addSavedFilter(name.trim(), q)
  }

  return (
    <section className="flex h-full flex-col bg-canvas">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-line bg-list px-3">
          <Search size={15} className="text-ink-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색 · 공백=모두 포함(AND), ,=OR · 예: MCU datasheet / tag:MCU, tag:RTOS"
            className="h-full w-full bg-transparent text-body text-ink-strong outline-none placeholder:text-ink-muted"
          />
          {searchQuery && (
            <button onClick={() => setSearch('')} className="text-ink-muted hover:text-ink-strong" title="지우기">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <ToolbarButton
            icon={<SlidersHorizontal size={15} />}
            label="필터"
            chevron
            onClick={() => setFilterOpen((v) => !v)}
          />
          {filterOpen && (
            <div
              className="absolute right-0 top-10 z-20 w-64 rounded-md border border-line bg-white py-1 shadow-pop"
              onMouseLeave={() => setFilterOpen(false)}
            >
              <div className="px-3 py-1 text-label uppercase text-ink-muted">저장된 필터</div>
              {savedFilters.length === 0 && (
                <p className="px-3 py-2 text-sm text-ink-muted">저장된 필터가 없습니다</p>
              )}
              {savedFilters.map((f) => (
                <div key={f.id} className="group/f flex items-center hover:bg-list">
                  <button
                    onClick={() => {
                      setSearch(f.query)
                      setFilterOpen(false)
                    }}
                    className="min-w-0 flex-1 px-3 py-1.5 text-left"
                  >
                    <div className="truncate text-body text-ink-strong">{f.name}</div>
                    <div className="truncate text-sm text-ink-muted">{f.query}</div>
                  </button>
                  <button
                    onClick={() => removeSavedFilter(f.id)}
                    className="px-2 text-ink-muted opacity-0 hover:text-red-600 group-hover/f:opacity-100"
                    title="삭제"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="mt-1 border-t border-line pt-1">
                <button
                  onClick={() => {
                    saveCurrent()
                    setFilterOpen(false)
                  }}
                  disabled={!searchQuery.trim()}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-body text-brand hover:bg-list disabled:opacity-40"
                >
                  <Plus size={14} /> 현재 검색을 필터로 저장
                </button>
              </div>
            </div>
          )}
        </div>

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

        <div className="relative">
          <button
            onClick={() => setHelpOpen((v) => !v)}
            className="rounded-md p-2 text-ink-muted hover:bg-list"
            title="도움말"
          >
            <HelpCircle size={16} />
          </button>
          {helpOpen && (
            <div
              className="absolute right-0 top-10 z-20 w-72 rounded-md border border-line bg-white p-3 text-body shadow-pop"
              onMouseLeave={() => setHelpOpen(false)}
            >
              <p className="mb-1 text-label uppercase text-ink-muted">검색 문법</p>
              <ul className="mb-3 space-y-0.5 text-sm text-ink-strong">
                <li>
                  <code className="rounded bg-list px-1">단어1 단어2</code> 공백=모두 포함(AND)
                </li>
                <li>
                  <code className="rounded bg-list px-1">A, B</code> 콤마=둘 중 하나(OR)
                </li>
                <li>
                  <code className="rounded bg-list px-1">&quot;정확한 구절&quot;</code> 따옴표 구절 검색
                </li>
                <li>
                  <code className="rounded bg-list px-1">tag:</code>/<code className="rounded bg-list px-1">url:</code>/<code className="rounded bg-list px-1">memo:</code> 필드 검색
                </li>
              </ul>
              <p className="mb-1 text-label uppercase text-ink-muted">그래프 조작</p>
              <ul className="mb-3 space-y-0.5 text-sm text-ink-strong">
                <li>더블클릭: 링크/파일/폴더 열기</li>
                <li>우클릭: 관계 추가·편집·삭제 메뉴</li>
                <li>노드 hover 후 드래그: 관계 생성</li>
              </ul>
              <p className="mb-1 text-label uppercase text-ink-muted">단축키</p>
              <ul className="space-y-0.5 text-sm text-ink-strong">
                <li>Ctrl/Cmd+N: 새 링크 추가</li>
                <li>Esc: 선택 해제</li>
              </ul>
            </div>
          )}
        </div>
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
