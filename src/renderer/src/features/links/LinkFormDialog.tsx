import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, File, Folder, Globe, Plus, Sparkles } from 'lucide-react'
import type { LinkKind } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { TAG_PALETTE } from '@/features/graph/edgeStyles'
import { cn } from '@/lib/utils'

// 컬렉션(폴더) 선택 필드는 UI에서만 비활성화했다 — LeftRail.tsx 상단 주석과 동일한 이유
// (2026-09-15, 태그 하나로만 정리). 기존 링크의 collection_links 멤버십은 이 폼이 더 이상
// 건드리지 않을 뿐, DB에는 그대로 남아 있다.
export function LinkFormDialog(): JSX.Element {
  const open = useUiStore((s) => s.linkFormOpen)
  const prefill = useUiStore((s) => s.linkFormPrefill)
  const editId = useUiStore((s) => s.linkFormEditId)
  const close = useUiStore((s) => s.closeLinkForm)
  const selectNode = useUiStore((s) => s.selectNode)

  const tags = useAppStore((s) => s.snapshot.tags)
  const links = useAppStore((s) => s.snapshot.links)
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
  const [note, setNote] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [addingTag, setAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  // Enter가 입력창을 언마운트시키면서 blur가 추가로 발생해도 태그가 중복 생성되지 않도록 가드
  const submittingNewTag = useRef(false)
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

  // 중복 링크 감지(P3) — 파일 링크는 findActiveByUrl로 이미 서버에서 재사용 처리되지만,
  // 웹 링크는 의도적으로 중복 저장을 막지 않고(같은 URL을 다른 맥락으로 또 저장하고 싶을
  // 수 있어서) 경고만 보여준다. 새로 추가할 때만 해당 — 편집 중인 링크 자신은 제외.
  const duplicateLink =
    isWeb && !editId && url.trim()
      ? links.find((l) => l.kind === 'web' && l.deletedAt == null && l.url === url.trim())
      : null

  const submit = async (): Promise<void> => {
    if (invalid) return
    setSaving(true)
    try {
      const payload = isNote
        ? { kind, url: '', title, note, tagIds }
        : { kind, url, title, description, favicon, thumbnail, content, tagIds }
      if (editId) {
        await updateLink(editId, payload)
      } else {
        const linkId = await createLink(payload)
        selectNode(linkId, 'link')
      }
      close()
    } finally {
      setSaving(false)
    }
  }

  const toggleTag = (id: string): void =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  const submitNewTag = async (): Promise<void> => {
    if (submittingNewTag.current) return // Enter 처리 중 blur로 재호출되는 경우 차단
    submittingNewTag.current = true
    const name = newTagName.trim()
    setAddingTag(false)
    setNewTagName('')
    try {
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
    } finally {
      submittingNewTag.current = false
    }
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
          {duplicateLink && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-amber-700">
              <AlertTriangle size={13} className="shrink-0" />
              이미 저장된 링크입니다 — &lsquo;{duplicateLink.title}&rsquo;
            </p>
          )}
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
              onClick={() => {
                submittingNewTag.current = false
                setAddingTag(true)
              }}
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
