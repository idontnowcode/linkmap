// 폴더 동기화 범위 편집(P2) — FolderImportDialog와 같은 트리+체크박스 UI를 재사용하되,
// 가져오기 이후에 "이 하위 폴더/파일은 앞으로 동기화 대상에서 빼고 싶다"를 편집하는 용도.
// 체크 의미는 FolderImportDialog와 동일하게 "포함"(checked = 동기화 대상). 저장 시 체크
// 해제된 범위만 최소 경로 집합으로 계산해 folder_sync_exclusions에 반영한다 — 여기서는
// 실제 동기화(추가/삭제 반영)를 하지 않고 "다음 동기화부터 무엇을 볼지"만 저장한다.
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import type { FolderEntry } from '@shared/ipc'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { buildTree, collectFilePaths, computeExcludedPaths, isPathExcluded, type TreeNode } from './folderTree'

export function FolderSyncExclusionDialog(): JSX.Element {
  const tagId = useUiStore((s) => s.folderExclusionTagId)
  const close = useUiStore((s) => s.closeFolderExclusion)
  const tag = useAppStore((s) => s.snapshot.tags.find((t) => t.id === tagId))

  const [entries, setEntries] = useState<FolderEntry[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const tree = useMemo(() => buildTree(entries), [entries])
  const allFilePaths = useMemo(() => entries.filter((e) => !e.isDirectory).map((e) => e.relativePath), [entries])

  useEffect(() => {
    if (!tagId || !tag?.sourcePath) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setSaved(false)
    Promise.all([window.api.folderList(tag.sourcePath), window.api.folderExclusionsGet(tagId)])
      .then(([list, excludedList]) => {
        if (cancelled) return
        const excludedSet = new Set(excludedList)
        setEntries(list.entries)
        setSelected(
          new Set(
            list.entries
              .filter((e) => !e.isDirectory && !isPathExcluded(e.relativePath, excludedSet))
              .map((e) => e.relativePath)
          )
        )
        setCollapsed(new Set(list.entries.filter((e) => e.isDirectory && e.depth >= 3).map((e) => e.relativePath)))
      })
      .catch(() => !cancelled && setError('폴더 정보를 불러오지 못했습니다.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId])

  const handleClose = (): void => {
    if (saving) return
    close()
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

  const toggleCollapse = (relativePath: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(relativePath)) next.delete(relativePath)
      else next.add(relativePath)
      return next
    })
  }

  const handleSave = async (): Promise<void> => {
    if (!tagId || saving) return
    setSaving(true)
    setError(null)
    try {
      const excluded = computeExcludedPaths(tree, selected)
      await window.api.folderExclusionsSet(tagId, excluded)
      setSaved(true)
    } catch {
      setError('저장하지 못했습니다.')
    } finally {
      setSaving(false)
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
          <input type="checkbox" checked={selected.has(entry.relativePath)} onChange={() => toggleFile(entry.relativePath)} />
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
        <div style={{ paddingLeft: 10 + entry.depth * 16 }} className="flex items-center gap-1.5 py-1 pr-2 text-sm hover:bg-list">
          <button type="button" onClick={() => toggleCollapse(entry.relativePath)} className="shrink-0 text-ink-muted hover:text-ink-strong">
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          <input
            type="checkbox"
            checked={state === 'all'}
            ref={(el) => el && (el.indeterminate = state === 'some')}
            onChange={() => toggleFolder(node)}
          />
          <Folder size={13} className="shrink-0 text-ink-muted" />
          <button type="button" onClick={() => toggleCollapse(entry.relativePath)} className="truncate text-left font-medium text-ink-strong">
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
      open={!!tagId}
      onClose={handleClose}
      title={`동기화 범위 편집 — ${tag?.name ?? ''}`}
      width={560}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            닫기
          </Button>
          <Button onClick={() => void handleSave()} disabled={loading || saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-ink-muted">
        체크 해제한 파일·폴더는 다음 동기화부터 제외됩니다(이미 가져온 항목은 다음 🔄 동기화 시
        "더 이상 없음"으로 표시되어 휴지통으로 이동합니다). 저장만으로는 아무것도 바로 반영되지
        않습니다.
      </p>
      {loading && <p className="text-sm text-ink-muted">불러오는 중…</p>}
      {!loading && entries.length > 0 && (
        <div className="max-h-96 overflow-y-auto rounded-md border border-line py-1">
          {tree.map((n) => renderNode(n))}
        </div>
      )}
      {!loading && entries.length === 0 && !error && <p className="text-sm text-ink-muted">이 폴더에는 파일이 없습니다.</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="mt-3 text-sm text-green-600">저장했습니다 — {allFilePaths.length - selected.size}개 제외 중.</p>}
    </Modal>
  )
}
