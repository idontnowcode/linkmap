import { EDGE_STYLES } from './edgeStyles'
import type { RelationType } from '@shared/types'

export function GraphLegend(): JSX.Element {
  const items = Object.entries(EDGE_STYLES) as [RelationType, (typeof EDGE_STYLES)[RelationType]][]
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-line bg-white/95 px-3 py-2 shadow-card">
      <ul className="space-y-1">
        {items.map(([type, s]) => (
          <li key={type} className="flex items-center gap-2 text-sm text-ink-muted">
            <svg width="26" height="6">
              <line
                x1="0"
                y1="3"
                x2="26"
                y2="3"
                stroke={s.color}
                strokeWidth="2"
                strokeDasharray={s.dashed ? '4 3' : undefined}
              />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
