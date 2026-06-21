# 04 — Technical Spec

## 1. 스택
| 영역 | 선택 | 비고 |
|---|---|---|
| 셸 | **Electron** | 데스크톱 (Win/macOS) |
| 빌드 | **Vite** + `electron-vite` | HMR, main/preload/renderer 동시 빌드 |
| UI | **React 18 + TypeScript (strict)** | |
| 스타일 | **TailwindCSS** + **shadcn/ui** | 디자인 토큰은 06_DESIGN_SYSTEM |
| 상태 | **Zustand** | feature별 store 분리 |
| 그래프 | **React Flow (@xyflow/react)** | 커스텀 노드/엣지 + 미니맵 |
| 레이아웃 시뮬 | **d3-force** | Force-directed 좌표 계산 |
| DB | **SQLite** (`better-sqlite3`) | 메인 프로세스 전용, 동기 API |
| ORM | **Drizzle ORM** + `drizzle-kit` | 마이그레이션 파일 생성 |
| 메타 수집 | `open-graph-scraper` (또는 cheerio 파싱) | 메인 프로세스에서 fetch |
| Markdown | `react-markdown` + `remark-gfm` | 메모 렌더 |
| id | `nanoid` | |

## 2. 프로세스 아키텍처
```
┌─────────────── Electron Main ───────────────┐
│ better-sqlite3 + Drizzle (repositories)      │
│ OG meta fetch (open-graph-scraper)           │
│ IPC handlers: links/tags/relations/meta      │
└───────────────▲──────────────────────────────┘
                │ contextBridge (preload, typed window.api)
┌───────────────┴──────────────────────────────┐
│ Renderer (React)                              │
│ Zustand stores ── React Flow canvas ── shadcn │
└───────────────────────────────────────────────┘
```
- **보안**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. 렌더러에서 Node/DB 직접 접근 금지. 외부 링크는 `shell.openExternal` (main).
- preload는 화이트리스트 채널만 노출. 타입은 `src/shared/ipc.ts`에서 공유.

## 3. Feature-based 폴더 구조
```
12_LinkMap/
├─ electron.vite.config.ts
├─ drizzle.config.ts
├─ package.json
├─ tailwind.config.ts
├─ docs/                      # 본 스펙 문서들
└─ src/
   ├─ main/                   # Electron main
   │  ├─ index.ts             # app/BrowserWindow
   │  ├─ db/
   │  │  ├─ client.ts         # better-sqlite3 + drizzle
   │  │  ├─ schema.ts
   │  │  └─ seed.ts
   │  ├─ repositories/        # linkRepo, tagRepo, relationRepo, collectionRepo
   │  ├─ services/            # metaFetch.ts (OpenGraph)
   │  └─ ipc/                 # handlers register
   ├─ preload/
   │  └─ index.ts             # contextBridge → window.api
   ├─ shared/
   │  ├─ ipc.ts               # channel 이름 + 요청/응답 타입
   │  └─ types.ts             # 도메인 타입 (Link, Tag, Relation...)
   └─ renderer/
      ├─ main.tsx
      ├─ App.tsx              # 3-panel 레이아웃
      ├─ app/
      │  ├─ layout/           # AppShell, LeftRail, LinkList, DetailPanel
      │  └─ providers/
      ├─ features/
      │  ├─ links/            # store, components, hooks
      │  ├─ tags/
      │  ├─ relations/
      │  ├─ collections/
      │  └─ graph/            # ReactFlow canvas, custom nodes/edges, layout(d3-force), minimap, toolbar
      ├─ components/ui/       # shadcn 컴포넌트
      ├─ lib/                 # api client(window.api wrapper), search parser, utils
      └─ styles/              # globals.css, tokens
```

## 4. 상태(Zustand) 구성
- `useLinksStore` — links, CRUD, 선택된 linkId, 필터된 목록.
- `useTagsStore` — tags, CRUD, 활성 태그 필터.
- `useGraphStore` — nodes/edges, layout 모드, viewport, 검색 쿼리 파싱 결과.
- `useUiStore` — 활성 우측 탭, 패널 열림, 컨텍스트 메뉴 상태.
- 비동기 액션은 `window.api` 호출 → 결과로 store 갱신(낙관적 업데이트 + 실패 롤백).

## 5. 검색 파서
- 입력 문자열 → 토큰화: `tag:`, `url:`, `memo:`, 그 외 자유 텍스트.
- 결과: `{ text, tags[], urlIncludes, memoIncludes }` → links 필터 + graph 하이라이트.

## 6. 그래프 레이아웃 (3종 모두 구현 완료)
- **Force**: `d3-force` (forceManyBody + forceLink + forceCenter + forceCollide)로 좌표 산출.
- **Hierarchical**: `@dagrejs/dagre` 레이어드 레이아웃(rankdir TB, 노드 크기 기반 간격, 교차 최소화). dagre 중심좌표 → React Flow top-left 변환.
- **Radial**: 최다 연결 노드 중심, BFS 그래프 거리로 동심원 링 배치. 각 링은 노드 수에 맞춰 반지름 확대(겹침 방지), 비연결 노드는 최외곽 링.
- 노드 드래그 시 위치 캐시 유지. **레이아웃 전환 시 캐시 무시 + 새 좌표 적용 + fitView** 재정렬.

## 7. 메타 수집 플로우
1. 렌더러: URL 입력/드롭 → `window.api.meta.fetch(url)`
2. 메인: `open-graph-scraper`로 title/description/image/favicon 추출(타임아웃 5s).
3. 실패 시 fallback: `title = hostname`, favicon = `https://www.google.com/s2/favicons?domain=...` 또는 이니셜.
4. 결과로 폼 프리필 → 사용자가 확인 후 저장.

## 8. 빌드/실행
```bash
npm install
npm run dev          # electron-vite dev (HMR)
npm run db:generate  # drizzle-kit generate (마이그레이션)
npm run db:migrate   # 마이그레이션 적용
npm run build        # 프로덕션 번들
npm run package      # electron-builder 패키징 (v1 stretch)
```
- DB 파일 경로: `app.getPath('userData')/linkmap.db`. 최초 실행 시 마이그레이션 + 시드.

## 9. 품질 가드
- TS strict, ESLint, Prettier.
- 경계 테스트: repository 단위(better-sqlite3 in-memory) + 검색 파서 유닛 테스트(Vitest).
- E2E(Playwright Electron)는 stretch — 스모크(앱 부팅, 노드 1개 생성).
