import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy, ExternalLink, Maximize2, Plus, X } from 'lucide-react'
import type { LinkWithTags } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { formatDate } from '@/lib/utils'
import { openTarget } from '@/lib/openLink'
import { FilePreview } from './FilePreview'
import { previewKindFor } from './previewKind'

export function DetailsTab({ link }: { link: LinkWithTags }): JSX.Element {
  const tags = useAppStore((s) => s.snapshot.tags)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const updateLink = useAppStore((s) => s.updateLink)
  const openLinkForm = useUiStore((s) => s.openLinkForm)
  const setTab = useUiStore((s) => s.setTab)
  // 상세 정보 탭 안에서도 미리보기가 보였으면 좋겠다는 피드백(2026-09-17) — "미리보기" 탭까지
  // 옮겨가지 않아도 바로 보이게 작은 크기로 끼워 넣는다. 전체 크기는 "미리보기" 탭 그대로.
  const richPreviewKind = previewKindFor(link.kind, link.url)

  // 외부 파일 변경 감지(2026-09-18) — 저장된 link.fileMtime과 실제 파일의 현재 mtime을 비교.
  // 카드마다 확인하면 IPC가 N번씩 나가 목록이 커질수록 느려질 수 있어, 선택된 링크 하나만
  // (상세 패널에서) 확인하는 것으로 범위를 한정했다.
  const [fileStatus, setFileStatus] = useState<{ checked: boolean; changed: boolean; missing: boolean }>({
    checked: false,
    changed: false,
    missing: false
  })
  useEffect(() => {
    if (link.kind !== 'file' || !link.fileMtime) {
      setFileStatus({ checked: false, changed: false, missing: false })
      return
    }
    let cancelled = false
    window.api.pathMtime(link.url).then((r) => {
      if (cancelled) return
      if (!r.exists) setFileStatus({ checked: true, changed: false, missing: true })
      else
        setFileStatus({
          checked: true,
          changed: r.mtime != null && Math.abs(r.mtime - link.fileMtime!) > 2000,
          missing: false
        })
    })
    return () => {
      cancelled = true
    }
  }, [link.id, link.kind, link.url, link.fileMtime])

  const [tagMenuOpen, setTagMenuOpen] = useState(false)
  const tagMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!tagMenuOpen) return
    const onClick = (e: MouseEvent): void => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) setTagMenuOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [tagMenuOpen])

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

      {richPreviewKind && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <Label inline>미리보기</Label>
            <button
              onClick={() => setTab('preview')}
              title="미리보기 탭에서 크게 보기"
              className="flex items-center gap-1 text-sm text-ink-muted hover:text-brand"
            >
              <Maximize2 size={12} /> 크게 보기
            </button>
          </div>
          <FilePreview link={link} compact />
        </div>
      )}

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
          {fileStatus.checked && (fileStatus.changed || fileStatus.missing) && (
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
              title={
                fileStatus.missing
                  ? '저장된 경로에서 파일을 찾을 수 없습니다 — 옮겨졌거나 삭제되었을 수 있습니다.'
                  : '링크에 마지막으로 저장된 이후 파일이 바뀐 것으로 보입니다.'
              }
            >
              <AlertTriangle size={11} /> {fileStatus.missing ? '파일 없음' : '파일이 변경됨'}
            </span>
          )}
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
              className="group/chip inline-flex items-center gap-1 rounded-sm py-0.5 pl-2 pr-1 text-sm font-medium"
              style={{ background: `${t!.color}1F`, color: t!.color }}
            >
              {t!.name}
              <button
                onClick={() => removeTag(t!.id)}
                title="태그 제거"
                className="grid h-3.5 w-3.5 place-items-center rounded-sm opacity-0 transition-opacity hover:bg-black/10 group-hover/chip:opacity-100"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {available.length > 0 && (
            <div className="relative" ref={tagMenuRef}>
              <button
                onClick={() => setTagMenuOpen((v) => !v)}
                className="grid h-[22px] w-[22px] place-items-center rounded-sm border border-line text-ink-muted hover:bg-list"
              >
                <Plus size={13} />
              </button>
              {tagMenuOpen && (
                <div className="absolute left-0 top-7 z-20 flex max-h-52 min-w-[140px] flex-col overflow-y-auto rounded-md border border-line bg-white py-1 shadow-pop">
                  {available.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        addTag(t.id)
                        setTagMenuOpen(false)
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-list"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
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
