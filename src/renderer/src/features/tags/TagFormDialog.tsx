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
  const editId = useUiStore((s) => s.tagFormEditId)
  const close = useUiStore((s) => s.closeTagForm)
  const createTag = useAppStore((s) => s.createTag)
  const updateTag = useAppStore((s) => s.updateTag)
  const tags = useAppStore((s) => s.snapshot.tags)

  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_PALETTE[0])
  const [saving, setSaving] = useState(false)

  // 항상 팔레트 첫 색(파랑)으로 시작하면 색상을 직접 고르지 않는 한 태그가 전부 파랑으로
  // 쌓인다("너무 파랑파랑해" 피드백, 2026-09-17) — 새 태그는 기존 태그 개수만큼 팔레트를
  // 돌려 기본값을 다양하게 준다. 수정 모드에서는 그 태그의 현재 이름·색으로 채운다.
  useEffect(() => {
    if (!open) return
    const editing = editId ? tags.find((t) => t.id === editId) : null
    if (editing) {
      setName(editing.name)
      setColor(editing.color)
    } else {
      setName('')
      setColor(TAG_PALETTE[tags.length % TAG_PALETTE.length])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId])

  const submit = async (): Promise<void> => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (editId) await updateTag(editId, { name: name.trim(), color })
      else await createTag({ name: name.trim(), color })
      close()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={editId ? '태그 편집' : '새 태그 추가'}
      width={400}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            취소
          </Button>
          <Button onClick={() => void submit()} disabled={!name.trim() || saving}>
            {editId ? '저장' : '추가'}
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
