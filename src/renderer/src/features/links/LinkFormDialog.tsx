import { useEffect, useState } from 'react'
import { File, Folder, Globe, Sparkles } from 'lucide-react'
import type { LinkKind } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export function LinkFormDialog(): JSX.Element {
  const open = useUiStore((s) => s.linkFormOpen)
  const prefill = useUiStore((s) => s.linkFormPrefill)
  const editId = useUiStore((s) => s.linkFormEditId)
  const close = useUiStore((s) => s.closeLinkForm)
  const selectNode = useUiStore((s) => s.selectNode)

  const tags = useAppStore((s) => s.snapshot.tags)
  const editLink = useAppStore((s) => s.snapshot.links.find((l) => l.id === editId))
  const createLink = useAppStore((s) => s.createLink)
  const updateLink = useAppStore((s) => s.updateLink)

  const [kind, setKind] = useState<LinkKind>('web')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [favicon, setFavicon] = useState<string | null>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)

  const isWeb = kind === 'web'

  // 폼 초기화
  useEffect(() => {
    if (!open) return
    if (editLink) {
      setKind(editLink.kind)
      setUrl(editLink.url)
      setTitle(editLink.title)
      setDescription(editLink.description ?? '')
      setFavicon(editLink.favicon)
      setThumbnail(editLink.thumbnail)
      setTagIds(editLink.tagIds)
    } else {
      setKind(prefill?.kind ?? 'web')
      setUrl(prefill?.url ?? '')
      setTitle(prefill?.title ?? '')
      setDescription(prefill?.description ?? '')
      setFavicon(prefill?.favicon ?? null)
      setThumbnail(prefill?.thumbnail ?? null)
      setTagIds(prefill?.tagIds ?? [])
    }
  }, [open, editLink, prefill])

  const pick = async (mode: 'file' | 'folder'): Promise<void> => {
    const paths = await window.api.pickPaths(mode)
    if (!paths.length) return
    const path = paths[0]
    const info = await window.api.pathInfo(path)
    setKind(info.kind)
    setUrl(path)
    if (!title) setTitle(info.title)
  }

  const autoFetch = async (): Promise<void> => {
    if (!url) return
    setFetching(true)
    try {
      const meta = await window.api.fetchMeta(url)
      if (meta.title && !title) setTitle(meta.title)
      if (meta.description && !description) setDescription(meta.description)
      setFavicon(meta.favicon)
      setThumbnail(meta.thumbnail)
    } finally {
      setFetching(false)
    }
  }

  const submit = async (): Promise<void> => {
    if (!url || !title) return
    setSaving(true)
    try {
      if (editId) {
        await updateLink(editId, { kind, url, title, description, favicon, thumbnail, tagIds })
      } else {
        const id = await createLink({ kind, url, title, description, favicon, thumbnail, tagIds })
        selectNode(id, 'link')
      }
      close()
    } finally {
      setSaving(false)
    }
  }

  const toggleTag = (id: string): void =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  return (
    <Modal
      open={open}
      onClose={close}
      title={editId ? '링크 편집' : '새 링크 추가'}
      width={480}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            취소
          </Button>
          <Button onClick={() => void submit()} disabled={!url || !title || saving}>
            {saving ? '저장 중…' : editId ? '저장' : '추가'}
          </Button>
        </>
      }
    >
      {/* 종류 선택 */}
      <Field label="종류">
        <div className="flex gap-1.5">
          <KindTab active={isWeb} onClick={() => setKind('web')} icon={<Globe size={14} />}>
            웹
          </KindTab>
          <KindTab active={kind === 'file'} onClick={() => void pick('file')} icon={<File size={14} />}>
            파일 선택
          </KindTab>
          <KindTab
            active={kind === 'folder'}
            onClick={() => void pick('folder')}
            icon={<Folder size={14} />}
          >
            폴더 선택
          </KindTab>
        </div>
      </Field>

      <Field label={isWeb ? 'URL' : '경로'}>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={isWeb ? 'https://example.com' : 'C:\\... 또는 위에서 선택'}
            readOnly={!isWeb}
            autoFocus={isWeb}
          />
          {isWeb && (
            <Button variant="outline" onClick={() => void autoFetch()} disabled={!url || fetching}>
              <Sparkles size={14} />
              {fetching ? '수집 중' : '자동 수집'}
            </Button>
          )}
        </div>
      </Field>

      <Field label="제목">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="링크 제목" />
      </Field>

      <Field label="설명">
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="간단한 설명 (선택)"
        />
      </Field>

      <Field label="태그">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const on = tagIds.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className="rounded-sm px-2 py-1 text-sm font-medium transition-all"
                style={{
                  background: on ? `${t.color}1F` : 'transparent',
                  color: on ? t.color : '#64748B',
                  border: `1px solid ${on ? t.color : '#E5E7EB'}`
                }}
              >
                {t.name}
              </button>
            )
          })}
          {tags.length === 0 && <span className="text-sm text-ink-muted">태그를 먼저 만들어 주세요</span>}
        </div>
      </Field>
    </Modal>
  )
}

function KindTab({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-line text-ink-muted hover:bg-list'
      )}
    >
      {icon}
      {children}
    </button>
  )
}
