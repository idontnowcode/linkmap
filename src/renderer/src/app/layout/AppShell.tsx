import { LeftRail } from '@/features/navigation/LeftRail'
import { LinkListColumn } from '@/features/links/LinkListColumn'
import { GraphPanel } from '@/features/graph/GraphPanel'
import { DetailPanel } from '@/features/detail/DetailPanel'

export function AppShell(): JSX.Element {
  return (
    <div
      className="grid h-full w-full overflow-hidden"
      style={{ gridTemplateColumns: '220px 248px minmax(0,1fr) 320px' }}
    >
      <LeftRail />
      <LinkListColumn />
      <GraphPanel />
      <DetailPanel />
    </div>
  )
}
