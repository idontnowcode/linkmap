import { Handle, Position, type NodeProps } from '@xyflow/react'
import { File, Folder, StickyNote } from 'lucide-react'
import type { FlowNode } from '../graphLayout'
import { initials } from '@/lib/utils'

export function LinkNode({ data, selected }: NodeProps<FlowNode>): JSX.Element {
  const size = Math.min(76, 48 + data.degree * 6)
  const isFile = data.linkKind === 'file'
  const isFolder = data.linkKind === 'folder'
  const isNote = data.linkKind === 'note'
  const handleCls =
    '!h-2.5 !w-2.5 !border-2 !border-node !bg-white opacity-0 transition-opacity group-hover:opacity-100'

  // 메모 노드: 노란 포스트잇 스타일
  if (isNote) {
    return (
      <div className="group flex flex-col items-center" style={{ width: 96 }}>
        <Handle type="target" position={Position.Top} className={handleCls} />
        <Handle type="source" position={Position.Bottom} className={handleCls} />
        <div
          className="relative flex w-[96px] items-start gap-1 rounded-md p-2 text-left"
          style={{
            minHeight: 60,
            background: '#FEF3C7',
            border: `1.5px solid ${selected ? '#CA8A04' : '#EAB308'}`,
            boxShadow: selected ? '0 0 0 5px rgba(234,179,8,.2)' : '0 1px 2px rgba(15,23,42,.06)'
          }}
        >
          <StickyNote size={12} className="mt-0.5 shrink-0" style={{ color: '#A16207' }} />
          <span className="line-clamp-3 text-[10px] font-medium leading-tight text-amber-900">
            {data.label}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex flex-col items-center" style={{ width: size }}>
      <Handle type="target" position={Position.Top} className={handleCls} />
      <Handle type="source" position={Position.Bottom} className={handleCls} />
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
