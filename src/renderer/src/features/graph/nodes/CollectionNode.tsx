import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNode } from '../graphLayout'

const HEX = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)'

export function CollectionNode({ data, selected }: NodeProps<FlowNode>): JSX.Element {
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <div
        className="grid h-[80px] w-[88px] place-items-center bg-white"
        style={{
          clipPath: HEX,
          border: 'none',
          background: selected ? '#EDE9FE' : '#F1F5F9',
          boxShadow: selected ? '0 0 0 4px rgba(139,92,246,.18)' : undefined
        }}
      >
        <span className="px-2 text-center text-[11px] font-semibold text-ink-strong">
          {data.label}
        </span>
      </div>
    </div>
  )
}
