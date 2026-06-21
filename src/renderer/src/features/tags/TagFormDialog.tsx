import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { TAG_PALETTE } from '@/features/graph/edgeStyles'
import { cn } from '@/lib/utils'

export function TagFormDialog(): JSX.Element {
  const open = useUiStore((s) => s.tagFormOpen)
  const close = useUiStore((s) => s.closeTagForm)
  const createTag = useAppStore((s) => s.createTag)

  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_PALETTE[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setColor(TAG_PALETTE[0])
    }
  }, [open])

  const submit = async (): Promise<void> => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createTag({ name: name.trim(), color })
      close()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="새 태그 추가"
      width={400}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            취소
          </Button>
          <Button onClick={() => void submit()} disabled={!name.trim() || saving}>
            추가
          </Button>
        </>
      }
    >
      <Field label="이름">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: AI"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
      </Field>
      <Field label="색상">
        <div className="flex flex-wrap gap-2">
          {TAG_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'h-7 w-7 rounded-full transition-transform',
                color === c && 'ring-2 ring-offset-2'
              )}
              style={{ background: c, ...(color === c ? { boxShadow: `0 0 0 2px ${c}` } : {}) }}
            />
          ))}
        </div>
      </Field>
    </Modal>
  )
}
