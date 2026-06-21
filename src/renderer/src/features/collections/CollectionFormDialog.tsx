import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'

export function CollectionFormDialog(): JSX.Element {
  const open = useUiStore((s) => s.collectionFormOpen)
  const close = useUiStore((s) => s.closeCollectionForm)
  const createCollection = useAppStore((s) => s.createCollection)

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setName('')
  }, [open])

  const submit = async (): Promise<void> => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createCollection(name.trim())
      close()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="새 컬렉션"
      width={400}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            취소
          </Button>
          <Button onClick={() => void submit()} disabled={!name.trim() || saving}>
            만들기
          </Button>
        </>
      }
    >
      <Field label="이름">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: Project Alpha"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
      </Field>
    </Modal>
  )
}
