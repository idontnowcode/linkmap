import { useEffect, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  danger?: boolean
  onClick: () => void
}

/** 커서 위치에 뜨는 경량 컨텍스트 메뉴. 바깥 클릭/우클릭/스크롤 시 닫힘. */
export function ContextMenu({
  x,
  y,
  items,
  onClose
}: {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}): JSX.Element {
  useEffect(() => {
    const close = (): void => onClose()
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    window.addEventListener('wheel', close, { passive: true })
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('wheel', close)
    }
  }, [onClose])

  return (
    <div
      className="fixed z-[60] min-w-[164px] rounded-md border border-line bg-white py-1 shadow-pop"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it, i) => (
        <button
          key={i}
          onClick={() => {
            it.onClick()
            onClose()
          }}
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-body hover:bg-list ${
            it.danger ? 'text-red-600' : 'text-ink-strong'
          }`}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  )
}
