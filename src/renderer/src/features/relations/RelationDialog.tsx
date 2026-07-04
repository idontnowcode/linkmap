import { useEffect, useMemo, useState } from 'react'
import { RELATION_TYPES, type RelationType } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { edgeStyle } from '@/features/graph/edgeStyles'
import { cn } from '@/lib/utils'

export function RelationDialog(): JSX.Element {
  const sourceId = useUiStore((s) => s.relationSourceId)
  const sourceKind = useUiStore((s) => s.relationSourceKind)
  const presetTargetId = useUiStore((s) => s.relationTargetId)
  const close = useUiStore((s) => s.closeRelationDialog)
  const snapshot = useAppStore((s) => s.snapshot)
  const createRelation = useAppStore((s) => s.createRelation)

  const [targetId, setTargetId] = useState('')
  const [type, setType] = useState<RelationType>('related')
  const [label, setLabel] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (sourceId) {
      // 그래프에서 드래그로 연결한 경우 대상이 미리 지정됨
      setTargetId(presetTargetId ?? '')
      setType('related')
      setLabel('')
      setSearch('')
    }
  }, [sourceId, presetTargetId])

  const sourceTitle = useMemo(() => {
    if (!sourceId) return ''
    return (
      snapshot.links.find((l) => l.id === sourceId)?.title ??
      snapshot.tags.find((t) => t.id === sourceId)?.name ??
      snapshot.collections.find((c) => c.id === sourceId)?.name ??
      ''
    )
  }, [sourceId, snapshot])

  const nameOf = (id: string): string =>
    snapshot.links.find((l) => l.id === id)?.title ??
    snapshot.tags.find((t) => t.id === id)?.name ??
    snapshot.collections.find((c) => c.id === id)?.name ??
    ''
  const kindOf = (id: string): 'link' | 'tag' | 'collection' =>
    snapshot.tags.some((t) => t.id === id)
      ? 'tag'
      : snapshot.collections.some((c) => c.id === id)
        ? 'collection'
        : 'link'

  const candidates = useMemo(
    () =>
      snapshot.links
        .filter((l) => l.deletedAt == null && l.id !== sourceId)
        .filter((l) => (search ? l.title.toLowerCase().includes(search.toLowerCase()) : true))
        .slice(0, 50),
    [snapshot.links, sourceId, search]
  )

  const submit = async (): Promise<void> => {
    if (!sourceId || !targetId) return
    setSaving(true)
    try {
      await createRelation({
        sourceId,
        sourceKind: sourceKind ?? 'link',
        targetId,
        targetKind: kindOf(targetId),
        type,
        label: label.trim() || edgeStyle(type).label
      })
      close()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!sourceId}
      onClose={close}
      title="관계 추가"
      width={460}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            취소
          </Button>
          <Button onClick={() => void submit()} disabled={!targetId || saving}>
            추가
          </Button>
        </>
      }
    >
      <div className="mb-3 rounded-md bg-list px-3 py-2 text-body">
        <span className="text-ink-muted">출발: </span>
        <span className="font-medium text-ink-strong">{sourceTitle}</span>
      </div>

      <Field label="관계 타입">
        <div className="flex flex-wrap gap-1.5">
          {RELATION_TYPES.map((t) => {
            const s = edgeStyle(t)
            const on = type === t
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className="rounded-sm px-2 py-1 text-sm font-medium"
                style={{
                  background: on ? `${s.color}1F` : 'transparent',
                  color: on ? s.color : '#64748B',
                  border: `1px solid ${on ? s.color : '#E5E7EB'}`
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="라벨 (선택, 엣지에 표시)">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: provides" />
      </Field>

      <Field label="대상">
        {presetTargetId ? (
          <div className="rounded-md bg-list px-3 py-2 text-body">
            <span className="text-ink-muted">도착: </span>
            <span className="font-medium text-ink-strong">{nameOf(presetTargetId)}</span>
          </div>
        ) : (
          <>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="대상 링크 검색…"
              className="mb-2"
            />
            <div className="max-h-44 overflow-y-auto rounded-md border border-line">
              {candidates.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setTargetId(l.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-body hover:bg-list',
                    targetId === l.id && 'bg-brand/10 font-medium text-brand'
                  )}
                >
                  <span className="truncate">{l.title}</span>
                  <span className="ml-auto truncate text-sm text-ink-muted">{l.domain}</span>
                </button>
              ))}
              {candidates.length === 0 && (
                <p className="px-3 py-3 text-center text-sm text-ink-muted">대상이 없습니다</p>
              )}
            </div>
          </>
        )}
      </Field>
    </Modal>
  )
}
