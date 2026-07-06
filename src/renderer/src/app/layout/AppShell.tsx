import { LeftRail } from '@/features/navigation/LeftRail'
import { LinkListColumn } from '@/features/links/LinkListColumn'
import { GraphPanel } from '@/features/graph/GraphPanel'
import { DetailPanel } from '@/features/detail/DetailPanel'
import { useSettingsStore } from '@/store/settingsStore'

export function AppShell(): JSX.Element {
  const railWidth = useSettingsStore((s) => s.railWidth)
  const listWidth = useSettingsStore((s) => s.listWidth)
  const setRailWidth = useSettingsStore((s) => s.setRailWidth)
  const setListWidth = useSettingsStore((s) => s.setListWidth)

  return (
    <div
      className="grid h-screen w-full overflow-hidden"
      style={{
        gridTemplateColumns: `${railWidth}px 5px ${listWidth}px 5px minmax(0,1fr) 320px`,
        gridTemplateRows: 'minmax(0, 1fr)'
      }}
    >
      <LeftRail />
      <Resizer value={railWidth} onChange={setRailWidth} />
      <LinkListColumn />
      <Resizer value={listWidth} onChange={setListWidth} />
      <GraphPanel />
      <DetailPanel />
    </div>
  )
}

/** 좌우 너비 조절 핸들 */
function Resizer({ value, onChange }: { value: number; onChange: (v: number) => void }): JSX.Element {
  const onMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    const startX = e.clientX
    const startVal = value
    const onMove = (ev: MouseEvent): void => onChange(startVal + (ev.clientX - startX))
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={onMouseDown}
      className="z-10 cursor-col-resize bg-line/30 transition-colors hover:bg-brand/50"
      title="드래그하여 너비 조절"
    />
  )
}
