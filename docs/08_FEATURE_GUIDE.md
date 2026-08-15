# LinkMap — 기능 설명서

> 최종 갱신: 2026-07-08 · 대상 버전: `main` (커밋 `32f6a45` 기준)
> 이 문서는 LinkMap의 **목적, 전체 구조, 데이터 모델, 기능 전체**를 다룬다. 설계 초기 문서(`01_PRD.md` ~ `07_WIREFRAME_COMPONENT_TREE.md`)는 기획 단계 산출물이고, 본 문서는 **구현 완료 시점 기준의 실제 동작**을 정리한 사용자·개발자 겸용 레퍼런스다.

---

## 1. 프로젝트 목적

### 1.1 한 줄 요약
**LinkMap**은 웹 링크·로컬 파일·폴더·메모를 하나의 **관계형 그래프**로 저장하고 탐색하는 **로컬 우선(local-first) 데스크톱 지식 관리 앱**이다.

### 1.2 왜 만들었는가 — 문제 의식
기존 북마크 매니저(Chrome 북마크, Raindrop 등)는 **트리 구조**(폴더 → 하위 폴더 → 링크)로 정보를 담는다. 하나의 자료는 하나의 폴더에만 속할 수 있고, 자료 간의 **의미적 관계**(이 논문이 저 라이브러리의 근거다, 이 데이터시트가 저 코드의 레지스터 맵이다)는 표현할 수 없다.

LinkMap은 이를 **그래프**로 바꾼다:
- 하나의 자료(노드)가 **여러 태그·여러 폴더**에 동시에 속할 수 있다.
- 자료 간에 **타입이 있는 관계(엣지)**를 만들 수 있다 (`related`, `uses`, `part_of`, `custom`).
- 관계를 마우스로 그리듯 만들 수 있고, 그래프를 시각적으로 탐색할 수 있다.

### 1.3 대상 사용자 시나리오
초기 시드 데이터는 **하드웨어/펌웨어(HW/FW) 개발자**를 가정해 구성되어 있다 — 데이터시트 PDF, 회로도, 펌웨어 소스, 실험/측정 보고서, 로직 애널라이저 캡처, 브링업 로그 등 "웹 링크만으로는 표현되지 않는" 로컬 작업 자료가 많은 직군. 하지만 도메인에 종속되지 않으며 연구자·개발자·지식노동자 전반에 적용 가능하다.

### 1.4 핵심 차별점
| 축 | LinkMap | 비교 대상 |
|---|---|---|
| 저장 위치 | 로컬 SQLite, 100% 오프라인 | Raindrop/Recall 등은 클라우드 |
| 자료 종류 | 웹 URL + **로컬 파일/폴더 + 메모**까지 한 그래프에 | 대부분 웹 URL 전용 |
| 관계 | 사용자가 직접 만드는 **타입 있는 관계** + 그래프 시각화 | 대부분 태그/폴더뿐, 그래프 없음 |
| AI | 관계 추천은 **로컬 휴리스틱**(외부 API 없음), 기본 OFF | 있다면 대개 클라우드 종속 |

---

## 2. 기술 스택 & 아키텍처

### 2.1 스택
| 레이어 | 기술 |
|---|---|
| 쉘 | Electron 33 |
| 빌드 | electron-vite 2 (Vite 5 기반, main/preload/renderer 동시 빌드) |
| UI | React 18 + TypeScript(strict) |
| 스타일 | TailwindCSS 3 (직접 구현한 경량 UI 프리미티브, shadcn CLI 미사용) |
| 상태관리 | Zustand 5 (+ `persist` 미들웨어로 설정 영속화) |
| 그래프 렌더링 | React Flow(`@xyflow/react`) 12 |
| 그래프 레이아웃 | `d3-force`(Force) · `@dagrejs/dagre`(Hierarchical) · 자체 구현(Radial) |
| DB | SQLite 호환 — **`@libsql/client`** (better-sqlite3 아님, 아래 2.3 참조) |
| ORM | Drizzle ORM (`drizzle-orm/libsql`) |
| 메타데이터 수집 | `open-graph-scraper` + 자체 fetch 기반 본문 텍스트 추출 |
| 마크다운 | `react-markdown` + `remark-gfm` |
| 아이콘 | `lucide-react` |
| ID 생성 | `nanoid` |

