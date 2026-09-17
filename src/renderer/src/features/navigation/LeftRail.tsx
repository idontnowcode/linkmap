import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  FolderInput,
  Link2,
  ListFilter,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  Star,
  StickyNote,
  Trash2
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useUiStore, type ActiveView } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { buildTagTree, isHiddenByCollapse, leafNameOf } from './tagTree'

// 컬렉션(폴더) 기능은 UI에서만 비활성화했다 — 사용자가 태그/컬렉션을 이중으로 관리할
// 시간이 없다고 판단해(2026-09-15) 태그 하나로만 정리하기로 함. 데이터·IPC·스토어
// 액션(collections, deleteCollection, moveCollection, bulkAddToCollection 등)과
// features/collections/, features/graph/nodes/CollectionNode.tsx는 그대로 남겨뒀다 —
// 이 레일에서 진입점(폴더 트리, "컬렉션에 추가" 메뉴)만 없앤 것이라 재활성화가 쉽다.
//
// 폴더 가져오기로 생긴 태그(sourcePath 보유)는 2026-09-17부터 "폴더" 섹션으로 완전히
// 분리했다 — 아이콘 하나로 구분하는 걸로는 부족하다는 피드백. 여전히 데이터상으로는
// 그냥 태그이고(tags 테이블 그대로), 화면에 두 그룹으로 나눠 보여주기만 한다.
function sameView(a: ActiveView, b: ActiveView): boolean {
  return a.kind === b.kind && a.id === b.id
}

type RailMenu = { x: number; y: number; kind: 'tag'; id: string; name: string }

