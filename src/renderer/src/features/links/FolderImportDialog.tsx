// 폴더 가져오기(P3) — 신규 버전(Linkmap)의 FolderImportDialog.tsx UX를 참고해 기존 UI
// 프리미티브(Modal/Button/Input)로 재작성. 컬렉션(트리)을 대체하지 않는 "추가" 기능 —
// 폴더를 골라 그 안의 파일들(재귀, 최대 3000개)을 체크박스로 선택해 링크로 저장하고,
// 폴더명을 딴 태그(source_path 보유)로 묶는다. 이후 LeftRail의 동기화 버튼으로 재사용.
import { useState } from 'react'
import type { FolderEntry } from '@shared/ipc'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export function FolderImportDialog(): JSX.Element {
  const open = useUiStore((s) => s.folderImportOpen)
  const close = useUiStore((s) => s.closeFolderImport)
  const refresh = useAppStore((s) => s.refresh)

  const [root, setRoot] = useState<string | null>(null)
  const [entries, setEntries] = useState<FolderEntry[]>([])
  const [truncated, setTruncated] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; alreadyLinked: number } | null>(null)

  const reset = (): void => {
    setRoot(null)
    setEntries([])
    setTruncated(false)
    setSelected(new Set())
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
      setSelected(new Set())
    } catch {
      setError('폴더를 읽지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (relativePath: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(relativePath)) next.delete(relativePath)
      else next.add(relativePath)
      return next
    })
  }

  const toggleAll = (): void => {
    setSelected((prev) =>
      prev.size === entries.length ? new Set() : new Set(entries.map((e) => e.relativePath))
    )
  }

  const handleImport = async (): Promise<void> => {
    if (!root || selected.size === 0 || importing) return
    setImporting(true)
    setError(null)
    try {
      const res = await window.api.folderImport(root, [...selected])
      await refresh()
      setResult({ created: res.created, alreadyLinked: res.alreadyLinked })
    } catch {
      setError('가져오기에 실패했습니다.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="폴더 가져오기"
      width={520}
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
            폴더를 선택하면 안의 파일들(하위 폴더 포함, 최대 3000개)을 체크박스로 골라 링크로
            저장하고, 폴더 이름을 딴 태그로 묶습니다. 이후 태그 옆의 동기화 버튼으로 변경 사항을
            다시 반영할 수 있습니다.
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
              <button
                onClick={toggleAll}
                className="mb-2 rounded-sm px-2 py-1 text-sm text-ink-muted hover:bg-list hover:text-ink-strong"
              >
                {selected.size === entries.length ? '전체 해제' : '전체 선택'}
              </button>
              <div className="max-h-72 overflow-y-auto rounded-md border border-line">
                {entries.map((e) => (
                  <label
                    key={e.relativePath}
                    className="flex cursor-pointer items-center gap-2 border-b border-line px-3 py-1.5 text-sm last:border-0 hover:bg-list"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(e.relativePath)}
                      onChange={() => toggle(e.relativePath)}
                    />
                    <span className="truncate text-ink-strong">{e.relativePath}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  )
}
