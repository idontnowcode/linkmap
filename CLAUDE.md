# 12_LinkMap

관계형 북마크 그래프 매니저 (Electron 데스크톱).

## 현재 상태
- **Phase**: Design (스펙 + 디자인 시스템 + 와이어프레임 완료) → **사용자 승인 대기 중**
- 승인 후 Scaffold → Build (구현 순서는 `docs/05_CLAUDE_BUILD_PROMPT.md`).

## 문서 (읽는 순서)
- `docs/01_PRD.md` — 제품 요구사항
- `docs/02_UI_UX_SPEC.md` — 3-panel UX, 노드/엣지/검색 사양
- `docs/03_DATA_MODEL.md` — Drizzle/SQLite 스키마
- `docs/04_TECH_SPEC.md` — 스택·아키텍처·폴더 구조
- `docs/05_CLAUDE_BUILD_PROMPT.md` — **구현 진입점** (Claude는 여기부터)
- `docs/06_DESIGN_SYSTEM.md` — 색/타이포/노드 토큰
- `docs/07_WIREFRAME_COMPONENT_TREE.md` — 와이어프레임 + 컴포넌트 트리

## 스택
Electron · electron-vite · React 18 · TS(strict) · Tailwind · shadcn/ui · Zustand · React Flow · d3-force · better-sqlite3 · Drizzle.
