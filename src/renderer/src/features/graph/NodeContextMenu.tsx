import { useEffect } from 'react'
import { ExternalLink, FolderPlus, Link2, Pencil, Trash2 } from 'lucide-react'
import type { LinkKind, NodeKind } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { openTarget } from '@/lib/openLink'

export interface ContextMenuState {
  x: number
  y: number
  nodeId: string
  kind: NodeKind
  url?: string
  linkKind?: LinkKind
}

export function NodeContextMenu({
  menu,
  onClose
}: {
  menu: ContextMenuState
  onClose: () => void
}): JSX.Element {
  const trashLink = useAppStore((s) => s.trashLink)
  const openLinkForm = useUiStore((s) => s.openLinkForm)
  const openRelationDialog = useUiStore((s) => s.openRelationDialog)
  const openCollectionPicker = useUiStore((s) => s.openCollectionPicker)

  useEffect(() => {
    const handler = (): void => onClose()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  const isLink = menu.kind === 'link'

  return (
    <div
      className="fixed z-50 w-44 rounded-md border border-line bg-white py-1 shadow-pop"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <Item
        icon={<Link2 size={14} />}
        label="관계 추가"
        onClick={() => {
          openRelationDialog(menu.nodeId, menu.kind)
          onClose()
        }}
      />
      {isLink && (
        <Item
          icon={<ExternalLink size={14} />}
          label={menu.linkKind === 'folder' ? '폴더 열기' : menu.linkKind === 'file' ? '파일 열기' : 'URL 열기'}
          onClick={() => {
            if (menu.url) openTarget(menu.linkKind, menu.url)
            onClose()
          }}
        />
      )}
      {isLink && (
        <Item
          icon={<FolderPlus size={14} />}
          label="컬렉션에 추가"
          onClick={() => {
            openCollectionPicker(menu.nodeId)
            onClose()
          }}
        />
      )}
      {isLink && (
        <Item
          icon={<Pencil size={14} />}
          label="편집"
          onClick={() => {
            openLinkForm(null, menu.nodeId)
            onClose()
          }}
        />
      )}
      {isLink && (
        <Item
          icon={<Trash2 size={14} />}
          label="휴지통으로"
          danger
          onClick={() => {
            void trashLink(menu.nodeId)
            onClose()
          }}
        />
      )}
    </div>
  )
}

function Item({
  icon,
  label,
  onClick,
  danger
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-body hover:bg-list ${
        danger ? 'text-red-600' : 'text-ink-strong'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