### 2.2 프로세스 아키텍처 (Electron 3-프로세스 모델)
```
┌──────────────────── Main Process ─────────────────────┐
│ src/main/                                              │
│  ├─ db/        SQLite(libsql) 클라이언트, 스키마, 시드   │
│  ├─ repositories/  CRUD 로직 (linkRepo, tagRepo, ...)  │
│  ├─ services/  metaFetch(OG수집), fileContent(파일읽기) │
│  ├─ ipc/       모든 IPC 핸들러 등록                     │
│  └─ index.ts   BrowserWindow 생성, 앱 라이프사이클       │
└───────────────────────▲────────────────────────────────┘
                         │ contextBridge (IPC, 타입 공유)
┌───────────────────────┴────────────────────────────────┐
│ Preload (src/preload/index.ts)                         │
│  window.api.* 로 안전하게 노출 (contextIsolation: true)  │
└───────────────────────▲────────────────────────────────┘
                         │ window.api.*
┌───────────────────────┴────────────────────────────────┐
│ Renderer (src/renderer/) — React                        │
│  ├─ store/     Zustand: appStore(서버상태) ·             │
│  │             uiStore(UI상태) · settingsStore(영속설정)  │
│  ├─ features/  기능별 폴더 (아래 3장)                     │
│  └─ components/ui/  Button·Input·Modal·ContextMenu       │
└──────────────────────────────────────────────────────────┘
```

**보안 경계**: `contextIsolation: true`, `nodeIntegration: false`. 렌더러는 DB나 파일시스템에 **직접 접근할 수 없고**, 반드시 `window.api.*` → IPC → 메인 프로세스 경유. 파일시스템 접근(파일 읽기, 다이얼로그, 경로 열기)도 전부 메인 프로세스에서만 수행된다.

### 2.3 DB 드라이버가 `@libsql/client`인 이유
원 설계는 `better-sqlite3`였으나, 이 프로젝트의 개발 환경에 C++ 빌드 툴체인이 없어 네이티브 모듈 컴파일이 실패했다. `@libsql/client`는 **prebuilt 바이너리**를 제공하는 SQLite 호환 드라이버라 컴파일이 필요 없고 Electron ABI 리빌드도 불필요하다. 결과적으로 모든 repository 함수는 **비동기(Promise 기반)**로 작성되어 있다 (better-sqlite3였다면 동기 API였을 것).

### 2.4 데이터 저장 위치
- 첫 실행 시 `app.getPath('userData')/linkmap.db` 에 SQLite 파일 생성.
- 앱 시작 시 `initDb()`가 `CREATE TABLE IF NOT EXISTS` DDL을 실행해 스키마를 보장하고, 이어서 `MIGRATIONS` 배열의 `ALTER TABLE` 문을 각각 try/catch로 실행해 **기존 DB를 무중단으로 업그레이드**한다 (컬럼이 이미 있으면 조용히 실패하고 넘어감).
- 최초 실행이고 링크가 0개면 `seedIfEmpty()`가 HW/FW 개발자 시나리오의 데모 데이터를 채운다.

---

## 3. 폴더 구조 (feature-based)

```
12_LinkMap/
├─ src/
│  ├─ shared/              # main ↔ renderer 공유 타입/IPC 계약
│  │  ├─ types.ts          # Link, Tag, Relation, Collection, ... 도메인 타입
│  │  └─ ipc.ts             # IPC 채널명 + window.api 인터페이스
│  │
│  ├─ main/                 # Electron 메인 프로세스
│  │  ├─ index.ts           # BrowserWindow 생성, 앱 초기화
│  │  ├─ db/
│  │  │  ├─ client.ts       # libsql 연결, DDL/마이그레이션 실행
│  │  │  ├─ schema.ts       # Drizzle 테이블 정의 + raw DDL/마이그레이션 SQL
│  │  │  └─ seed.ts         # 첫 실행 데모 데이터
│  │  ├─ repositories/index.ts  # linkRepo/tagRepo/relationRepo/collectionRepo/graphRepo
│  │  ├─ services/
│  │  │  ├─ metaFetch.ts    # OpenGraph 메타 + 웹페이지 본문 텍스트 수집
│  │  │  └─ fileContent.ts  # 로컬 텍스트/코드 파일 본문 읽기(전문검색용)
│  │  └─ ipc/index.ts       # 모든 IPC 핸들러 등록
│  │
│  ├─ preload/index.ts      # contextBridge로 window.api 노출
│  │
│  └─ renderer/
│     ├─ index.html
│     ├─ public/icon.png    # 앱 아이콘 (dev 서버 파비콘용)
│     └─ src/
│        ├─ App.tsx          # 최상위: 데이터 로드, 단축키, 파일 드롭 처리
│        ├─ main.tsx
│        ├─ app/layout/AppShell.tsx   # 4단 리사이저블 그리드 레이아웃
│        ├─ store/
│        │  ├─ appStore.ts      # 서버 상태(그래프 스냅샷, CRUD 액션들)
│        │  ├─ uiStore.ts       # 선택 상태, 다이얼로그 열림 여부, 검색어 등
│        │  └─ settingsStore.ts # 영속 설정(토글, 저장 필터, 패널 너비)
│        ├─ features/
│        │  ├─ navigation/LeftRail.tsx     # 좌측 사이드바(스마트뷰/폴더트리/태그)
│        │  ├─ links/                       # 링크 리스트, 카드, 폼, 가시성 필터링
│        │  ├─ graph/                        # React Flow 캔버스, 노드/엣지, 레이아웃
│        │  ├─ detail/                       # 우측 상세 패널 4탭
│        │  ├─ tags/TagFormDialog.tsx
│        │  ├─ collections/                  # 폴더 생성/선택 다이얼로그
│        │  ├─ relations/RelationDialog.tsx
│        │  └─ settings/SettingsDialog.tsx
│        ├─ components/ui/    # Button, Input, Modal, ContextMenu (자체 구현)
│        ├─ lib/
│        │  ├─ search.ts          # 검색 쿼리 파서(AND/OR) + 매칭 + 스니펫
│        │  ├─ suggestRelations.ts # 로컬 휴리스틱 관계 추천 엔진
│        │  ├─ openLink.ts        # kind별 열기 분기(브라우저 vs OS 앱)
│        │  └─ utils.ts
│        └─ styles/globals.css
│
├─ docs/                    # 기획~구현 문서 (01~08)
├─ resources/icon.png       # 런타임 창 아이콘 원본
├─ build/icon.png           # electron-builder 패키징용 아이콘 소스
├─ electron.vite.config.ts
├─ electron-builder.yml
└─ package.json
```