export function LeftRail(): JSX.Element {
  const tags = useAppStore((s) => s.snapshot.tags)
  const counts = useAppStore((s) => s.counts)
  const deleteTag = useAppStore((s) => s.deleteTag)
  const bulkAddTag = useAppStore((s) => s.bulkAddTag)
  const activeView = useUiStore((s) => s.activeView)
  const setView = useUiStore((s) => s.setView)
  const openLinkForm = useUiStore((s) => s.openLinkForm)
  const openTagForm = useUiStore((s) => s.openTagForm)
  const openSettings = useUiStore((s) => s.openSettings)
  const openFolderImport = useUiStore((s) => s.openFolderImport)
  const openFolderSync = useUiStore((s) => s.openFolderSync)
  const openFolderExclusion = useUiStore((s) => s.openFolderExclusion)

  const [menu, setMenu] = useState<RailMenu | null>(null)
  const [tagsCollapsed, setTagsCollapsed] = useState(false)
  const [foldersCollapsed, setFoldersCollapsed] = useState(false)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [tagNodesCollapsed, setTagNodesCollapsed] = useState<Set<string>>(new Set())

  // onDragLeave 하나로는 못 막는 경우(드래그 중 Esc, 창 밖으로 나갔다 놓임 등)까지 포함해
  // 드래그가 어떻게 끝나든 dropTarget이 확실히 풀리도록 하는 안전망.
  useEffect(() => {
    const clear = (): void => setDropTarget(null)
    window.addEventListener('dragend', clear)
    window.addEventListener('drop', clear)
    return () => {
      window.removeEventListener('dragend', clear)
      window.removeEventListener('drop', clear)
    }
  }, [])

  const folderTags = useMemo(() => tags.filter((t) => t.sourcePath), [tags])
  const regularTags = useMemo(() => tags.filter((t) => !t.sourcePath), [tags])
  const folderTagTree = useMemo(() => buildTagTree(folderTags), [folderTags])
  const tagTree = useMemo(() => buildTagTree(regularTags), [regularTags])
  const toggleTagNodeCollapse = (id: string): void =>
    setTagNodesCollapsed((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const removeItem = (m: RailMenu): void => {
    if (!confirm(`'${m.name}' 태그를 삭제할까요? (링크 자체는 보존)`)) return
    void deleteTag(m.id)
    if (sameView(activeView, { kind: 'tag', id: m.id })) setView({ kind: 'smart', id: 'all' })
  }

  // 드롭된 링크 id들(다중 선택 지원). 구버전 단일 id도 허용.
  const getLinkIds = (e: React.DragEvent): string[] => {
    const raw = e.dataTransfer.getData('application/x-linkmap-link')
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : [raw]
    } catch {
      return [raw]
    }
  }

  // "폴더" 섹션(폴더 가져오기로 생긴 태그)과 "태그" 섹션(그 외 일반 태그) 둘 다 같은 행
  // 모양을 쓴다 — 태그 트리 렌더링을 한 곳에 모아 중복을 피한다. treeNodes는 그 섹션
  // 자신의 트리여야 한다(isHiddenByCollapse가 조상을 그 안에서 찾기 때문).
  const renderTagRow = (node: (typeof tagTree)[number], treeNodes: typeof tagTree): JSX.Element | null => {
    if (isHiddenByCollapse(node, treeNodes, tagNodesCollapsed)) return null
    const t = node.tag
    const active = sameView(activeView, { kind: 'tag', id: t.id })
    const isFolderTag = !!t.sourcePath
    const isCollapsed = tagNodesCollapsed.has(t.id)
    return (
      <div
        key={t.id}
        role="button"
        tabIndex={0}
        onClick={() => setView({ kind: 'tag', id: t.id })}
        onKeyDown={(e) => e.key === 'Enter' && setView({ kind: 'tag', id: t.id })}
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
        onDragLeave={(e) => {
          // 이 행 위를 그냥 지나쳐 다른 곳에 놓으면(=드롭 없이 벗어남)
          // dropTarget이 안 지워져 "클릭한 적 없는데 선택된 것처럼" 하이라이트가
          // 영구히 남던 버그 — 벗어날 때 반드시 초기화한다.
          if (dropTarget === t.id) setDropTarget(null)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const linkIds = getLinkIds(e)
          if (linkIds.length) void bulkAddTag(linkIds, t.id)
          setDropTarget(null)
        }}
        style={{ paddingLeft: 10 + node.depth * 14 }}
        className={cn(
          'group/tag flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2.5 text-body',
          dropTarget === t.id
            ? 'bg-brand/30 ring-1 ring-brand'
            : active
              ? 'bg-rail-active text-white'
              : 'text-ink-dark hover:bg-rail-hover'
        )}
      >
        {node.hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleTagNodeCollapse(t.id)
            }}
            className="shrink-0 text-ink-dark-muted hover:text-white"
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
        {isFolderTag && <Folder size={11} className="shrink-0 text-ink-dark-muted" aria-hidden="true" />}
        <span
          className="flex-1 truncate text-left"
          title={isFolderTag ? `동기화 폴더 · ${t.sourcePath}` : undefined}
        >
          {leafNameOf(node)}
        </span>
        {isFolderTag && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              openFolderExclusion(t.id)
            }}
            title="동기화 범위 편집 (제외할 파일·폴더 선택)"
            className="hidden shrink-0 text-ink-dark-muted hover:text-white group-hover/tag:block"
          >
            <ListFilter size={13} />
          </button>
        )}
        {isFolderTag && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              openFolderSync(t.id)
            }}
            title="폴더 동기화 (변경 사항 미리보기)"
            className="hidden shrink-0 text-ink-dark-muted hover:text-white group-hover/tag:block"
          >
            <RefreshCw size={13} />
          </button>
        )}
        <span className={cn('text-sm text-ink-dark-muted', isFolderTag && 'group-hover/tag:hidden')}>
          {counts.byTag[t.id] ?? 0}
        </span>
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
        {/* 레일을 아주 좁게 줄이면 두 버튼이 한 줄에 다 안 들어가 글자가 세로로 깨져 보였다
            — flex-wrap + min-width로 그 경우엔 통째로 다음 줄로 넘어가게(줄바꿈은 항상 버튼
            단위로만) 한다. */}
        <div className="flex flex-wrap gap-2">
          <Button block variant="secondary" className="min-w-[92px] flex-1" onClick={() => openLinkForm({ kind: 'note' })}>
            <StickyNote size={15} /> 새 메모
          </Button>
          <Button block variant="secondary" className="min-w-[92px] flex-1" onClick={() => openTagForm()}>
            <Plus size={15} /> 새 태그
          </Button>
        </div>
        <Button block variant="secondary" onClick={openFolderImport}>
          <FolderInput size={15} /> 폴더 가져오기
        </Button>
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

        {/* 폴더(동기화 대상) — 폴더 가져오기로 생긴 태그만 별도 분리 */}
        <div className="mb-4">
          <SectionLabel
            label="폴더"
            onAdd={openFolderImport}
            collapsed={foldersCollapsed}
            onToggle={() => setFoldersCollapsed((v) => !v)}
          />
          {!foldersCollapsed && (
            <div className="space-y-0.5">
              {folderTagTree.map((node) => renderTagRow(node, folderTagTree))}
              {folderTags.length === 0 && <Empty>가져온 폴더 없음</Empty>}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <SectionLabel
            label="태그"
            onAdd={() => openTagForm()}
            collapsed={tagsCollapsed}
            onToggle={() => setTagsCollapsed((v) => !v)}
          />
          {!tagsCollapsed && (
            <div className="space-y-0.5">
              {tagTree.map((node) => renderTagRow(node, tagTree))}
              {regularTags.length === 0 && <Empty>태그 없음</Empty>}
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
          items={[
            {
              label: '이름·색상 편집',
              icon: <Pencil size={14} />,
              onClick: () => openTagForm(menu.id)
            },
            {
              label: '태그 삭제',
              icon: <Trash2 size={14} />,
              danger: true,
              onClick: () => removeItem(menu)
            }
          ]}
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
