import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum
} from 'd3-force'
import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'
import type { GraphSnapshot, LinkKind, NodeKind, RelationType } from '@shared/types'
import type { LayoutMode } from '@/store/uiStore'

export interface LinkNodeData extends Record<string, unknown> {
  kind: NodeKind
  /** kind==='link'일 때 링크 콘텐츠 종류 (web/file/folder) */
  linkKind?: LinkKind
  label: string
  url?: string
  favicon?: string | null
  color?: string
  degree: number
}

export interface RelationEdgeData extends Record<string, unknown> {
  relationType: RelationType
  label?: string | null
}

export type FlowNode = Node<LinkNodeData>
export type FlowEdge = Edge<RelationEdgeData>

interface SimNode extends SimulationNodeDatum {
  id: string
}

/** snapshot → React Flow nodes/edges. tag/collection 노드는 relation에 참여한 것만 포함. */
export function buildGraph(snapshot: GraphSnapshot, layout: LayoutMode): {
  nodes: FlowNode[]
  edges: FlowEdge[]
} {
  const activeLinks = snapshot.links.filter((l) => l.deletedAt == null)
  const tagById = new Map(snapshot.tags.map((t) => [t.id, t]))
  const colById = new Map(snapshot.collections.map((c) => [c.id, c]))
  const linkById = new Map(activeLinks.map((l) => [l.id, l]))

  // relation에 등장하는 비-링크 노드 수집
  const extraNodeIds = new Set<string>()
  const extraKind = new Map<string, NodeKind>()
  for (const r of snapshot.relations) {
    if (r.sourceKind !== 'link') {
      extraNodeIds.add(r.sourceId)
      extraKind.set(r.sourceId, r.sourceKind)
    }
    if (r.targetKind !== 'link') {
      extraNodeIds.add(r.targetId)
      extraKind.set(r.targetId, r.targetKind)
    }
  }

  // degree 집계
  const degree = new Map<string, number>()
  const bump = (id: string): void => {
    degree.set(id, (degree.get(id) ?? 0) + 1)
  }

  const validIds = new Set<string>([...linkById.keys(), ...extraNodeIds])
  const edges: FlowEdge[] = []
  for (const r of snapshot.relations) {
    if (!validIds.has(r.sourceId) || !validIds.has(r.targetId)) continue
    bump(r.sourceId)
    bump(r.targetId)
    edges.push({
      id: r.id,
      source: r.sourceId,
      target: r.targetId,
      type: 'relation',
      data: { relationType: r.type, label: r.label }
    })
  }

  const nodes: FlowNode[] = []
  for (const l of activeLinks) {
    nodes.push({
      id: l.id,
      type: 'link',
      position: { x: 0, y: 0 },
      data: {
        kind: 'link',
        linkKind: l.kind,
        label: l.title,
        url: l.url,
        favicon: l.favicon,
        degree: degree.get(l.id) ?? 0
      }
    })
  }
  for (const id of extraNodeIds) {
    const kind = extraKind.get(id)!
    if (kind === 'tag') {
      const t = tagById.get(id)
      if (!t) continue
      nodes.push({
        id,
        type: 'tag',
        position: { x: 0, y: 0 },
        data: { kind: 'tag', label: t.name, color: t.color, degree: degree.get(id) ?? 0 }
      })
    } else if (kind === 'collection') {
      const c = colById.get(id)
      if (!c) continue
      nodes.push({
        id,
        type: 'collection',
        position: { x: 0, y: 0 },
        data: { kind: 'collection', label: c.name, degree: degree.get(id) ?? 0 }
      })
    }
  }

  layoutPositions(nodes, edges, layout)
  return { nodes, edges }
}