---

## 4. 데이터 모델

### 4.1 엔티티 관계도
```
Link ─┬─< LinkTag >─┬─ Tag
      │
      ├─< Relation >── (Link | Tag | Collection)   # 자기+타 종류 참조, source/targetKind로 구분
      │
      └─< CollectionLink >── Collection ──self FK── Collection (parentId, 폴더 안 폴더)
```

### 4.2 테이블 (SQLite)

**`links`** — 모든 노드(웹/파일/폴더/메모)의 본체
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | TEXT PK | nanoid |
| `kind` | TEXT | `web` \| `file` \| `folder` \| `note` |
| `title` | TEXT | |
| `url` | TEXT | web=URL, file/folder=절대경로, note=빈 문자열 |
| `description` | TEXT? | |
| `favicon` / `thumbnail` | TEXT? | web만 해당(자동 수집) |
| `note` | TEXT? | 사용자 메모(Markdown). `kind=note`일 때는 이 필드가 본문 |
| `content` | TEXT? | **전문검색용** 본문 텍스트(웹페이지 본문 또는 텍스트/코드 파일 내용, 최대 4000~8000자) |
| `domain` | TEXT? | web=호스트명, file/folder=상위 디렉터리, note=null |
| `favorite` | INTEGER(bool) | |
| `deletedAt` | INTEGER? | soft delete(휴지통). null이면 활성 |
| `createdAt` / `updatedAt` | INTEGER | epoch ms |

**`tags`** — `id, name, color(hex)`
**`collections`** — `id, name, parentId(self FK, ON DELETE CASCADE), createdAt` — 폴더 트리
**`link_tags`** — N:M 조인 (`linkId, tagId`, PK 복합)
**`collection_links`** — N:M 조인 (`collectionId, linkId`, PK 복합) — 하나의 링크가 여러 폴더에 속할 수 있음
**`relations`** — `id, sourceId, sourceKind, targetId, targetKind, type, label, createdAt`
  - `sourceKind`/`targetKind` ∈ `link | tag | collection` — 관계는 링크-링크뿐 아니라 **태그↔링크, 폴더↔링크**도 가능
  - `type` ∈ `related | uses | part_of | custom` (UI 노출 기준. `reference`/`supports`는 구버전 데이터 렌더 호환용으로만 남아있음)
  - `label`은 엣지에 표시되는 자유 텍스트(예: "provides", "developed by")

### 4.3 IPC 계약 (`src/shared/ipc.ts`)
렌더러는 아래 `window.api.*` 메서드만 호출 가능하며, 전부 메인 프로세스의 대응 repository로 라우팅된다.

| 카테고리 | 메서드 |
|---|---|
| 그래프 전체 | `getSnapshot()`, `getCounts()` |
| 링크 | `createLink`, `updateLink`, `trashLink`, `restoreLink`, `deleteLink`, `toggleFavorite` |
| 태그 | `createTag`, `updateTag`, `deleteTag` |
| 관계 | `createRelation`, `deleteRelation` |
| 컬렉션 | `createCollection`, `deleteCollection`, `moveCollection`, `addLinkToCollection`, `removeLinkFromCollection` |
| 메타/파일 | `fetchMeta`, `openExternal`, `openPath`, `pickPaths`, `pathInfo`, `getPathForFile`, `copyText` |

