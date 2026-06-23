import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { LinkWithTags } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { edgeStyle } from '@/features/graph/edgeStyles'
import { suggestRelations } from '@/lib/suggestRelations'

export function RelationsTab({ link }: { link: LinkWithTags }): JSX.Element {
  const snapshot = useAppStore((s) => s.snapshot)
  const deleteRelation = useAppStore((s) => s.deleteRelation)
  const createRelation = useAppStore((s) => s.createRelation)
  const openRelationDialog = useUiStore((s) => s.openRelationDialog)
  const selectNode = useUiStore((s) => s.selectNode)
  const focusNode = useUiStore((s) => s.focusNode)
  const aiSuggest = useSettingsStore((s) => s.aiSuggest)

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  useEffect(() => setDismissed(new Set()), [link.id])

  const suggestions = useMemo(
    () => (aiSuggest ? suggestRelations(link.id, snapshot, dismissed) : []),
    [aiSuggest, link.id, snapshot, dismissed]
  )

  const labelOf = (id: string, kind: string): string => {
    if (kind === 'tag') return snapshot.tags.find((t) => t.id === id)?.name ?? '태그'
    if (kind === 'collection') return snapshot.collections.find((c) => c.id === id)?.name ?? '컬렉션'
    return snapshot.links.find((l) => l.id === id)?.title ?? '(삭제됨)'
  }

  const related = snapshot.relations.filter(
    (r) => r.sourceId === link.id || r.targetId === link.id
  )

  return (
    <div className="px-4 py-4">
      <button
        onClick={() => openRelationDialog(link.id, 'link')}
        className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line py-2 text-body text-ink-muted hover:border-brand hover:text-brand"
      >
        <Plus size={15} /> 관계 추가
      </button>

      {aiSuggest && suggestions.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5 text-label uppercase text-ink-muted">
            <Sparkles size={12} className="text-brand" /> 추천 연결
          </div>
          <ul className="space-y-1.5">
            {suggestions.map((s) => (
              <li
                key={s.link.id}
                className="rounded-md border border-line bg-brand/[0.03] px-2.5 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-body text-ink-strong">{s.link.title}</span>
                  <button
                    onClick={() =>
                      void createRelation({
                        sourceId: link.id,
                        sourceKind: 'link',
                        targetId: s.link.id,
                        targetKind: 'link',
                        type: 'related',
                        label: 'related'
                      })
                    }
                    className="rounded-[7px] bg-brand px-2.5 py-1 text-sm font-medium text-white"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => setDismissed((prev) => new Set(prev).add(s.link.id))}
                    className="rounded-[7px] border border-line px-2.5 py-1 text-sm text-ink-muted hover:bg-list"
                  >
                    무시
                  </button>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{s.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {related.length === 0 && (
        <p className="py-6 text-center text-body text-ink-muted">아직 관계가 없습니다</p>
      )}

      <ul className="space-y-1.5">
        {related.map((r) => {
          const outgoing = r.sourceId === link.id
          const otherId = outgoing ? r.targetId : r.sourceId
          const otherKind = outgoing ? r.targetKind : r.sourceKind
          const style = edgeStyle(r.type)
          return (
            <li
              key={r.id}
              className="group flex items-center gap-2 rounded-md border border-line px-2.5 py-2"
            >
              <span
                className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: `${style.color}1F`, color: style.color }}
              >
                {r.label ?? style.label}
              </span>
              {!outgoing && <ArrowRight size={13} className="rotate-180 text-ink-muted" />}
              <button
                onClick={() => {
                  if (otherKind === 'link') {
                    selectNode(otherId, 'link')
                    focusNode(otherId)
                  } else {
                    focusNode(otherId)
                  }
                }}
                className="flex-1 truncate text-left text-body text-ink-strong hover:text-brand"
              >
                {labelOf(otherId, otherKind)}
              </button>
              {outgoing && <ArrowRight size={13} className="text-ink-muted" />}
              <button
                onClick={() => void deleteRelation(r.id)}
                className="text-ink-muted opacity-0 hover:text-red-600 group-hover:opacity-100"
                title="관계 삭제"
              >
                <Trash2 size={14} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
