import { RELATION_TYPES } from '@shared/types'
import { useSettingsStore } from '@/store/settingsStore'
import { edgeStyle } from './edgeStyles'

export function GraphLegend(): JSX.Element {
  const showCollections = useSettingsStore((s) => s.showCollections)

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-line bg-white/95 px-3 py-2 shadow-card">
      <ul className="space-y-1">
        {RELATION_TYPES.map((type) => {
          const s = edgeStyle(type)
          return (
            <li key={type} className="flex items-center gap-2 text-sm text-ink-muted">
              <Line color={s.color} dashed={s.dashed} />
              {s.label}
            </li>
          )
        })}
        {showCollections && (
          <li className="flex items-center gap-2 text-sm text-ink-muted">
            <Line color="#94A3B8" dashed />
            포함 (컬렉션)
          </li>
        )}
      </ul>
    </div>
  )
}

function Line({ color, dashed }: { color: string; dashed: boolean }): JSX.Element {
  return (
    <svg width="26" height="6">
      <line
        x1="0"
        y1="3"
        x2="26"
        y2="3"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={dashed ? '4 3' : undefined}
      />
    </svg>
  )
}