`getSnapshot()`은 **모든 데이터를 한 번에** 반환한다(`GraphSnapshot`: links·tags·collections·relations·linkTags·collectionLinks). 렌더러는 모든 변경 작업 후 스냅샷을 다시 받아 `appStore`를 갱신한다(낙관적 업데이트 없음 — 단순함 우선).

---

## 5. 화면 구조 (4단 레이아웃)

```
┌──────────┬─────────────┬──────────────────────────┬──────────────┐
│ 좌측 레일 │ 링크 목록    │ 그래프 캔버스              │ 상세 패널     │
│ (다크)    │ (라이트)     │ (라이트, 도트 그리드)       │ (라이트)      │
│ 220px*    │ 248px*       │ 나머지 전체                │ 320px 고정    │
└──────────┴─────────────┴──────────────────────────┴──────────────┘
   ↕ 리사이저(드래그로 너비 조절, *=설정에 영속 저장)      ↕ 리사이저
```
각 패널 사이에 **드래그 가능한 리사이저**가 있어 좌측 레일·링크목록 너비를 조절할 수 있고, 이 값은 `settingsStore`에 영속 저장된다. 그래프 패널은 `minmax(0,1fr)`로 나머지 공간을 모두 차지하며, 상세 패널은 320px 고정.

---

## 6. 기능 상세

### 6.1 좌측 사이드바 (`LeftRail`)
- **상단 액션**: `+ 새 링크 추가`(primary), `+ 새 메모` / `+ 새 태그`(보조, 나란히 배치)
- **스마트 뷰**: 모든 링크 · 즐겨찾기 · 최근 추가(7일 이내) · 휴지통 — 각각 실시간 카운트 표시
- **폴더(컬렉션) 섹션** (태그 섹션보다 위에 배치)
  - **중첩 트리** — 폴더 안에 폴더를 만들 수 있다(`parentId`). ▸/▾ 로 펼치기/접기.
  - 섹션 라벨 자체도 ▾ 클릭으로 **전체 접기** 가능.
  - 폴더 hover 시 `+`(하위 폴더 추가), 우클릭 메뉴(하위 컬렉션 추가 / 컬렉션 삭제 — 하위까지 cascade).
  - **드래그로 폴더 재배치**: 폴더를 다른 폴더 위로 끌면 그 하위로 이동. 드래그 중 나타나는 "↥ 최상위로" 드롭존에 놓으면 루트로. 자기 자신/자기 하위로는 드롭 불가(사이클 방지).
  - **폴더 선택 시**: 그 폴더 + 모든 하위 폴더에 속한 링크가 링크 목록에 표시됨.
- **태그 섹션** (폴더 아래)
  - 색상 점 + 이름 + 카운트. 클릭 시 해당 태그의 링크만 필터링.
  - 섹션 전체 접기 가능.
  - 우클릭 → 태그 삭제.
  - **링크를 태그 위로 드래그하면 그 태그가 부여됨** (다중 선택 상태에서 드래그하면 선택된 전체에 일괄 부여).
- **하단**: 설정 버튼(⚙️) → `SettingsDialog` 오픈.
- 좌우 스크롤 이슈 수정: 그리드 행에 `minmax(0,1fr)` + 각 패널에 `min-h-0 overflow-hidden`을 적용해 내용이 넘칠 때 마우스 휠 스크롤이 정상 동작하도록 처리됨.

### 6.2 링크 목록 (`LinkListColumn`)
- 현재 선택된 뷰(전체/즐겨찾기/최근/휴지통/태그/폴더)에 해당하는 링크를 카드 리스트로 표시.
- **목록 내 검색**(제목/URL 부분일치, 그래프 검색과 별개의 로컬 필터).
- **정렬**: 헤더 `⋮` 메뉴 → 기본 순서 / 이름순(가나다) / 최근순.
- **다중 선택**:
  - `Ctrl/⌘+클릭` = 토글 선택, `Shift+클릭` = 마지막 앵커부터 범위 선택.
  - 또는 헤더 `⋮` → "항목 선택 (일괄)" → 각 카드에 체크박스 표시, "모두 선택" 지원.
  - 선택 상태에서 하단에 **일괄 작업 바**가 나타남: 휴지통으로 / (휴지통 뷰에서) 복원·영구삭제 / (태그·폴더 뷰에서) "이 태그·폴더에서 제외".
- **드래그 앤 드롭**: 카드를 좌측 폴더나 태그 위로 끌어 놓으면 담기/부여. 다중 선택 중이면 **선택된 전체**가 함께 이동.
- **개별 카드 우클릭**: 열기 / 편집 / 컬렉션에 추가 / (컨텍스트에 따라) 태그·폴더에서 제외 / 휴지통으로(또는 복원·영구삭제).
- **휴지통 뷰 전용**: 헤더에 "비우기" 버튼(전체 영구 삭제, 확인창).
- 카드 표시 정보: 파비콘/파일·폴더·메모 아이콘 · 제목 · **설명(없으면 도메인 또는 URL)** · 검색어가 본문에서만 매칭됐을 때의 하이라이트 스니펫.

