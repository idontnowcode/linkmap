import { Check, FolderClosed, Plus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function CollectionPickerDialog(): JSX.Element {
  const linkId = useUiStore((s) => s.collectionPickerLinkId)
  const close = useUiStore((s) => s.closeCollectionPicker)
  const openCollectionForm = useUiStore((s) => s.openCollectionForm)

  const collections = useAppStore((s) => s.snapshot.collections)
  const collectionLinks = useAppStore((s) => s.snapshot.collectionLinks)
  const link = useAppStore((s) => s.snapshot.links.find((l) => l.id === linkId))
  const addLinkToCollection = useAppStore((s) => s.addLinkToCollection)
  const removeLinkFromCollection = useAppStore((s) => s.removeLinkFromCollection)

  const memberSet = new Set(
    collectionLinks.filter((cl) => cl.linkId === linkId).map((cl) => cl.collectionId)
  )

  const toggle = (collectionId: string): void => {
    if (!linkId) return
    if (memberSet.has(collectionId)) void removeLinkFromCollection(collectionId, linkId)
    else void addLinkToCollection(collectionId, linkId)
  }

  return (
    <Modal
      open={!!linkId}
      onClose={close}
      title="컬렉션에 추가"
      width={420}
      footer={
        <Button variant="outline" onClick={close}>
          완료
        </Button>
      }
    >
      {link && (
        <div className="mb-3 truncate rounded-md bg-list px-3 py-2 text-body text-ink-strong">
          {link.title}
        </div>
      )}

      <div className="mb-3 max-h-60 space-y-1 overflow-y-auto">
        {collections.map((c) => {
          const member = memberSet.has(c.id)
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-body transition-colors',
                member ? 'border-brand bg-brand/5 text-ink-strong' : 'border-line text-ink-strong hover:bg-list'
              )}
            >
              <FolderClosed size={15} className="shrink-0 text-ink-muted" />
              <span className="flex-1 truncate text-left">{c.name}</span>
              {member && <Check size={15} className="shrink-0 text-brand" />}
            </button>
          )
        })}
        {collections.length === 0 && (
          <p className="py-4 text-center text-body text-ink-muted">컬렉션이 없습니다</p>
        )}
      </div>

      <button
        onClick={openCollectionForm}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line py-2 text-body text-ink-muted hover:border-brand hover:text-brand"
      >
        <Plus size={15} /> 새 컬렉션 만들기
      </button>
    </Modal>
  )
}
