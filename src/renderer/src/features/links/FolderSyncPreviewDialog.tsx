// 폴더 동기화 미리보기(2026-09-17) — 예전에는 🔄 누르면 즉시 반영됐는데, 사용자가 뭐가
// 바뀌는지 미리 보고 확정하고 싶어했다. 재스캔 결과(added/removed)만 보여주고, "완료"를
// 눌러야 실제로 반영(folderSync)한다 — 그 전까지는 DB에 아무 변화도 없다.
import { useEffect, useState } from 'react'
import { FilePlus, FileX2 } from 'lucide-react'
import type { FolderSyncPreviewResult } from '@shared/ipc'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export function FolderSyncPreviewDialog(): JSX.Element {
  const tagId = useUiStore((s) => s.folderSyncTagId)
  const close = useUiStore((s) => s.closeFolderSync)
  const tag = useAppStore((s) => s.snapshot.tags.find((t) => t.id === tagId))
  const previewSyncFolderTag = useAppStore((s) => s.previewSyncFolderTag)
  const syncFolderTag = useAppStore((s) => s.syncFolderTag)

  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<FolderSyncPreviewResult | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tagId) {
      setPreview(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    previewSyncFolderTag(tagId)
      .then(setPreview)
      .catch(() => setError('변경 사항을 확인하지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [tagId, previewSyncFolderTag])

  const handleClose = (): void => {
    if (applying) return
    close()
  }

  const handleApply = async (): Promise<void> => {
    if (!tagId || applying) return
    setApplying(true)
    try {
      await syncFolderTag(tagId)
      close()
    } catch {
      setError('반영에 실패했습니다.')
    } finally {
      setApplying(false)
    }
  }

  const hasChanges = !!preview && (preview.added.length > 0 || preview.removed.length > 0)

  return (
    <Modal
      open={!!tagId}
      onClose={handleClose}
      title={`폴더 동기화 — ${tag?.name ?? ''}`}
      width={480}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={applying}>
            취소
          </Button>
          <Button onClick={() => void handleApply()} disabled={loading || applying || !hasChanges}>
            {applying ? '반영하는 중…' : hasChanges ? '완료 — 최신 버전으로 반영' : '변경 사항 없음'}
          </Button>
        </>
      }
    >
      {loading && <p className="text-sm text-ink-muted">변경 사항을 확인하는 중…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && preview && (
        <div className="space-y-3">
          {!hasChanges && (
            <p className="py-4 text-center text-sm text-ink-muted">
              마지막으로 가져온 이후 변경된 파일이 없습니다.
            </p>
          )}

          {preview.added.length > 0 && (
            <div>
              <p className="mb-1.5 text-label uppercase text-ink-muted">
                새로 추가됨 ({preview.added.length})
              </p>
              <ul className="max-h-40 overflow-y-auto rounded-md border border-line">
                {preview.added.map((e) => (
                  <li
                    key={e.absolutePath}
                    className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-sm last:border-0"
                  >
                    <FilePlus size={14} className="shrink-0 text-green-600" />
                    <span className="truncate text-ink-strong">{e.relativePath}</span>
                    <span className="ml-auto shrink-0 rounded-sm bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-green-700">
                      New
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.removed.length > 0 && (
            <div>
              <p className="mb-1.5 text-label uppercase text-ink-muted">
                더 이상 없음 — 휴지통으로 이동됨 ({preview.removed.length})
              </p>
              <ul className="max-h-40 overflow-y-auto rounded-md border border-line">
                {preview.removed.map((r) => (
                  <li
                    key={r.linkId}
                    className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-sm last:border-0"
                  >
                    <FileX2 size={14} className="shrink-0 text-ink-muted" />
                    <span className="truncate text-ink-muted line-through">{r.title}</span>
                    <span className="ml-auto shrink-0 rounded-sm bg-list px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-muted">
                      Deleted
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.unchangedCount > 0 && (
            <p className="text-sm text-ink-muted">그 외 {preview.unchangedCount}개는 그대로입니다.</p>
          )}
        </div>
      )}
    </Modal>
  )
}