### 6.3 그래프 캔버스 (`GraphPanel` + `GraphCanvas`)
React Flow 기반 인터랙티브 그래프. 핵심 상호작용:

**노드 타입 (3종)**
| 타입 | 모양 | 설명 |
|---|---|---|
| Link | 원형 | web(favicon)/file(청록 파일 아이콘)/folder(주황 폴더 아이콘)/note(노란 포스트잇 스타일) — 연결 수(degree)에 따라 크기 40~76px로 가변 |
| Tag | 사각형 | 태그 색 배경 |
| Collection | 육각형 | 폴더 |

**엣지(관계) 스타일**
| type | 색 | 선 |
|---|---|---|
| `related` | 보라 | 실선 |
| `uses` | 파랑 | 실선 |
| `part_of` | 초록 | 실선 |
| `custom` | 회색 | 점선 |
| (컬렉션 멤버십, "포함"/"하위") | 회색 | 점선, 화살표 없음, 투명도 낮춤 |
| (태그 멤버십, "태그") | 회색 | 점선 |

**레이아웃 3종** (toolbar 드롭다운)
- **Force** (기본) — `d3-force`, charge/link/center/collide 시뮬레이션 320틱.
- **Hierarchical** — `@dagrejs/dagre` 레이어드 배치(rankdir TB), 노드 크기 기반 간격, 엣지 교차 최소화.
- **Radial** — 최다 연결 노드를 중심에 두고 BFS 그래프 거리로 동심원 배치, 링별 노드 수에 맞춰 반지름 자동 확장.
- 레이아웃 전환 시 캐시된 위치를 무시하고 새로 계산 + `fitView`로 화면 재조정. 같은 레이아웃 안에서 드래그한 위치는 유지됨.

**노드 인터랙션**
- **클릭** → 우측 상세 패널에 동기화, 링크 목록에서도 하이라이트.
- **더블클릭** → kind에 맞게 열기(web=브라우저, file/folder=OS 기본 앱/탐색기, note=동작 없음).
- **우클릭** → 컨텍스트 메뉴: 관계 추가 / 열기(kind별) / 컬렉션에 추가 / 편집 / 휴지통으로(링크) · 태그 삭제(태그) · 컬렉션 삭제(폴더).
- **hover 시 상하에 연결 핸들(점)이 나타나며, 다른 노드로 드래그하면 관계 생성 다이얼로그가 열림**(출발/도착 노드가 이미 채워진 채 타입·라벨만 선택하면 됨). `ConnectionMode.Loose`라 정확한 핸들이 아니어도 노드 아무 곳에 놓으면 연결된다.
- 노드 드래그로 자유 배치 가능, 위치는 세션 내 유지.

**툴바**
- **검색창** — 아래 6.6절의 AND/OR 쿼리 문법 지원, 실시간 필터.
- **필터 버튼** — 저장된 필터 프리셋 목록(선택 시 즉시 적용, 개별 삭제 가능) + "현재 검색을 필터로 저장".
- **레이아웃 드롭다운**.
- **미니맵**(우하단, 노드 종류별 색상 미리보기), **범례**(좌하단, 관계 타입별 선 스타일), **줌 컨트롤**(React Flow 기본 Controls).

### 6.4 상세 패널 (`DetailPanel`, 4탭)
링크(또는 메모) 노드를 선택하면 우측에 표시. 태그/폴더 노드 선택 시엔 "링크 노드를 선택하면 상세가 표시됩니다" 안내만 노출(현재 태그/폴더 자체의 상세 편집 UI는 없음).

**상세 정보 탭**
- 제목, URL/경로(웹은 "URL", 파일/폴더는 "경로", 메모는 숨김) — 클릭 시 kind별로 열기, 옆에 **복사 버튼**(Electron clipboard IPC, 복사 시 아이콘이 잠깐 체크 표시로 전환).
- 설명.
- **태그**: 부여된 태그 chip(클릭하여 제거) + `+` 버튼으로 추가 팝오버(클릭식 — 바깥 클릭 시 닫힘, 이전엔 hover식이라 커서 이동 시 사라지는 문제가 있었음).
- 도메인/위치(메모는 숨김), 생성일, 수정일.
- **즐겨찾기 토글**.
- **빠른 작업**: 컬렉션에 추가 / 편집 / 새 링크 추가.

**관계 탭**
- "관계 추가" 버튼(수동, 대상 링크 검색 선택 UI).
- **AI 관계 추천** (설정에서 ON일 때만 표시) — 아래 6.7절 참조. 추천 항목마다 "추가"/"무시" 버튼.
- 기존 관계 목록: 방향(→/←)·타입 배지·라벨과 함께 표시, 클릭 시 해당 노드로 이동, 삭제 가능.

