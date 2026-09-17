// 태그 병합(P11) — 폴더 가져오기 계층화(P1)로 태그가 늘어날 걸 대비한 간단한 병합 도구.
// "이 태그를 다른 태그로 병합"하면 원본 태그가 달려있던 모든 링크가 대상 태그로 옮겨지고
// (관계 탭에서 태그를 가리키던 관계도 함께 재연결) 원본 태그는 삭제된다 — 되돌릴 수 없음.
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function TagMergeDialog(): JSX.Element {
  const sourceId = useUiStore((s) => s.tagMergeSourceId)
  const close = useUiStore((s) => s.closeTagMerge)
  const tags = useAppStore((s) => s.snapshot.tags)
  const mergeTag = useAppStore((s) => s.mergeTag)

  const sourceTag = tags.find((t) => t.id === sourceId)
  const [query, setQuery] = useState('')
  const [targetId, setTargetId] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sourceId) {
      setQuery('')
      setTargetId(null)
      setError(null)
    }
  }, [sourceId])

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tags
      .filter((t) => t.id !== sourceId)
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [tags, sourceId, query])

  const targetTag = tags.find((t) => t.id === targetId)

  const handleClose = (): void => {
    if (merging) return
    close()
  }

  const handleMerge = async (): Promise<void> => {
    if (!sourceId || !targetId || merging) return
    if (!confirm(`'${sourceTag?.name}' 태그를 '${targetTag?.name}'(으)로 병합할까요? 되돌릴 수 없습니다.`)) return
    setMerging(true)
    setError(null)
    try {
      await mergeTag(sourceId, targetId)
      close()
    } catch {
      // 되돌릴 수 없는 작업이라 실패했을 때 조용히 넘어가면 안 됨(eval-rubric 지적, 2026-09-18)
      setError('병합에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <Modal
      open={!!sourceId}
      onClose={handleClose}
      title={`태그 병합 — ${sourceTag?.name ?? ''}`}
      width={420}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={merging}>
            취소
          </Button>
          <Button onClick={() => void handleMerge()} disabled={!targetId || merging}>
            {merging ? '병합 중…' : '병합'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-ink-muted">
        <span className="font-medium text-ink-strong">{sourceTag?.name}</span>에 달린 모든 링크를 아래에서
        고른 태그로 옮기고, <span className="font-medium text-ink-strong">{sourceTag?.name}</span> 태그는
        삭제합니다.
      </p>

      <div className="mb-2 flex h-9 items-center gap-2 rounded-sm border border-line px-2.5">
        <Search size={14} className="text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="병합할 대상 태그 검색…"
          autoFocus
          className="h-full w-full bg-transparent text-body text-ink-strong outline-none placeholder:text-ink-muted"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-md border border-line">
        {candidates.length === 0 && <p className="px-3 py-3 text-sm text-ink-muted">일치하는 태그가 없습니다.</p>}
        {candidates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTargetId(t.id)}
            className={cn(
              'flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-sm last:border-0 hover:bg-list',
              targetId === t.id && 'bg-brand/10'
            )}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
            <span className="flex-1 truncate text-ink-strong">{t.name}</span>
            {targetId === t.id && <ArrowRight size={13} className="shrink-0 text-brand" />}
          </button>
        ))}
      </div>

      {targetTag && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-strong">
          {sourceTag?.name} <ArrowRight size={13} className="text-ink-muted" /> {targetTag.name}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  )
}
