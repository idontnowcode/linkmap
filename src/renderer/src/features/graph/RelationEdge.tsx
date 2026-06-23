import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps
} from '@xyflow/react'
import type { FlowEdge } from './graphLayout'
import { edgeStyle } from './edgeStyles'

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd
}: EdgeProps<FlowEdge>): JSX.Element {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition
  })

  const membership = data?.membership
  const style = edgeStyle(data?.relationType ?? 'custom')
  const color = membership ? '#94A3B8' : style.color
  const label = data?.label

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={membership ? undefined : markerEnd}
        style={{
          stroke: color,
          strokeWidth: membership ? 1.3 : 1.6,
          strokeDasharray: membership || style.dashed ? '5 4' : undefined,
          opacity: membership ? 0.7 : 1
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: '#fff',
              color,
              padding: '1px 6px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              pointerEvents: 'none'
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
