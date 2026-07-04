import { useState } from 'react'
import { Check, Copy, ExternalLink, Plus } from 'lucide-react'
import type { LinkWithTags } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { formatDate } from '@/lib/utils'
import { openTarget } from '@/lib/openLink'

export function DetailsTab({ link }: { link: LinkWithTags }): JSX.Element {
  const tags = useAppStore((s) => s.snapshot.tags)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const updateLink = useAppStore((s) => s.updateLink)
  const openLinkForm = useUiStore((s) => s.openLinkForm)
  const openCollectionPicker = useUiStore((s) => s.openCollectionPicker)

  const tagsById = new Map(tags.map((t) => [t.id, t]))
  const assigned = link.tagIds.map((id) => tagsById.get(id)).filter(Boolean)
  const available = tags.filter((t) => !link.tagIds.includes(t.id))

  const addTag = (tagId: string): void => {
    void updateLink(link.id, { tagIds: [...link.tagIds, tagId] })
  }
  const removeTag = (tagId: string): void => {
    void updateLink(link.id, { tagIds: link.tagIds.filter((id) => id !== tagId) })
  }

  return (
    <div className="px-4 py-4 text-body">
      <Row label="제목" value={link.title} />
      {link.kind !== 'note' && (
        <div className="mb-3">
          <Label>{link.kind === 'web' ? 'URL' : '경로'}</Label>
          <div className="flex items-start gap-1.5">
            <button
              onClick={() => openTarget(link.kind, link.url)}
              className="inline-flex min-w-0 flex-1 items-center gap-1 text-left text-brand hover:underline"
              title={link.kind === 'web' ? '브라우저로 열기' : 'OS 기본 앱으로 열기'}
            >
              <span className="break-all">{link.url}</span>
              <ExternalLink size={13} className="shrink-0" />
            </button>
            <CopyButton text={link.url} />
          </div>
        </div>
      )}
      {link.description && <Row label="설명" value={link.description} />}

      {/* Tags */}
      <div className="mb-3">
        <Label>태그</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {assigned.map((t) => (
            <span
              key={t!.id}
              onClick={() => removeTag(t!.id)}
              title="클릭하여 제거"
              className="cursor-pointer rounded-sm px-2 py-0.5 text-sm font-medium"
              style={{ background: `${t!.color}1F`, color: t!.color }}
            >
              {t!.name}
            </span>
          ))}
          {available.length > 0 && (
            <div className="group relative">
              <button className="grid h-[22px] w-[22px] place-items-center rounded-sm border border-line text-ink-muted hover:bg-list">
                <Plus size={13} />
              </button>
              <div className="absolute left-0 top-7 z-10 hidden min-w-[120px] flex-col rounded-md border border-line bg-white py-1 shadow-pop group-hover:flex">
                {available.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => addTag(t.id)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-list"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {link.kind !== 'note' && (
        <Row label={link.kind === 'web' ? '도메인' : '위치'} value={link.domain ?? '—'} />
      )}
      <Row label="생성일" value={formatDate(link.createdAt)} />
      <Row label="수정일" value={formatDate(link.updatedAt)} />

      {/* Favorite toggle */}
      <div className="mb-4 flex items-center justify-between">
        <Label inline>즐겨찾기</Label>
        <button
          onClick={() => void toggleFavorite(link.id)}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            link.favorite ? 'bg-brand' : 'bg-line'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              link.favorite ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Quick actions */}
      <div className="border-t border-line pt-3">
        <Label>빠른 작업</Label>
        <div className="space-y-1.5">
          <QuickAction label="컬렉션에 추가" onClick={() => openCollectionPicker(link.id)} />
          <QuickAction label="편집" onClick={() => openLinkForm(null, link.id)} />
          <QuickAction label="새 링크 추가" onClick={() => openLinkForm()} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div className="mb-3">
      <Label>{label}</Label>
      <div className="break-words text-ink-strong">{value}</div>
    </div>
  )
}

function Label({ children, inline }: { children: React.ReactNode; inline?: boolean }): JSX.Element {
  return (
    <span className={`${inline ? '' : 'mb-1 block'} text-label uppercase text-ink-muted`}>
      {children}
    </span>
  )
}

function CopyButton({ text }: { text: string }): JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = async (): Promise<void> => {
    await window.api.copyText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={() => void copy()}
      title="복사"
      className={`shrink-0 rounded-sm border p-1 transition-colors ${
        copied ? 'border-green-500 text-green-600' : 'border-line text-ink-muted hover:bg-list'
      }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md border border-line px-3 py-2 text-left text-body text-ink-strong hover:bg-list"
    >
      {label}
    </button>
  )
}
