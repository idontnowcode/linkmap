import { useEffect, useMemo, useState } from 'react'
import { File, Folder, FolderClosed, Globe, Plus, Sparkles } from 'lucide-react'
import type { Collection, LinkKind } from '@shared/types'
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
  const collections = useAppStore((s) => s.snapshot.collections)
  const createLink = useAppStore((s) => s.createLink)
  const updateLink = useAppStore((s) => s.updateLink)
  const createTag = useAppStore((s) => s.createTag)
  const addLinkToCollection = useAppStore((s) => s.addLinkToCollection)
  const removeLinkFromCollection = useAppStore((s) => s.removeLinkFromCollection)

  const [kind, setKind] = useState<LinkKind>('web')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [favicon, setFavicon] = useState<string | null>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [collectionIds, setCollectionIds] = useState<string[]>([])
  const [addingTag, setAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)

  const isWeb = kind === 'web'
  const isNote = kind === 'note'

  // 폼 초기화 — open/editId 기준으로만 (refresh로 editLink 참조가 바뀌어도 재설정 안 함)
  useEffect(() => {
    if (!open) return
    setAddingTag(false)
    setNewTagName('')
    const el = useAppStore.getState().snapshot.links.find((l) => l.id === editId)
    if (el) {
      setKind(el.kind)
      setUrl(el.url)
      setTitle(el.title)
      setDescription(el.description ?? '')
      setFavicon(el.favicon)
      setThumbnail(el.thumbnail)
      setContent(el.content)
      setNote(el.note ?? '')
      setTagIds(el.tagIds)
      setCollectionIds(
        useAppStore
          .getState()
          .snapshot.collectionLinks.filter((cl) => cl.linkId === editId)
          .map((cl) => cl.collectionId)
      )
    } else {
      setKind(prefill?.kind ?? 'web')
      setUrl(prefill?.url ?? '')
      setTitle(prefill?.title ?? '')
      setDescription(prefill?.description ?? '')
      setFavicon(prefill?.favicon ?? null)
      setThumbnail(prefill?.thumbnail ?? null)
      setContent(prefill?.content ?? null)
      setNote(prefill?.note ?? '')
      setTagIds(prefill?.tagIds ?? [])
      setCollectionIds([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId, prefill])

  const pick = async (mode: 'file' | 'folder'): Promise<void> => {
    const paths = await window.api.pickPaths(mode)
    if (!paths.length) return
    const path = paths[0]
    const info = await window.api.pathInfo(path)
    setKind(info.kind)
    setUrl(path)
    setContent(info.content)
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

  const invalid = isNote ? !title.trim() : !url || !title

  // 컬렉션 트리 순서(들여쓰기용)
  const orderedCols = useMemo(() => {
    const kids = new Map<string | null, Collection[]>()
    for (const c of collections) {
      const k = c.parentId ?? null
      kids.set(k, [...(kids.get(k) ?? []), c])
    }
    const out: { c: Collection; depth: number }[] = []
    const walk = (p: string | null, d: number): void => {
      for (const c of kids.get(p) ?? []) {
        out.push({ c, depth: d })
        walk(c.id, d + 1)
      }
    }
    walk(null, 0)
    return out
  }, [collections])

  const toggleCol = (id: string): void =>
    setCollectionIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  const syncCollections = async (linkId: string): Promise<void> => {
    const current = new Set(
      useAppStore
        .getState()
        .snapshot.collectionLinks.filter((cl) => cl.linkId === linkId)
        .map((cl) => cl.collectionId)
    )
    const target = new Set(collectionIds)
    for (const cid of target) if (!current.has(cid)) await addLinkToCollection(cid, linkId)
    for (const cid of current) if (!target.has(cid)) await removeLinkFromCollection(cid, linkId)
  }

  const submit = async (): Promise<void> => {
    if (invalid) return
    setSaving(true)
    try {
      const payload = isNote
        ? { kind, url: '', title, note, tagIds }
        : { kind, url, title, description, favicon, thumbnail, content, tagIds }
      let linkId = editId
      if (editId) {
        await updateLink(editId, payload)
      } else {
        linkId = await createLink(payload)
        selectNode(linkId, 'link')
      }
      if (linkId) await syncCollections(linkId)
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
      title={isNote ? (editId ? '메모 편집' : '새 메모') : editId ? '링크 편집' : '새 링크 추가'}
      width={480}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            취소
          </Button>
          <Button onClick={() => void submit()} disabled={invalid || saving}>
            {saving ? '저장 중…' : editId ? '저장' : '추가'}
          </Button>
        </>
      }
    >
      {/* 종류 선택 (메모는 URL이 없음) */}
      {!isNote && (
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
      )}

      {!isNote && (
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
      )}

      <Field label="제목">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isNote ? '메모 제목' : '링크 제목'}
          autoFocus={isNote}
        />
      </Field>

      {isNote ? (
        <Field label="내용">
          <Textarea
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 내용 (Markdown 지원)"
          />
        </Field>
      ) : (
        <Field label="설명">
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="간단한 설명 (선택)"
          />
        </Field>
      )}

      <Field label="태그">
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => {
            const on = tagIds.includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
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
              type="button"
              onClick={() => setAddingTag(true)}
              className="flex items-center gap-1 rounded-sm border border-dashed border-line px-2 py-1 text-sm text-ink-muted hover:border-brand hover:text-brand"
            >
              <Plus size={12} /> 새 태그
            </button>
          )}
        </div>
      </Field>

      {collections.length > 0 && (
        <Field label="폴더(컬렉션)">
          <div className="max-h-32 overflow-y-auto rounded-md border border-line p-1">
            {orderedCols.map(({ c, depth }) => (
              <label
                key={c.id}
                style={{ paddingLeft: 6 + depth * 14 }}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-list"
              >
                <input
                  type="checkbox"
                  checked={collectionIds.includes(c.id)}
                  onChange={() => toggleCol(c.id)}
                  className="h-3.5 w-3.5 accent-brand"
                />
                <FolderClosed size={13} className="text-ink-muted" />
                <span className="truncate">{c.name}</span>
              </label>
            ))}
          </div>
        </Field>
      )}
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
