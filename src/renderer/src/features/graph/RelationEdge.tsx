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

  const style = edgeStyle(data?.relationType ?? 'custom')
  const label = data?.label

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: style.color,
          strokeWidth: 1.6,
          strokeDasharray: style.dashed ? '5 4' : undefined
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: '#fff',
              color: style.color,
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
