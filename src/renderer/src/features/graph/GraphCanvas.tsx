import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
  type OnConnect
} from '@xyflow/react'
import type { LinkKind, NodeKind } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { parseSearch, matchLink, isEmpty } from '@/lib/search'
import { openTarget } from '@/lib/openLink'
import { buildGraph, type FlowEdge, type FlowNode } from './graphLayout'
import { LinkNode } from './nodes/LinkNode'
import { TagNode } from './nodes/TagNode'
import { CollectionNode } from './nodes/CollectionNode'
import { RelationEdge } from './RelationEdge'
import { GraphLegend } from './GraphLegend'
import { NodeContextMenu, type ContextMenuState } from './NodeContextMenu'

const nodeTypes = { link: LinkNode, tag: TagNode, collection: CollectionNode }
const edgeTypes = { relation: RelationEdge }

export function GraphCanvas(): JSX.Element {
  const snapshot = useAppStore((s) => s.snapshot)
  const layout = useUiStore((s) => s.layout)
  const showTags = useSettingsStore((s) => s.showTags)
  const showCollections = useSettingsStore((s) => s.showCollections)
  const hideUnmatched = useSettingsStore((s) => s.hideUnmatched)
  const searchQuery = useUiStore((s) => s.searchQuery)
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
  const selectNode = useUiStore((s) => s.selectNode)
  const openRelationDialog = useUiStore((s) => s.openRelationDialog)
  const focusNodeId = useUiStore((s) => s.focusNodeId)
  const focusNonce = useUiStore((s) => s.focusNonce)

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([])
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const positions = useRef<Map<string, { x: number; y: number }>>(new Map())
  const lastLayout = useRef(layout)
  const { setCenter, fitView } = useReactFlow()

  // 그래프 재구성: snapshot 변경 시엔 기존 위치 보존(드래그 유지),
  // layout 변경 시엔 새 좌표를 강제 적용하고 화면을 다시 맞춘다.
  useEffect(() => {
    const layoutChanged = lastLayout.current !== layout
    lastLayout.current = layout

    const built = buildGraph(snapshot, layout, { showTags, showCollections })
    const merged = built.nodes.map((n) => {
      if (layoutChanged) return n // 레이아웃 전환: 캐시 무시, 새 위치 사용
      const prev = positions.current.get(n.id)
      return prev ? { ...n, position: prev } : n
    })
    positions.current = new Map(merged.map((n) => [n.id, n.position]))
    setNodes(merged)
    setEdges(built.edges)

    if (layoutChanged) {
      requestAnimationFrame(() => fitView({ duration: 400, padding: 0.2 }))
    }
  }, [snapshot, layout, showTags, showCollections, setNodes, setEdges, fitView])

  // 검색 매칭 노드 계산 (강조/숨김용).
  // 매칭 링크 + 그 링크의 태그·컬렉션(+상위) + 이름이 매칭된 태그와 그 태그의 모든 링크까지 유지.
  const dimmedIds = useMemo(() => {
    const queries = parseSearch(searchQuery)
    if (isEmpty(queries)) return null
    const tagsById = new Map(snapshot.tags.map((t) => [t.id, t]))
    const colById = new Map(snapshot.collections.map((c) => [c.id, c]))

    const tagsOfLink = new Map<string, string[]>()
    const linksOfTag = new Map<string, string[]>()
    for (const lt of snapshot.linkTags) {
      tagsOfLink.set(lt.linkId, [...(tagsOfLink.get(lt.linkId) ?? []), lt.tagId])
      linksOfTag.set(lt.tagId, [...(linksOfTag.get(lt.tagId) ?? []), lt.linkId])
    }
    const colsOfLink = new Map<string, string[]>()
    for (const cl of snapshot.collectionLinks) {
      colsOfLink.set(cl.linkId, [...(colsOfLink.get(cl.linkId) ?? []), cl.collectionId])
    }

    const matched = new Set<string>()
    // 1) 쿼리에 매칭되는 링크
    for (const l of snapshot.links) {
      if (l.deletedAt == null && matchLink(l, queries, tagsById)) matched.add(l.id)
    }
    // 2) 이름이 매칭된 태그 → 태그 + 그 태그를 가진 모든 링크
    for (const t of snapshot.tags) {
      const name = t.name.toLowerCase()
      const hit = queries.some(
        (q) =>
          q.texts.some((tx) => name.includes(tx)) || q.tagNames.some((tn) => name.includes(tn))
      )
      if (hit) {
        matched.add(t.id)
        for (const lid of linksOfTag.get(t.id) ?? []) matched.add(lid)
      }
    }
    // 3) 이름이 매칭된 컬렉션도 유지
    for (const c of snapshot.collections) {
      const name = c.name.toLowerCase()
      if (queries.some((q) => q.texts.some((tx) => name.includes(tx)))) matched.add(c.id)
    }
    // 4) 매칭된 링크들의 태그·컬렉션(+상위 폴더)도 함께 유지 → 그래프가 끊기지 않게
    for (const id of [...matched]) {
      for (const tid of tagsOfLink.get(id) ?? []) matched.add(tid)
      for (const cid of colsOfLink.get(id) ?? []) {
        matched.add(cid)
        let cur = colById.get(cid)
        while (cur?.parentId) {
          matched.add(cur.parentId)
          cur = colById.get(cur.parentId)
        }
      }
    }
    return matched
  }, [searchQuery, snapshot])

  const styledNodes = useMemo(
    () =>
      nodes.map((n) => {
        const unmatched = !!dimmedIds && !dimmedIds.has(n.id)
        return {
          ...n,
          selected: n.id === selectedNodeId,
          hidden: unmatched && hideUnmatched,
          style: { opacity: unmatched && !hideUnmatched ? 0.2 : 1 }
        }
      }),
    [nodes, selectedNodeId, dimmedIds, hideUnmatched]
  )

  // LinkCard 클릭 → 노드 센터링
  useEffect(() => {
    if (!focusNodeId) return
    const pos = positions.current.get(focusNodeId)
    if (pos) setCenter(pos.x, pos.y, { zoom: 1.2, duration: 500 })
  }, [focusNonce, focusNodeId, setCenter])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node: Node) => {
      const kind = (node.data as { kind?: 'link' | 'tag' | 'collection' }).kind ?? 'link'
      selectNode(node.id, kind)
    },
    [selectNode]
  )

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_e, node: Node) => {
    const data = node.data as { url?: string; linkKind?: LinkKind }
    if (data.url) openTarget(data.linkKind, data.url)
  }, [])

  const onNodeContextMenu: NodeMouseHandler = useCallback((e, node: Node) => {
    e.preventDefault()
    const data = node.data as {
      kind: 'link' | 'tag' | 'collection'
      url?: string
      linkKind?: LinkKind
    }
    setMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId: node.id,
      kind: data.kind,
      url: data.url,
      linkKind: data.linkKind
    })
  }, [])

  const onNodeDragStop = useCallback((_e: unknown, node: Node) => {
    positions.current.set(node.id, node.position)
  }, [])

  // 마우스로 노드→노드 드래그해서 관계 생성 (타입/라벨은 다이얼로그에서 선택)
  const onConnect: OnConnect = useCallback(
    (c) => {
      if (!c.source || !c.target || c.source === c.target) return
      const src = nodes.find((n) => n.id === c.source)
      const kind = ((src?.data.kind as NodeKind) ?? 'link') as NodeKind
      openRelationDialog(c.source, kind, c.target)
    },
    [nodes, openRelationDialog]
  )

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        onPaneClick={() => selectNode(null)}
        defaultEdgeOptions={{
          type: 'relation',
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#94A3B8' }
        }}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#E5E7EB" />
        <Controls showInteractive={false} className="!shadow-card" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const kind = (n.data as { kind?: string }).kind
            if (kind === 'tag') return (n.data as { color?: string }).color ?? '#3B82F6'
            if (kind === 'collection') return '#94A3B8'
            return '#8B5CF6'
          }}
          nodeStrokeWidth={2}
          className="!rounded-md !border !border-line"
        />
        <GraphLegend />
      </ReactFlow>
      {menu && <NodeContextMenu menu={menu} onClose={() => setMenu(null)} />}
    </div>
  )
}