function layoutPositions(nodes: FlowNode[], edges: FlowEdge[], layout: LayoutMode): void {
  if (nodes.length === 0) return

  if (layout === 'radial') {
    radial(nodes, edges)
    return
  }
  if (layout === 'hierarchical') {
    hierarchical(nodes, edges)
    return
  }

  // force-directed (기본)
  const simNodes: SimNode[] = nodes.map((n) => ({ id: n.id }))
  const idx = new Map(simNodes.map((n, i) => [n.id, i]))
  const simLinks: SimulationLinkDatum<SimNode>[] = edges
    .filter((e) => idx.has(e.source) && idx.has(e.target))
    .map((e) => ({ source: idx.get(e.source)!, target: idx.get(e.target)! }))

  const sim = forceSimulation(simNodes)
    .force('charge', forceManyBody().strength(-650))
    .force('link', forceLink(simLinks).distance(170).strength(0.5))
    .force('center', forceCenter(0, 0))
    .force('collide', forceCollide(80))
    .stop()

  const ticks = 320
  for (let i = 0; i < ticks; i++) sim.tick()

  nodes.forEach((n, i) => {
    n.position = { x: Math.round(simNodes[i].x ?? 0), y: Math.round(simNodes[i].y ?? 0) }
  })
}

/** 노드 종류별 대략적 크기(레이아웃 간격 계산용). 라벨 높이 포함. */
function nodeDims(n: FlowNode): { w: number; h: number } {
  if (n.type === 'tag') return { w: 74, h: 74 }
  if (n.type === 'collection') return { w: 88, h: 80 }
  const s = Math.min(76, 48 + (n.data.degree ?? 0) * 6)
  return { w: s, h: s + 18 } // 원형 노드 + 하단 라벨
}

/** 무방향 인접 리스트 */
function adjacency(edges: FlowEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  const add = (a: string, b: string): void => {
    adj.set(a, [...(adj.get(a) ?? []), b])
  }
  for (const e of edges) {
    add(e.source, e.target)
    add(e.target, e.source)
  }
  return adj
}

/**
 * 방사형 배치 — 중심(최다 연결) 노드로부터 그래프 거리(BFS)를 동심원 링으로.
 * 각 링은 노드 수에 맞춰 반지름을 키워 겹침을 방지한다. 비연결 노드는 최외곽 링.
 */
function radial(nodes: FlowNode[], edges: FlowEdge[]): void {
  const adj = adjacency(edges)
  const center = [...nodes].sort((a, b) => b.data.degree - a.data.degree)[0]

  const dist = new Map<string, number>([[center.id, 0]])
  const queue: string[] = [center.id]
  while (queue.length) {
    const cur = queue.shift()!
    const d = dist.get(cur)!
    for (const next of adj.get(cur) ?? []) {
      if (!dist.has(next)) {
        dist.set(next, d + 1)
        queue.push(next)
      }
    }
  }
  const maxRing = Math.max(0, ...dist.values())
  for (const n of nodes) if (!dist.has(n.id)) dist.set(n.id, maxRing + 1)

  const rings = new Map<number, FlowNode[]>()
  for (const n of nodes) {
    const r = dist.get(n.id)!
    rings.set(r, [...(rings.get(r) ?? []), n])
  }

  const baseRadius = 220
  const minArc = 130 // 같은 링 내 노드 간 최소 호 간격(px)
  for (const [ring, ns] of rings) {
    if (ring === 0) {
      ns.forEach((n) => (n.position = { x: 0, y: 0 }))
      continue
    }
    const neededRadius = (ns.length * minArc) / (2 * Math.PI)
    const radius = Math.max(ring * baseRadius, neededRadius)
    ns.forEach((n, i) => {
      const angle = (i / ns.length) * Math.PI * 2 - Math.PI / 2
      n.position = {
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius)
      }
    })
  }
}

/**
 * 계층(레이어드) 배치 — dagre로 교차 최소화 + 노드 크기 기반 간격 산출.
 * dagre는 중심 좌표를 주므로 React Flow의 top-left 기준으로 변환한다.
 */
function hierarchical(nodes: FlowNode[], edges: FlowEdge[]): void {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 55, ranksep: 110, marginx: 30, marginy: 30 })
  g.setDefaultEdgeLabel(() => ({}))

  const dims = new Map<string, { w: number; h: number }>()
  for (const n of nodes) {
    const d = nodeDims(n)
    dims.set(n.id, d)
    g.setNode(n.id, { width: d.w, height: d.h })
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  for (const n of nodes) {
    const p = g.node(n.id)
    const d = dims.get(n.id)!
    if (p) {
      n.position = { x: Math.round(p.x - d.w / 2), y: Math.round(p.y - d.h / 2) }
    }
  }
}
