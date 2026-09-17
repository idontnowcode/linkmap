import type { RelationType } from '@shared/types'
export { TAG_PALETTE } from '@shared/types'

export interface EdgeStyle {
  color: string
  dashed: boolean
  label: string
}

export const EDGE_STYLES: Record<RelationType, EdgeStyle> = {
  related: { color: '#8B5CF6', dashed: false, label: 'related' },
  reference: { color: '#3B82F6', dashed: true, label: 'reference' },
  uses: { color: '#3B82F6', dashed: false, label: 'uses' },
  part_of: { color: '#22C55E', dashed: false, label: 'part of' },
  supports: { color: '#14B8A6', dashed: false, label: 'supports' },
  custom: { color: '#94A3B8', dashed: true, label: '사용자 정의' }
}

export function edgeStyle(type: RelationType): EdgeStyle {
  return EDGE_STYLES[type] ?? EDGE_STYLES.custom
}
