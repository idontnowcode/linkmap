import { useState } from 'react'
import {
  CheckSquare,
  ExternalLink,
  FolderPlus,
  MoreVertical,
  Pencil,
  RotateCcw,
  Search,
  Trash2
} from 'lucide-react'
import type { LinkWithTags } from '@shared/types'
import { useVisibleLinks } from './useVisibleLinks'
import { LinkCard } from './LinkCard'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { ContextMenu, type MenuItem } from '@/components/ui/ContextMenu'
import { openTarget } from '@/lib/openLink'

export function LinkListColumn(): JSX.Element {
  const { links, viewTitle } = useVisibleLinks()
  const activeView = useUiStore((s) => s.activeView)
  const openLinkForm = useUiStore((s) => s.openLinkForm)
  const openCollectionPicker = useUiStore((s) => s.openCollectionPicker)
  const trashLink = useAppStore((s) => s.trashLink)
  const restoreLink = useAppStore((s) => s.restoreLink)
  const deleteLink = useAppStore((s) => s.deleteLink)
  const bulkTrash = useAppStore((s) => s.bulkTrash)
  const bulkRestore = useAppStore((s) => s.bulkRestore)
  const bulkDelete = useAppStore((s) => s.bulkDelete)

  const isTrash = activeView.kind === 'smart' && activeView.id === 'trash'

  const [localQuery, setLocalQuery] = useState('')
  const [headerMenu, setHeaderMenu] = useState<{ x: number; y: number } | null>(null)
  const [linkMenu, setLinkMenu] = useState<{ x: number; y: number; link: LinkWithTags } | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = localQuery
    ? links.filter(
        (l) =>
          l.title.toLowerCase().includes(localQuery.toLowerCase()) ||
          l.url.toLowerCase().includes(localQuery.toLowerCase())
      )
    : links

  const toggleSelect = (id: string): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

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
      { label: '열기', icon: <ExternalLink size={14} />, onClick: () => openTarget(link.kind, link.url) },
      { label: '편집', icon: <Pencil size={14} />, onClick: () => openLinkForm(null, link.id) },
      { label: '컬렉션에 추가', icon: <FolderPlus size={14} />, onClick: () => openCollectionPicker(link.id) }
    ]
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
            onToggleSelect={toggleSelect}
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
              label: '항목 선택 (일괄 삭제)',
              icon: <CheckSquare size={14} />,
              onClick: () => setSelectMode(true)
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
