import { useEffect, useState } from 'react'
import { File, Folder, Globe, Plus, Sparkles } from 'lucide-react'
import type { LinkKind } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { TAG_PALETTE } from '@/features/graph/edgeStyles'
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
  const createTag = useAppStore((s) => s.createTag)

  const [kind, setKind] = useState<LinkKind>('web')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [favicon, setFavicon] = useState<string | null>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [addingTag, setAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)

  const isWeb = kind === 'web'

  // 폼 초기화
  useEffect(() => {
    if (!open) return
    setAddingTag(false)
    setNewTagName('')
    if (editLink) {
      setKind(editLink.kind)
      setUrl(editLink.url)
      setTitle(editLink.title)
      setDescription(editLink.description ?? '')
      setFavicon(editLink.favicon)
      setThumbnail(editLink.thumbnail)
      setContent(editLink.content)
      setTagIds(editLink.tagIds)
    } else {
      setKind(prefill?.kind ?? 'web')
      setUrl(prefill?.url ?? '')
      setTitle(prefill?.title ?? '')
      setDescription(prefill?.description ?? '')
      setFavicon(prefill?.favicon ?? null)
      setThumbnail(prefill?.thumbnail ?? null)
      setContent(prefill?.content ?? null)
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
      setContent(meta.content)
    } finally {
      setFetching(false)
    }
  }

  const submit = async (): Promise<void> => {
    if (!url || !title) return
    setSaving(true)
    try {
      if (editId) {
        await updateLink(editId, { kind, url, title, description, favicon, thumbnail, content, tagIds })
      } else {
        const id = await createLink({ kind, url, title, description, favicon, thumbnail, content, tagIds })
        selectNode(id, 'link')
      }
      close()
    } finally {
      setSaving(false)
    }
  }

  const toggleTag = (id: string): void =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  const submitNewTag = async (): Promise<void> => {
    const name = newTagName.trim()
    setAddingTag(false)
    setNewTagName('')
    if (!name) return
    // 같은 이름이 있으면 새로 만들지 않고 선택만
    const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      setTagIds((prev) => (prev.includes(existing.id) ? prev : [...prev, existing.id]))
      return
    }
    const color = TAG_PALETTE[tags.length % TAG_PALETTE.length]
    const id = await createTag({ name, color })
    setTagIds((prev) => [...prev, id])
  }

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
        <div className="flex flex-wrap items-center gap-1.5">
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

          {addingTag ? (
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onBlur={() => void submitNewTag()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void submitNewTag()
                } else if (e.key === 'Escape') {
                  setAddingTag(false)
                  setNewTagName('')
                }
              }}
              placeholder="태그 이름"
              autoFocus
              className="h-[28px] w-24 rounded-sm border border-brand px-2 text-sm text-ink-strong outline-none"
            />
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="flex items-center gap-1 rounded-sm border border-dashed border-line px-2 py-1 text-sm text-ink-muted hover:border-brand hover:text-brand"
            >
              <Plus size={12} /> 새 태그
            </button>
          )}
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