**메모 탭**
- Markdown 편집/미리보기 토글. `react-markdown` + `remark-gfm`으로 렌더링.

**미리보기 탭**
- favicon, thumbnail, 메타 제목/설명 표시. "메타데이터 다시 수집" 버튼(웹 링크만) — `metaFetch`를 재호출해 OG 정보와 본문 텍스트를 새로 가져옴.

### 6.5 링크/메모 추가 폼 (`LinkFormDialog`)
하나의 다이얼로그가 **일반 링크 편집**과 **메모 편집**을 겸한다(`kind`에 따라 필드 분기).

- **종류 탭** (메모가 아닐 때만 표시): 웹 / 파일 선택 / 폴더 선택.
  - 파일·폴더 선택은 OS 네이티브 다이얼로그(`dialog.showOpenDialog`) 호출.
  - 파일 선택 시 텍스트/코드 파일이면 본문을 자동으로 읽어 `content`에 채움(전문검색용, 6.6절 참조).
- **URL/경로 입력** + **"자동 수집"** 버튼(웹만) — OpenGraph 메타(제목/설명/파비콘/썸네일) + 페이지 본문 텍스트를 병렬로 fetch.
- **제목**, **설명**(또는 메모는 **내용** textarea, Markdown).
- **태그**: 기존 태그 토글 선택 + **"새 태그" 인라인 생성** — 클릭 시 입력창이 나타나고 Enter로 즉시 생성+선택(동일 이름 존재 시 재사용), Esc로 취소. 색상은 팔레트에서 자동 순환 배정.
- **폴더(컬렉션) 선택** — 트리 들여쓰기로 표시된 체크박스 목록. 저장 시 선택한 폴더 집합과 실제 멤버십을 diff해 추가/제거를 동기화.
- 드래그 앤 드롭으로 앱 창에 파일/URL을 끌어다 놓으면 이 폼이 프리필된 채로 자동으로 열림(파일 여러 개를 한 번에 놓으면 폼 없이 일괄 생성).
- 폼 상태는 `open`/`editId` 기준으로만 초기화되며, 편집 중 백그라운드에서 데이터가 refresh돼도(예: 다른 곳에서 태그 생성) **입력 중이던 내용이 리셋되지 않는다**(과거 버그 수정됨).

### 6.6 검색 (그래프 툴바 검색창)
`src/renderer/src/lib/search.ts`가 파서와 매칭 로직을 담당.

**문법**
| 표기 | 의미 |
|---|---|
| `키워드1 키워드2` (공백) | **AND** — 모든 키워드가 포함되어야 매칭 |
| `"정확한 구절"` | 따옴표로 감싼 구절을 통째로 하나의 키워드로 취급 |
| `조건A, 조건B` (콤마) | **OR** — 그룹 단위로 콤마 분리, 그룹 간은 OR (그룹 내부는 AND) |
| `tag:이름` | 태그 이름 부분일치 |
| `url:문자열` | URL 부분일치 |
| `memo:문자열` | 메모(note) 부분일치 |

예: `MCU datasheet, tag:RTOS` → ("MCU"와 "datasheet"가 모두 포함) **또는** (RTOS 태그가 있음).

**매칭 대상**: 제목, URL, 설명, 메모(note), **본문(content, 전문검색)**.

**검색 결과 표시 방식** — 설정(6.8절)의 "비매칭 항목 숨기기" 토글로 두 모드 전환:
- **강조 모드(기본)**: 매칭 안 된 노드를 그래프에서 흐리게(opacity 0.2) 표시.
- **숨김 모드**: 매칭 안 된 노드를 그래프에서 완전히 제거.
- 두 모드 모두 다음을 **함께 유지**한다: 매칭된 링크의 태그·소속 폴더(상위 폴더 체인까지), 이름이 검색어와 매칭된 태그/폴더와 **그 태그가 달린 모든 링크** — 검색해도 그래프 맥락이 끊기지 않도록.

**전문검색(본문) 수집 범위**
- 웹 링크: `metaFetch`가 페이지 HTML을 가져와 스크립트/스타일 제거 후 텍스트만 추출, 최대 4000자.
- 로컬 파일: `fileContent.ts`가 **텍스트/코드 확장자 화이트리스트**(`.md .txt .json .yml .ts .tsx .js .py .go .rs .java .c .cpp .cs .php .sql .html .css` 등 60여종)에 해당하고 2MB 이하인 파일만 읽어 최대 8000자 저장. PDF·이미지·바이너리·폴더는 본문 색인 대상이 아님(제목/경로로만 검색 가능).
- 검색 결과 카드에 매칭 위치가 본문일 때 **"본문" 배지 + 주변 스니펫 + 하이라이트**가 표시됨.

