// 커맨드 팔레트(P10, Ctrl/Cmd+K) — 키보드만으로 링크/태그를 검색해 바로 이동하는 오버레이.
// App.tsx의 기존 전역 키보드 리스너 패턴에 단축키를 추가하고, 이 컴포넌트는 열림 상태일 때만
// 렌더링되는 자체 오버레이(Modal 컴포넌트와 시각 언어는 맞추되 실시간 검색+키보드 탐색이
// 필요해 별도로 구현했다).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Folder, Link2, StickyNote, Tag as TagIcon } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { fuzzyScore } from '@/lib/fuzzyMatch'
import { Favicon } from '@/features/links/LinkCard'
import { cn } from '@/lib/utils'

interface Candidate {
  key: string
  kind: 'link' | 'tag'
  label: string
  sublabel?: string
  score: number
  linkId?: string
  tagId?: string
}

const MAX_RESULTS = 30

export function CommandPalette(): JSX.Element | null {
  const open = useUiStore((s) => s.commandPaletteOpen)
  const close = useUiStore((s) => s.closeCommandPalette)
  const links = useAppStore((s) => s.snapshot.links)
  const tags = useAppStore((s) => s.snapshot.tags)
  const selectNode = useUiStore((s) => s.selectNode)
  const focusNode = useUiStore((s) => s.focusNode)
  const setView = useUiStore((s) => s.setView)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // Modal이 열리는 타이밍에 맞춰 포커스(다음 틱)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const results = useMemo<Candidate[]>(() => {
    if (!query.trim()) {
      // 빈 쿼리 — 최근 항목 위주로 간단히 상위 몇 개만(링크 생성 역순)
      return links
        .filter((l) => l.deletedAt == null)
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 8)
        .map((l) => ({ key: `link:${l.id}`, kind: 'link' as const, label: l.title, sublabel: l.domain ?? l.url, score: 0, linkId: l.id }))
    }
    const out: Candidate[] = []
    for (const l of links) {
      if (l.deletedAt != null) continue
      const score = fuzzyScore(query, l.title)
      if (score != null) out.push({ key: `link:${l.id}`, kind: 'link', label: l.title, sublabel: l.domain ?? l.url, score, linkId: l.id })
    }
    for (const t of tags) {
      const score = fuzzyScore(query, t.name)
      if (score != null) out.push({ key: `tag:${t.id}`, kind: 'tag', label: t.name, score, tagId: t.id })
    }
    out.sort((a, b) => b.score - a.score)
    return out.slice(0, MAX_RESULTS)
  }, [query, links, tags])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const choose = (c: Candidate): void => {
    if (c.kind === 'link' && c.linkId) {
      selectNode(c.linkId, 'link')
      focusNode(c.linkId)
    } else if (c.kind === 'tag' && c.tagId) {
      setView({ kind: 'tag', id: c.tagId })
    }
    close()
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation() // 전역 Escape 리스너(App.tsx)가 선택 해제까지 같이 하지 않도록
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const c = results[activeIndex]
      if (c) choose(c)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 pt-[15vh]" onMouseDown={close}>
      <div
        className="w-[520px] max-w-[90vw] overflow-hidden rounded-lg bg-white shadow-pop"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="링크·태그 이름으로 검색… (↑↓ 이동, Enter 선택, Esc 닫기)"
          className="w-full border-b border-line px-4 py-3.5 text-h text-ink-strong outline-none placeholder:text-ink-muted"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-muted">일치하는 항목이 없습니다.</p>}
          {results.map((c, i) => (
            <button
              key={c.key}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => choose(c)}
              className={cn(
                'flex w-full items-center gap-2.5 px-4 py-2 text-left text-body',
                i === activeIndex ? 'bg-brand/10' : 'hover:bg-list'
              )}
            >
              {c.kind === 'link' ? (
                <LinkIconFor linkId={c.linkId!} />
              ) : (
                <TagIcon size={16} className="shrink-0 text-ink-muted" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink-strong">{c.label}</span>
                {c.sublabel && <span className="block truncate text-sm text-ink-muted">{c.sublabel}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 링크 종류에 맞는 아이콘(파비콘 포함)을 스냅샷에서 찾아 재사용 — LinkCard.Favicon 그대로 활용. */
function LinkIconFor({ linkId }: { linkId: string }): JSX.Element {
  const link = useAppStore((s) => s.snapshot.links.find((l) => l.id === linkId))
  if (!link) return <Link2 size={16} className="shrink-0 text-ink-muted" />
  if (link.kind === 'folder') return <Folder size={16} className="shrink-0 text-ink-muted" />
  if (link.kind === 'note') return <StickyNote size={16} className="shrink-0 text-ink-muted" />
  return <Favicon link={link} size={16} />
}
