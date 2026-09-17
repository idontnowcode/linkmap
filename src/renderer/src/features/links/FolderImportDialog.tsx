// 폴더 가져오기(P3) — 신규 버전(Linkmap)의 FolderImportDialog.tsx UX를 참고해 기존 UI
// 프리미티브(Modal/Button/Input)로 재작성. 컬렉션(트리)을 대체하지 않는 "추가" 기능 —
// 폴더를 골라 그 안의 파일들(재귀, 최대 3000개)을 체크박스로 선택해 링크로 저장하고,
// 폴더명을 딴 태그(source_path 보유)로 묶는다. 이후 LeftRail의 동기화 버튼으로 재사용.
//
// 2026-09-17: 평면 목록 → 트리 UI로 개편. 기본 전체 선택(선택 해제 방식)으로 바꾸고,
// 3단계 아래(depth>=3인 폴더)는 기본 접힘 — 폴더가 큰 경우 첫 화면이 너무 길어지는 걸 막는다.
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import type { FolderEntry } from '@shared/ipc'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { buildTree, collectFilePaths, type TreeNode } from './folderTree'

export function FolderImportDialog(): JSX.Element {
  const open = useUiStore((s) => s.folderImportOpen)
  const close = useUiStore((s) => s.closeFolderImport)
  const refresh = useAppStore((s) => s.refresh)

  const [root, setRoot] = useState<string | null>(null)
  const [entries, setEntries] = useState<FolderEntry[]>([])
  const [truncated, setTruncated] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [extTags, setExtTags] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; alreadyLinked: number } | null>(null)

  const tree = useMemo(() => buildTree(entries), [entries])
  const allFilePaths = useMemo(() => entries.filter((e) => !e.isDirectory).map((e) => e.relativePath), [entries])

  const reset = (): void => {
    setRoot(null)
    setEntries([])
    setTruncated(false)
    setSelected(new Set())
    setCollapsed(new Set())
    setExtTags(false)
    setError(null)
    setResult(null)
  }

  const handleClose = (): void => {
    if (importing) return
    reset()
    close()
  }

  const pickFolder = async (): Promise<void> => {
    const paths = await window.api.pickPaths('folder')
    const rootPath = paths[0]
    if (!rootPath) return
    setLoading(true)
    setError(null)
    try {
      const res = await window.api.folderList(rootPath)
      setRoot(res.root)
      setEntries(res.entries)
      setTruncated(res.truncated)
      // 기본 전체 선택(옵트아웃) — 체크 해제한 것만 안 만든다.
      setSelected(new Set(res.entries.filter((e) => !e.isDirectory).map((e) => e.relativePath)))
      // 3단계까지는 펼치고, 그 아래(depth>=3인 폴더)는 접어둔다.
      setCollapsed(new Set(res.entries.filter((e) => e.isDirectory && e.depth >= 3).map((e) => e.relativePath)))
    } catch {
      setError('폴더를 읽지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleFile = (relativePath: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(relativePath)) next.delete(relativePath)
      else next.add(relativePath)
      return next
    })
  }

  const toggleFolder = (node: TreeNode): void => {
    const paths: string[] = []
    collectFilePaths(node, paths)
    const allSelected = paths.every((p) => selected.has(p))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const p of paths) (allSelected ? next.delete(p) : next.add(p))
      return next
    })
  }

  const toggleAll = (): void => {
    setSelected((prev) => (prev.size === allFilePaths.length ? new Set() : new Set(allFilePaths)))
  }

  const toggleCollapse = (relativePath: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(relativePath)) next.delete(relativePath)
      else next.add(relativePath)
      return next
    })
  }

  const handleImport = async (): Promise<void> => {
    if (!root || selected.size === 0 || importing) return
    setImporting(true)
    setError(null)
    try {
      const res = await window.api.folderImport(root, [...selected], extTags)
      await refresh()
      setResult({ created: res.created, alreadyLinked: res.alreadyLinked })
    } catch {
      setError('가져오기에 실패했습니다.')
    } finally {
      setImporting(false)
    }
  }

  const renderNode = (node: TreeNode): JSX.Element => {
    const { entry } = node
    if (!entry.isDirectory) {
      return (
        <label
          key={entry.relativePath}
          style={{ paddingLeft: 10 + entry.depth * 16 }}
          className="flex cursor-pointer items-center gap-1.5 py-1 pr-2 text-sm hover:bg-list"
        >
          <input
            type="checkbox"
            checked={selected.has(entry.relativePath)}
            onChange={() => toggleFile(entry.relativePath)}
          />
          <File size={13} className="shrink-0 text-ink-muted" />
          <span className="truncate text-ink-strong">{entry.relativePath.split(/[\\/]/).pop()}</span>
        </label>
      )
    }

    const filePaths: string[] = []
    collectFilePaths(node, filePaths)
    const selectedCount = filePaths.filter((p) => selected.has(p)).length
    const state: 'all' | 'none' | 'some' =
      filePaths.length === 0 || selectedCount === 0 ? 'none' : selectedCount === filePaths.length ? 'all' : 'some'
    const isCollapsed = collapsed.has(entry.relativePath)

    return (
      <div key={entry.relativePath}>
        <div
          style={{ paddingLeft: 10 + entry.depth * 16 }}
          className="flex items-center gap-1.5 py-1 pr-2 text-sm hover:bg-list"
        >
          <button
            type="button"
            onClick={() => toggleCollapse(entry.relativePath)}
            className="shrink-0 text-ink-muted hover:text-ink-strong"
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          <input
            type="checkbox"
            checked={state === 'all'}
            ref={(el) => el && (el.indeterminate = state === 'some')}
            onChange={() => toggleFolder(node)}
          />
          <Folder size={13} className="shrink-0 text-ink-muted" />
          <button
            type="button"
            onClick={() => toggleCollapse(entry.relativePath)}
            className="truncate text-left font-medium text-ink-strong"
          >
            {entry.relativePath.split(/[\\/]/).pop()}
          </button>
          <span className="ml-auto shrink-0 text-xs text-ink-muted">
            {selectedCount}/{filePaths.length}
          </span>
        </div>
        {!isCollapsed && node.children.map((c) => renderNode(c))}
      </div>
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="폴더 가져오기"
      width={560}
      footer={
        result ? (
          <Button onClick={handleClose}>닫기</Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose} disabled={importing}>
              취소
            </Button>
            {root && (
              <Button onClick={() => void handleImport()} disabled={selected.size === 0 || importing}>
                {importing ? '가져오는 중…' : `${selected.size}개 가져오기`}
              </Button>
            )}
          </>
        )
      }
    >
      {result ? (
        <p className="text-body text-ink-strong">
          새 링크 {result.created}개 생성, 기존 링크 {result.alreadyLinked}개 재사용 — 폴더명 태그로
          묶었습니다.
        </p>
      ) : !root ? (
        <div>
          <p className="mb-3 text-sm text-ink-muted">
            폴더를 선택하면 안의 파일들(하위 폴더 포함, 최대 3000개)이 트리로 표시됩니다. 기본적으로
            전체 선택된 상태이며, 체크 해제한 항목은 링크로 만들지 않습니다. 폴더 이름을 딴 태그로
            묶고, 이후 태그 옆의 동기화 버튼으로 변경 사항을 다시 확인할 수 있습니다.
          </p>
          <Button block onClick={() => void pickFolder()} disabled={loading}>
            {loading ? '읽는 중…' : '폴더 선택'}
          </Button>
        </div>
      ) : (
        <div>
          <p className="mb-2 overflow-wrap-anywhere text-sm text-ink-muted">
            {root}
            {truncated && ' — 파일이 너무 많아 일부만 표시합니다.'}
          </p>
          {entries.length === 0 ? (
            <p className="text-sm text-ink-muted">이 폴더에는 파일이 없습니다.</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="rounded-sm px-2 py-1 text-sm text-ink-muted hover:bg-list hover:text-ink-strong"
                >
                  {selected.size === allFilePaths.length ? '전체 해제' : '전체 선택'}
                </button>
                <label className="flex cursor-pointer items-center gap-1.5 pr-1 text-sm text-ink-muted">
                  <input type="checkbox" checked={extTags} onChange={(e) => setExtTags(e.target.checked)} />
                  확장자별 보조 태그 자동 추가
                </label>
              </div>
              <div
                className={cn(
                  'max-h-80 overflow-y-auto rounded-md border border-line py-1',
                  loading && 'opacity-50'
                )}
              >
                {tree.map((n) => renderNode(n))}
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  )
}