### 6.7 AI 관계 추천 (`suggestRelations.ts`)
- **기본 OFF**, 설정에서 켜야 상세 패널의 관계 탭에 노출됨.
- 정직하게 밝히면: **외부 AI API를 쓰지 않는다.** 완전히 로컬·오프라인으로 동작하는 휴리스틱 스코어링이다.
- 점수 계산 (대상 링크 기준으로 다른 모든 링크와 비교):
  - 공유 태그 1개당 **+3점**
  - 같은 도메인이면 **+2점**
  - 제목 토큰(3글자 이상, 불용어 제외) 겹침 1개당 **+1점**
  - 이미 관계가 있거나 "무시"한 링크는 후보에서 제외
- 상위 4개를 점수순으로 제시, 각각 사유(예: "태그 2개 공유 · 같은 도메인")와 함께 "추가"(관계 타입 `related`로 즉시 생성) / "무시"(현재 세션 동안만 후보에서 제외) 버튼 제공.

### 6.8 설정 (`SettingsDialog`)
좌하단 ⚙️로 접근. 모두 `settingsStore`에 영속 저장(localStorage, `persist` 미들웨어).

| 설정 | 기본값 | 설명 |
|---|---|---|
| AI 관계 추천 | OFF | 6.7절 |
| 그래프에 태그 노드 표시 | ON | 끄면 링크-링크 관계에만 집중(태그 노이즈 제거) |
| 그래프에 컬렉션 표시 | ON | 끄면 폴더 노드/멤버십 엣지 숨김 |
| 검색/필터 시 비매칭 항목 숨기기 | OFF(=강조 모드) | 6.6절 |

패널 너비(`railWidth`, `listWidth`)와 저장된 필터 목록(`savedFilters`)도 같은 스토어에 영속화되지만 별도 UI 토글은 아니고 리사이저/필터 버튼 조작으로 갱신된다.

### 6.9 관계(Relation) 생성 경로 3가지
1. **수동**: 상세 패널 관계 탭 → "관계 추가" → 대상 검색 → 타입/라벨 선택.
2. **그래프 드래그**: 노드 hover 시 나타나는 핸들을 다른 노드로 드래그 → 다이얼로그가 출발/도착이 채워진 채로 열림.
3. **그래프 우클릭**: "관계 추가" → 대상을 다이얼로그에서 검색 선택.
4. (참고) AI 추천에서 "추가"를 누르면 `related` 타입으로 즉시 생성(다이얼로그 없이).

### 6.10 컬렉션(폴더) 상세
- **폴더 안 폴더**(무제한 depth) 지원. `parentId` self-FK, 삭제 시 하위 폴더까지 `ON DELETE CASCADE`.
- 하나의 링크가 **여러 폴더**에 동시에 소속 가능(N:M).
- 담기 경로: 드래그 앤 드롭(단일/다중), 상세 패널 "컬렉션에 추가" 피커, 그래프 노드 우클릭, 링크 추가/편집 폼의 체크박스, 링크 목록 우클릭.
- 폴더를 그래프에 표시하면(설정 ON) 상위→하위 관계가 점선 "하위" 엣지로, 소속 링크는 점선 "포함" 엣지로 시각화됨.

### 6.11 파일/폴더/메모 지원 상세
| kind | 생성 방법 | 열기 동작 | 특이사항 |
|---|---|---|---|
| `web` | URL 입력 또는 URL 드롭 | 기본 브라우저(`shell.openExternal`) | OG 메타/본문 자동 수집 |
| `file` | 네이티브 파일 선택 다이얼로그 또는 탐색기에서 드롭(다중 가능) | OS 기본 연결 프로그램(`shell.openPath`) | 텍스트/코드 파일이면 본문 자동 색인 |
| `folder` | 네이티브 폴더 선택 다이얼로그 또는 탐색기에서 드롭 | 탐색기(`shell.openPath`) | 본문 색인 없음(제목/경로만 검색) |
| `note` | "새 메모" 버튼 | 없음(URL 없음) | 그래프에 노란 포스트잇 노드로 렌더 |

**드래그 앤 드롭 규칙**: 탐색기에서 파일 1개를 놓으면 프리필된 폼이 열리고, 2개 이상을 놓으면 폼 없이 즉시 일괄 생성 후 첫 항목으로 포커스 이동. 앱 내부(폴더 이동, 링크→폴더/태그 드래그)는 커스텀 MIME 타입(`application/x-linkmap-*`)으로 구분되어 외부 파일 드롭 오버레이와 충돌하지 않는다.

---

## 7. 완료된 기능 연혁 (요약)

