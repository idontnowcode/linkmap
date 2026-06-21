# 05 — Claude Build Prompt (구현 진입점)

> Claude는 이 문서부터 읽고 구현을 시작한다. 세부는 01~04, 06~07을 참조.

## Role
You are a senior **Electron + React + TypeScript** engineer. Build a production-quality desktop application called **LinkMap** — a knowledge-oriented bookmark manager that stores URLs, tags, and relationships between links and visualizes them as an interactive graph.

## Tech Stack (확정)
Electron · electron-vite · React 18 · TypeScript (strict) · TailwindCSS · shadcn/ui · Zustand · React Flow (@xyflow/react) · d3-force · better-sqlite3 · Drizzle ORM · open-graph-scraper · react-markdown · nanoid.

## Hard Requirements
1. **3-panel layout** — Left nav rail + link list (dark) / Center graph (white, dot grid) / Right detail (white). 비율 20 / 55 / 25.
2. **Left**: New Link, New Tag, smart views(All/Favorites/Recent/Trash), tag list(색상 점 + count), collections, settings.
3. **Center**: React Flow Force-directed graph, search bar(`tag:` `url:` `memo:` 문법), filter, layout dropdown, zoom, MiniMap, legend.
4. **Node types**: Link(circle) · Tag(square) · Collection(hexagon). 클릭=상세 동기화 / 더블클릭=URL 열기 / 우클릭=Edit·Delete·Create Relation·Open URL.
5. **Relations**: related · reference · uses · supports · part_of · custom. 타입별 엣지 스타일(스펙 02 표).
6. **Right panel tabs**: Details · Relations · Notes(Markdown) · Preview(OG meta).
7. **Link creation**: 수동 폼 + URL drag-and-drop + OpenGraph 자동 수집(메인 프로세스).
8. **Database**: Drizzle schema + migration 파일 생성. better-sqlite3, userData 경로.
9. **Architecture**: feature-based 폴더 구조(04 스펙), contextIsolation 보안 경계.
10. **Generate**: 전체 프로젝트 구조, 모든 React 컴포넌트, Zustand stores, SQLite 스키마, Electron 설정, React Flow 통합, Tailwind 설정, 시드 데이터.

## 구현 순서 (Implementation Order)
1. **Scaffold**: electron-vite + TS + Tailwind + shadcn 초기화, 폴더 구조 생성.
2. **Shared**: `src/shared/types.ts`, `src/shared/ipc.ts` (채널·타입).
3. **Main/DB**: Drizzle schema → migration → client → repositories → seed.
4. **Main/IPC + services**: handlers 등록, metaFetch 서비스.
5. **Preload**: contextBridge로 `window.api` 노출 (typed).
6. **Renderer foundation**: 디자인 토큰(globals.css), AppShell 3-panel.
7. **Features**: links → tags → relations → collections (store + UI).
8. **Graph**: ReactFlow canvas, custom nodes(link/tag/collection), custom edge, d3-force layout, toolbar, minimap, legend, search/filter 연동.
9. **Detail panel**: 4 tabs.
10. **Seed + 첫 실행 흐름**, README, `npm run dev` 검증.

## 디자인 충실도
- 06_DESIGN_SYSTEM.md의 토큰(색/타이포/스페이싱)과 07_WIREFRAME_COMPONENT_TREE.md의 컴포넌트 트리를 **그대로** 따른다.
- 첨부 목업의 룩앤필(다크 좌측 레일, 보라/파랑 노드, 엣지 라벨, 미니맵)을 재현.

## 제약
- 외부 네트워크는 메타 수집 시에만. 비밀키·하드코딩 시크릿 금지.
- 모든 DB 접근은 메인 프로세스. 렌더러는 `window.api`만.
- 런어블 MVP 우선 → Hierarchical/Radial 레이아웃, 패키징은 stretch.

Focus on maintainability, scalability, clean architecture. Output code in implementation order and create all files needed for a runnable MVP.
