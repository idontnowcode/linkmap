import { useState } from 'react'
import {
  ArrowDownAZ,
  CheckSquare,
  Clock,
  ExternalLink,
  FolderMinus,
  Minus,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X
} from 'lucide-react'
import type { LinkWithTags } from '@shared/types'
import { useVisibleLinks } from './useVisibleLinks'
import { LinkCard } from './LinkCard'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { ContextMenu, type MenuItem } from '@/components/ui/ContextMenu'
import { openTarget } from '@/lib/openLink'

export function LinkListColumn(): JSX.Element {
  const { links, viewTitle } = useVisibleLinks()
  const activeView = useUiStore((s) => s.activeView)
  const openLinkForm = useUiStore((s) => s.openLinkForm)
  const searchQuery = useUiStore((s) => s.searchQuery)
  const setSearch = useUiStore((s) => s.setSearch)
  const savedFilters = useSettingsStore((s) => s.savedFilters)
  const addSavedFilter = useSettingsStore((s) => s.addSavedFilter)
  const removeSavedFilter = useSettingsStore((s) => s.removeSavedFilter)
  const trashLink = useAppStore((s) => s.trashLink)
  const restoreLink = useAppStore((s) => s.restoreLink)
  const deleteLink = useAppStore((s) => s.deleteLink)
  const bulkTrash = useAppStore((s) => s.bulkTrash)
  const bulkRestore = useAppStore((s) => s.bulkRestore)
  const bulkDelete = useAppStore((s) => s.bulkDelete)
  const removeTagFromLink = useAppStore((s) => s.removeTagFromLink)
  const removeLinkFromCollection = useAppStore((s) => s.removeLinkFromCollection)
  const bulkRemoveTag = useAppStore((s) => s.bulkRemoveTag)
  const bulkRemoveFromCollection = useAppStore((s) => s.bulkRemoveFromCollection)

  const isTrash = activeView.kind === 'smart' && activeView.id === 'trash'
  const contextTagId = activeView.kind === 'tag' ? activeView.id : null
  const contextColId = activeView.kind === 'collection' ? activeView.id : null

  const [sortBy, setSortBy] = useState<'default' | 'name' | 'recent'>('default')
  const [anchor, setAnchor] = useState<string | null>(null)
  const [headerMenu, setHeaderMenu] = useState<{ x: number; y: number } | null>(null)
  const [linkMenu, setLinkMenu] = useState<{ x: number; y: number; link: LinkWithTags } | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)

  // links는 useVisibleLinks()가 이미 uiStore.searchQuery(tag:/url:/memo: 필드 검색,
  // 콤마=OR)를 적용해 반환한다 — 여기서는 정렬만 얹는다.
  const filtered = [...links].sort((a, b) => {
    if (sortBy === 'name') return a.title.localeCompare(b.title)
    if (sortBy === 'recent') return b.createdAt - a.createdAt
    return 0
  })

  const saveCurrentFilter = (): void => {
    const q = searchQuery.trim()
    if (!q) return
    const name = prompt('필터 이름을 입력하세요', q.slice(0, 24))
    if (name && name.trim()) addSavedFilter(name.trim(), q)
  }

  const toggleSelect = (id: string): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Ctrl/Cmd = 토글, Shift = 앵커부터 범위 선택
  const onModClick = (e: React.MouseEvent, id: string): void => {
    if (!selectMode) setSelectMode(true)
    if (e.shiftKey && anchor) {
      const ids = filtered.map((l) => l.id)
      const i0 = ids.indexOf(anchor)
      const i1 = ids.indexOf(id)
      if (i0 >= 0 && i1 >= 0) {
        const [a, b] = i0 < i1 ? [i0, i1] : [i1, i0]
        setSelected((prev) => {
          const n = new Set(prev)
          for (let i = a; i <= b; i++) n.add(ids[i])
          return n
        })
      }
    } else {
      toggleSelect(id)
      setAnchor(id)
    }
  }

  const excludeOne = (link: LinkWithTags): void => {
    if (contextTagId) void removeTagFromLink(link.id, contextTagId)
    else if (contextColId) void removeLinkFromCollection(contextColId, link.id)
  }
  const bulkExclude = async (): Promise<void> => {
    const ids = [...selected]
    if (!ids.length) return
    if (contextTagId) await bulkRemoveTag(ids, contextTagId)
    else if (contextColId) await bulkRemoveFromCollection(ids, contextColId)
    exitSelect()
  }

  const allChecked = filtered.length > 0 && filtered.every((l) => selected.has(l.id))
  const toggleAll = (): void =>
    setSelected(allChecked ? new Set() : new Set(filtered.map((l) => l.id)))

  const exitSelect = (): void => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const runBulk = async (fn: (ids: string[]) => Promise<void>, confirmMsg?: string): Promise<void> => {
    const ids = [...selected]
    if (!ids.length) return
    if (confirmMsg && !confirm(confirmMsg)) return
    await fn(ids)
    exitSelect()
  }

  const emptyTrash = async (): Promise<void> => {
    if (!links.length) return
    if (!confirm(`휴지통의 ${links.length}개 항목을 영구 삭제할까요? 되돌릴 수 없습니다.`)) return
    await bulkDelete(links.map((l) => l.id))
  }

  const linkMenuItems = (link: LinkWithTags): MenuItem[] => {
    const items: MenuItem[] = [
      { label: '열기', icon: <ExternalLink size={14} />, onClick: () => openTarget(link.kind, link.url, link.id) },
      { label: '편집', icon: <Pencil size={14} />, onClick: () => openLinkForm(null, link.id) }
    ]
    if (contextTagId) {
      items.push({ label: '이 태그에서 제외', icon: <Minus size={14} />, onClick: () => excludeOne(link) })
    }
    if (isTrash) {
      items.push({ label: '복원', icon: <RotateCcw size={14} />, onClick: () => void restoreLink(link.id) })
      items.push({
        label: '영구 삭제',
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: () => {
          if (confirm(`'${link.title}'을(를) 영구 삭제할까요? 되돌릴 수 없습니다.`)) void deleteLink(link.id)
        }
      })
    } else {
      items.push({ label: '휴지통으로', icon: <Trash2 size={14} />, danger: true, onClick: () => void trashLink(link.id) })
    }
    return items
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border-r border-line bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-node" />
            <h1 className="text-h text-ink-strong">{viewTitle}</h1>
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">{links.length}개 링크</p>
        </div>
        <div className="flex items-center gap-1">
          {isTrash && !selectMode && links.length > 0 && (
            <button
              onClick={() => void emptyTrash()}
              className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} /> 비우기
            </button>
          )}
          {selectMode ? (
            <button onClick={exitSelect} className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-list">
              취소
            </button>
          ) : (
            <button
              onClick={(e) => setHeaderMenu({ x: e.clientX, y: e.clientY })}
              className="rounded-sm p-1 text-ink-muted hover:bg-list"
              title="메뉴"
            >
              <MoreVertical size={16} />
            </button>
          )}
        </div>
      </div>

      {/* In-context search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 flex-1 items-center gap-2 rounded-md border border-line bg-list px-2.5">
            <Search size={14} className="text-ink-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색 · 공백=AND, ,=OR · tag:/url:/memo:"
              className="h-full w-full bg-transparent text-body text-ink-strong outline-none placeholder:text-ink-muted"
            />
            {searchQuery && (
              <button onClick={() => setSearch('')} className="text-ink-muted hover:text-ink-strong" title="지우기">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="flex h-8 items-center gap-1 rounded-md border border-line px-2 text-ink-muted hover:bg-list hover:text-ink-strong"
              title="저장된 필터"
            >
              <SlidersHorizontal size={14} />
            </button>
            {filterOpen && (
              <div
                className="absolute right-0 top-9 z-20 w-64 rounded-md border border-line bg-white py-1 shadow-pop"
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
                      saveCurrentFilter()
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
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <div className="flex items-center gap-2 border-y border-line bg-list px-3 py-2">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="h-4 w-4 accent-brand"
            title="모두 선택"
          />
          <span className="text-sm text-ink-muted">{selected.size}개 선택</span>
          <div className="ml-auto flex gap-1.5">
            {(contextTagId || contextColId) && (
              <button
                onClick={() => void bulkExclude()}
                disabled={!selected.size}
                className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-sm text-ink-strong hover:bg-white disabled:opacity-40"
              >
                {contextTagId ? <Minus size={13} /> : <FolderMinus size={13} />}
                {contextTagId ? '태그에서 제외' : '폴더에서 제외'}
              </button>
            )}
            {isTrash ? (
              <>
                <button
                  onClick={() => void runBulk(bulkRestore)}
                  disabled={!selected.size}
                  className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-sm text-ink-strong hover:bg-white disabled:opacity-40"
                >
                  <RotateCcw size={13} /> 복원
                </button>
                <button
                  onClick={() => void runBulk(bulkDelete, `선택한 ${selected.size}개를 영구 삭제할까요? 되돌릴 수 없습니다.`)}
                  disabled={!selected.size}
                  className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 size={13} /> 영구 삭제
                </button>
              </>
            ) : (
              <button
                onClick={() => void runBulk(bulkTrash)}
                disabled={!selected.size}
                className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 size={13} /> 휴지통으로
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((l) => (
          <LinkCard
            key={l.id}
            link={l}
            selectMode={selectMode}
            checked={selected.has(l.id)}
            selectedIds={[...selected]}
            onToggleSelect={toggleSelect}
            onModClick={onModClick}
            onContextMenu={(e, link) => {
              e.preventDefault()
              e.stopPropagation()
              setLinkMenu({ x: e.clientX, y: e.clientY, link })
            }}
          />
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-body text-ink-muted">표시할 링크가 없습니다</p>
        )}
      </div>

      {headerMenu && (
        <ContextMenu
          x={headerMenu.x}
          y={headerMenu.y}
          onClose={() => setHeaderMenu(null)}
          items={[
            {
              label: '항목 선택 (일괄)',
              icon: <CheckSquare size={14} />,
              onClick: () => setSelectMode(true)
            },
            {
              label: `이름순 정렬${sortBy === 'name' ? ' ✓' : ''}`,
              icon: <ArrowDownAZ size={14} />,
              onClick: () => setSortBy('name')
            },
            {
              label: `최근순 정렬${sortBy === 'recent' ? ' ✓' : ''}`,
              icon: <Clock size={14} />,
              onClick: () => setSortBy('recent')
            },
            {
              label: `기본 순서${sortBy === 'default' ? ' ✓' : ''}`,
              onClick: () => setSortBy('default')
            }
          ]}
        />
      )}
      {linkMenu && (
        <ContextMenu
          x={linkMenu.x}
          y={linkMenu.y}
          onClose={() => setLinkMenu(null)}
          items={linkMenuItems(linkMenu.link)}
        />
      )}
    </section>
  )
}
