import { LeftRail } from '@/features/navigation/LeftRail'
import { LinkListColumn } from '@/features/links/LinkListColumn'
import { DetailPanel } from '@/features/detail/DetailPanel'
import { useSettingsStore } from '@/store/settingsStore'

// 그래프 시각화(GraphPanel) 컬럼은 UI에서만 비활성화함 — 코드는 features/graph/에 그대로 남겨두고
// 렌더링만 하지 않는다(추후 재활성화 시 이 3줄만 되돌리면 됨). 그 자리는 DetailPanel이 채운다.
export function AppShell(): JSX.Element {
  const railWidth = useSettingsStore((s) => s.railWidth)
  const listWidth = useSettingsStore((s) => s.listWidth)
  const setRailWidth = useSettingsStore((s) => s.setRailWidth)
  const setListWidth = useSettingsStore((s) => s.setListWidth)

  return (
    <div
      className="grid h-screen w-full overflow-hidden"
      style={{
        gridTemplateColumns: `${railWidth}px 5px ${listWidth}px 5px minmax(320px,1fr)`,
        gridTemplateRows: 'minmax(0, 1fr)'
      }}
    >
      <LeftRail />
      <Resizer value={railWidth} onChange={setRailWidth} />
      <LinkListColumn />
      <Resizer value={listWidth} onChange={setListWidth} />
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
