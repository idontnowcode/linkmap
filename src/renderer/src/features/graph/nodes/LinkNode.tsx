import { Handle, Position, type NodeProps } from '@xyflow/react'
import { File, Folder } from 'lucide-react'
import type { FlowNode } from '../graphLayout'
import { initials } from '@/lib/utils'

export function LinkNode({ data, selected }: NodeProps<FlowNode>): JSX.Element {
  const size = Math.min(76, 48 + data.degree * 6)
  const isFile = data.linkKind === 'file'
  const isFolder = data.linkKind === 'folder'
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <div
        className="grid place-items-center rounded-full bg-white transition-transform"
        style={{
          width: size,
          height: size,
          border: `2px solid ${selected ? '#7C3AED' : '#8B5CF6'}`,
          boxShadow: selected
            ? '0 0 0 6px rgba(139,92,246,.18), 0 8px 24px rgba(15,23,42,.12)'
            : '0 1px 2px rgba(15,23,42,.06)'
        }}
      >
        {isFolder ? (
          <Folder size={size * 0.4} style={{ color: '#F97316' }} />
        ) : isFile ? (
          <File size={size * 0.4} style={{ color: '#14B8A6' }} />
        ) : data.favicon ? (
          <img
            src={data.favicon}
            alt=""
            width={size * 0.42}
            height={size * 0.42}
            className="rounded-sm"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
        ) : (
          <span className="text-[12px] font-semibold text-node">{initials(data.label)}</span>
        )}
      </div>
      <span className="mt-1 max-w-[110px] truncate text-center text-[11px] font-medium text-ink-strong">
        {data.label}
      </span>
    </div>
  )
}