개발은 MVP → 반복 피드백 순서로 진행되었다. 주요 마일스톤:

1. **MVP**: 3(4)단 레이아웃, 링크 CRUD, 태그, 관계(6종→4종 단순화), Force 그래프, SQLite 영속화.
2. **파일/폴더 링크**: 로컬 파일·폴더를 노드로 (드롭/네이티브 피커/열기).
3. **레이아웃 고도화**: Hierarchical(dagre)·Radial(다중 동심원) 정식 구현, 레이아웃 전환 버그 수정.
4. **컬렉션 활성화**: 생성/삭제/담기 UI, 그래프 시각화, **중첩 폴더**, **드래그로 폴더 이동**, **링크→폴더 드래그**.
5. **삭제 기능 전반**: 사이드바 우클릭 삭제, 링크 목록 일괄 선택 삭제, 휴지통 비우기.
6. **검색·필터 고도화**: 전문검색(본문 색인, 웹+텍스트파일), AND/OR 쿼리 문법, 매칭 태그/폴더 유지, 강조↔숨김 모드, 필터 저장/불러오기.
7. **그래프 상호작용**: 마우스 드래그로 관계 생성(onConnect), 메모 노드(kind=note), 다중 선택 드래그.
8. **UX 다듬기**: 스크롤 버그 수정, 태그 추가 팝오버 클릭식 전환, 링크 추가 시 폴더 선택, 다중 선택(Shift/Ctrl), 정렬, 카드 2번째 줄 설명 표시, 패널 리사이즈, 편집 폼 리셋 버그 수정.
9. **브랜딩**: 커스텀 앱 아이콘 적용(창/작업표시줄/패키징).

각 기능의 커밋 이력은 `git log --oneline`으로 확인 가능하다.

---

## 8. 알려진 제약 / 미구현 (Out of Scope, v1)

- **브라우저 익스텍션 없음** — 웹 페이지 저장은 드래그 앤 드롭 또는 수동 폼 입력만 가능.
- **페이지 아카이빙/스냅샷 없음** — 원본 URL이 죽으면 (본문 색인이 있다면 텍스트는 검색되지만) 페이지 자체를 다시 볼 수는 없음.
- **가져오기/내보내기(Import/Export) 없음** — Chrome/Raindrop 북마크 마이그레이션 불가, 백업은 SQLite 파일을 직접 복사해야 함.
- **동기화/멀티디바이스 없음** — 완전 로컬 단일 기기용.
- **AI 관계 추천은 로컬 휴리스틱**이며 실제 LLM 기반 의미 분석은 아님.
- **데드링크 체크 없음** — 저장된 URL의 생존 여부를 주기적으로 확인하지 않음.
- **중복 링크 감지 없음** — 같은 URL을 여러 번 저장해도 경고 없음.
- **패키징(설치 파일 배포) 미검증** — `npm run package`(electron-builder) 스크립트는 있으나 이 프로젝트에서 실제 배포 빌드까지 검증되지는 않음(개발 모드 `npm run dev` 위주로 사용).
- **태그/컬렉션 노드 자체의 상세 편집 UI 없음** — 이름 변경은 우클릭 삭제 후 재생성으로만 가능(수정 API는 존재하나 UI 미연결).

---

## 9. 실행 방법

```bash
npm install      # @libsql/client 등 prebuilt 바이너리 — C++ 컴파일러 불필요
npm run dev       # 개발 모드 (HMR)
npm run build     # 프로덕션 번들 (out/)
npm run typecheck # 메인+렌더러 타입 검사
npm run package   # electron-builder 패키징 (dist/) — win/mac/linux 아이콘 자동 생성
```
첫 실행 시 `%APPDATA%/linkmap/linkmap.db`(Windows 기준)에 DB가 생성되고 HW/FW 데모 데이터가 시드된다.

---

## 10. 문서 지도

| 문서 | 내용 |
|---|---|
| `01_PRD.md` | 최초 제품 요구사항(기획 단계) |
| `02_UI_UX_SPEC.md` | 초기 UX 스펙(기획 단계) |
| `03_DATA_MODEL.md` | 초기 데이터 모델 설계(기획 단계, 이후 확장됨 — 4장이 최신) |
| `04_TECH_SPEC.md` | 초기 기술 스펙(기획 단계) |
| `05_CLAUDE_BUILD_PROMPT.md` | 최초 구현 진입 프롬프트 |
| `06_DESIGN_SYSTEM.md` | 색상/타이포 디자인 토큰 |
| `07_WIREFRAME_COMPONENT_TREE.md` | 초기 와이어프레임 + 컴포넌트 트리 |
| **`08_FEATURE_GUIDE.md`** | **본 문서 — 구현 완료 기준 종합 기능 설명서** |
| `README.md` | 저장소 최상위 요약 + 빠른 시작 |
