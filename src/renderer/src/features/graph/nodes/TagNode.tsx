import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNode } from '../graphLayout'

export function TagNode({ data, selected }: NodeProps<FlowNode>): JSX.Element {
  const color = data.color ?? '#3B82F6'
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <div
        className="grid h-[74px] w-[74px] place-items-center rounded-lg transition-transform"
        style={{
          background: `${color}1F`,
          border: `2px solid ${color}`,
          boxShadow: selected ? `0 0 0 6px ${color}2E` : '0 1px 2px rgba(15,23,42,.06)'
        }}
      >
        <span className="px-1 text-center text-[12px] font-semibold" style={{ color }}>
          {data.label}
        </span>
      </div>
    </div>
  )
}
