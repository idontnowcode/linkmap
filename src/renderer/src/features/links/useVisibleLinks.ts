import { useMemo } from 'react'
import type { LinkWithTags, Tag } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { matchLink, parseSearch } from '@/lib/search'

const RECENT_MS = 7 * 24 * 60 * 60 * 1000

export interface VisibleLinksResult {
  links: LinkWithTags[]
  matchedIds: Set<string>
  tagsById: Map<string, Tag>
  viewTitle: string
}

/** activeView + searchQuery 를 적용해 보이는 링크 목록과 매칭 id 집합을 계산 */
export function useVisibleLinks(): VisibleLinksResult {
  const snapshot = useAppStore((s) => s.snapshot)
  const activeView = useUiStore((s) => s.activeView)
  const searchQuery = useUiStore((s) => s.searchQuery)

  return useMemo(() => {
    const tagsById = new Map(snapshot.tags.map((t) => [t.id, t]))
    const linkTagSet = new Set(snapshot.linkTags.map((lt) => `${lt.linkId}:${lt.tagId}`))

    // 1) view 필터
    let inView: LinkWithTags[]
    let viewTitle = '모든 링크'
    if (activeView.kind === 'smart') {
      switch (activeView.id) {
        case 'favorites':
          inView = snapshot.links.filter((l) => l.deletedAt == null && l.favorite)
          viewTitle = '즐겨찾기'
          break
        case 'recent':
          inView = snapshot.links.filter(
            (l) => l.deletedAt == null && Date.now() - l.createdAt <= RECENT_MS
          )
          viewTitle = '최근 추가'
          break
        case 'trash':
          inView = snapshot.links.filter((l) => l.deletedAt != null)
          viewTitle = '휴지통'
          break
        default:
          inView = snapshot.links.filter((l) => l.deletedAt == null)
          viewTitle = '모든 링크'
      }
    } else if (activeView.kind === 'tag') {
      const tag = tagsById.get(activeView.id)
      viewTitle = tag ? tag.name : '태그'
      inView = snapshot.links.filter(
        (l) => l.deletedAt == null && linkTagSet.has(`${l.id}:${activeView.id}`)
      )
    } else {
      // collection — 선택한 폴더 + 모든 하위 폴더의 멤버십을 합쳐 필터
      viewTitle = snapshot.collections.find((c) => c.id === activeView.id)?.name ?? '컬렉션'
      const childrenOf = new Map<string, string[]>()
      for (const c of snapshot.collections) {
        if (c.parentId) childrenOf.set(c.parentId, [...(childrenOf.get(c.parentId) ?? []), c.id])
      }
      const colIds = new Set<string>()
      const stack = [activeView.id]
      while (stack.length) {
        const id = stack.pop()!
        if (colIds.has(id)) continue
        colIds.add(id)
        for (const ch of childrenOf.get(id) ?? []) stack.push(ch)
      }
      const memberIds = new Set(
        snapshot.collectionLinks.filter((cl) => colIds.has(cl.collectionId)).map((cl) => cl.linkId)
      )
      inView = snapshot.links.filter((l) => l.deletedAt == null && memberIds.has(l.id))
    }

    // 2) 검색 필터
    const q = parseSearch(searchQuery)
    const links = inView.filter((l) => matchLink(l, q, tagsById))
    const matchedIds = new Set(links.map((l) => l.id))

    return { links, matchedIds, tagsById, viewTitle }
  }, [snapshot, activeView, searchQuery])
}
