// 태그 이름의 "/" 구분자를 파싱해 트리처럼 보이게 하는 순수 표현(convention) 유틸.
// DB 스키마는 그대로 평면(tags.name)이고, 이 파일은 렌더링 직전 depth/hasChildren/parentId만
// 파생한다 — 신규 버전(Linkmap)의 tagTree.ts 판정 로직 참고. 컬렉션(트리)과는 다른 개념으로
// 계속 분리 유지한다(Q2 결정).
import type { Tag } from '@shared/types'

export interface TagTreeNode {
  tag: Tag
  depth: number
  hasChildren: boolean
  parentId: string | null
}

// "상위 문자열이 그 자체로 태그 이름으로 존재할 때만" 진짜 경로로 본다 — "PCB/EDA"처럼
// 원래부터 슬래시가 있던 이름을 부모 없는 자식으로 잘못 묶지 않기 위함.
export function parentNameOf(name: string, allNames: ReadonlySet<string>): string | null {
  const i = name.lastIndexOf('/')
  if (i === -1) return null
  const parent = name.slice(0, i)
  return allNames.has(parent) ? parent : null
}

/** tags는 이름 오름차순으로 온다고 가정하지 않고, depth는 부모 체인을 직접 따라가 계산한다. */
export function buildTagTree(tags: Tag[]): TagTreeNode[] {
  const names = new Set(tags.map((t) => t.name))
  const byName = new Map(tags.map((t) => [t.name, t]))
  const parentIdByName = new Map<string, string | null>()
  const hasChildrenByName = new Set<string>()

  for (const t of tags) {
    const pName = parentNameOf(t.name, names)
    const pId = pName ? (byName.get(pName)?.id ?? null) : null
    parentIdByName.set(t.name, pId)
    if (pName) hasChildrenByName.add(pName)
  }

  function depthOf(name: string, guard = 0): number {
    if (guard > 32) return 0 // 순환 방어 (이론상 발생 불가하지만 안전장치)
    const pId = parentIdByName.get(name)
    if (!pId) return 0
    const parentTag = tags.find((t) => t.id === pId)
    return parentTag ? 1 + depthOf(parentTag.name, guard + 1) : 0
  }

  return tags.map((t) => ({
    tag: t,
    depth: depthOf(t.name),
    hasChildren: hasChildrenByName.has(t.name),
    parentId: parentIdByName.get(t.name) ?? null
  }))
}

/** 조상 중 접힌 게 있어 지금은 숨어야 하는 노드인지. 접힌 노드 자신은 숨지 않는다(자손만 숨는다). */
export function isHiddenByCollapse(
  node: TagTreeNode,
  nodes: TagTreeNode[],
  collapsedIds: ReadonlySet<string>
): boolean {
  let parentId = node.parentId
  while (parentId) {
    if (collapsedIds.has(parentId)) return true
    parentId = nodes.find((n) => n.tag.id === parentId)?.parentId ?? null
  }
  return false
}

/** "Project: X/Firmware" → "Firmware" — 트리에서 보여줄 잎 이름만 추출 */
export function leafNameOf(node: TagTreeNode): string {
  const i = node.tag.name.lastIndexOf('/')
  return i === -1 ? node.tag.name : node.tag.name.slice(i + 1)
}
