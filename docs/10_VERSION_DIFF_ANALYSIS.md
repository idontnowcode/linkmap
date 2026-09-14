# 10. 버전 Diff 분석 — 기존(12_LinkMap) vs 신규(참고, `C:\Users\admin\Desktop\Linkmap`)

> 작성일: 2026-09-15
> 목적: 사용자가 별도 세션/도구로 개발한 `C:\Users\admin\Desktop\Linkmap`(이하 "신규")을 참고하여, 이 저장소의 `12_LinkMap`(이하 "기존", git `main` `0a6b876`까지 push 완료)을 업데이트하기 위한 기초 분석.
> **중요 결론**: 신규 버전은 기존 버전의 상위 호환(superset)이 아니다. **그래프 캔버스/관계(Relations)/컬렉션(중첩 폴더 트리) 기능이 의도적으로 완전히 제거**되고, 대신 **태그 계층 + 폴더 가져오기/동기화 + 리치 파일 미리보기**로 대체된, 사실상 다른 설계 철학의 앱이다. "최신화"는 단순 이식이 아니라 기능 절충 결정이 필요하다.

---

## 0. 배경 — 신규 버전의 계보

신규 버전 소스 주석에 반복적으로 기록된 내용:
- 신규 버전은 **"Integrated_Mast"**라는 더 큰 통합 런처형 앱(여러 패널/트레이 상주/전역 단축키 보유)에서 LinkMap 기능만 떼어낸 **독립 추출 버전**이다.
- 그 통합 앱을 만들 때 "원본 LinkMap"(우리 `12_LinkMap`과 유사 계보로 추정)에 있던 **컬렉션(트리)과 관계(Relations, 그래프)를 의도적으로 제거**하고 태그 하나로 통합했다 — `db.js`, `store.ts` 주석에 명시.
- DB 파일도 `%APPDATA%\linkmap\linkmap.db`(구버전 공유 경로, 우리 기존 버전과 동일 경로) → `%APPDATA%\linkmap-app\linkmap.db`(신규 전용)로 분리했고, **구버전 DB(컬렉션/관계 테이블 포함)를 열어도 안전하게 태그로 변환하는 마이그레이션 로직**을 갖추고 있다 — 즉 신규 개발자도 우리 기존 버전과 같은 스키마 계보를 인지하고 있었다는 강한 근거.
- 검색 파서의 콤마-인용부호 처리 등 일부 "버그처럼 보이는 동작"은 "원본과의 동작 호환성 유지를 위해 의도적으로 보존"이라고 주석에 명시되어 있음 — 신규판 코드를 참고할 때 이런 부분은 실수가 아니라 의도임에 유의.

---

## 1. 프로젝트 구조 / 빌드 시스템 차이

| 항목 | 기존 (12_LinkMap) | 신규 (Linkmap) |
|---|---|---|
| 빌드 도구 | `electron-vite` (main/preload/renderer 3-way 번들, TS 컴파일) | 순수 `Vite`(렌더러만) + `electron/*.cjs`(빌드 없이 그대로 실행) |
| 메인 프로세스 위치 | `src/main/` (TS) | `electron/main.cjs` (CJS, 빌드 단계 없음) |
| Preload 위치 | `src/preload/index.ts` (TS) | `electron/preload.cjs` (CJS) |
| 서버 컴포넌트 | 없음(모든 데이터 접근이 IPC를 통해 메인 프로세스 안에서 처리) | `server/` — dev는 Vite 미들웨어, prod는 `electron/api-server.cjs`(순수 Node http 서버)가 공유하는 **REST API 계층**(`/api/linkmap/*`) |
| 프로덕션 실행 방식 | electron-builder 패키징된 out/ 리소스를 BrowserWindow가 직접 로드 | 패키지 시 `api-server.cjs`가 정적 파일 서빙 + API 처리를 겸하는 로컬 HTTP 서버(포트 5190)를 자체 기동 후 그 주소를 로드 |
| dev 포트 | electron-vite 기본(HMR) | Vite 5183 고정(`strictPort`), `concurrently`+`wait-on`으로 Vite↔Electron 동시 기동 |
| 타입체크 대상 | main/preload/renderer 전체(strict) | `src/`만(`tsconfig.json include: ["src"]`) — `electron/`, `server/`는 순수 JS라 타입체크 대상 밖 |
| DB 드라이버 | `@libsql/client`(prebuilt 바이너리) + Drizzle ORM, **비동기** repository | Node 내장 `node:sqlite`(`DatabaseSync`), ORM 없음, **동기** raw SQL |
| 패키징 asar | 기본(true) | `asar: false` (node:sqlite/동적 import 안정성 이유로 명시적 비활성화) |
| 창 스타일 | 표준 프레임 | `frame:false, transparent:true` 커스텀 타이틀바(자체 최소화/최대화/닫기) |
| 앱 종료 정책 | (기존 문서에 명시 없음, 표준) | 창 닫으면 즉시 `app.quit()` — 트레이 상주 없음(원본 Integrated_Mast의 트레이 기능 의도적 미이식) |
| 테스트 | 없음 | `server/linkmap/*.test.js` — 모듈별 단위테스트 존재(node:sqlite 기반, Node 내장 테스트러너 추정) |

**시사점**: 두 버전은 빌드 시스템 자체가 완전히 다르다. 신규 버전의 `server/` REST 계층 구조를 그대로 기존 버전에 이식하는 것은 비현실적(기존은 electron-vite+IPC 기반 아키텍처가 이미 안정적으로 동작 중이며 QA 완료 상태) — **기능만 IPC 기반으로 재구현하는 방식이 합리적**.

---

## 2. 스택/의존성 차이 (package.json)

| 패키지 | 기존 | 신규 | 비고 |
|---|---|---|---|
| `electron` | ^33.0.2 | latest | 신규는 버전 고정 안 함 |
| `electron-vite` | ^2.3.0 | (없음) | 신규는 미사용 |
| `@libsql/client` + `drizzle-orm`/`drizzle-kit` | 있음 | 없음 (`node:sqlite` 직접 사용) | DB 접근 방식 근본적으로 다름 |
| `@xyflow/react` | ^12.3.5 | **없음** | 신규에 그래프 캔버스 없음 |
| `d3-force` | ^3.0.0 | **없음** | 레이아웃 알고리즘 불필요(그래프 없음) |
| `@dagrejs/dagre` | ^1.1.4 | **없음** | 상동 |
| `zustand` | ^5.0.1 | ^5.0.1 | 동일 |
| `react` / `react-dom` | ^18.3.1 | ^18.3.1 | 동일 |
| `react-markdown` + `remark-gfm` | 있음(메모 편집기용) | 없음(자체 경량 마크다운 렌더러 직접 구현, `markdown.ts`) | |
| `open-graph-scraper` | ^6.8.2 | ^6.9.0 | 거의 동일 기능, 버전만 소폭 차이 |
| `nanoid` | ^5.0.7 | (미확인, id 생성 방식 다를 수 있음) | 구현 시 확인 필요 |
| `lucide-react` | 있음(아이콘) | 없음(조사 보고서 기준 미확인 — 아이콘 라이브러리 사용 방식 재확인 필요) | |
| `mammoth` | **없음** | ^1.12.2 | 신규 전용 — docx→HTML 미리보기 |
| `xlsx` (SheetJS, CDN tgz) | **없음** | ^0.20.3 | 신규 전용 — xlsx 미리보기 |
| `@fontsource-variable/jetbrains-mono`, `pretendard` | (기존은 tailwind.config에서 폰트패밀리만 지정, 로컬 번들 폰트 패키지 미사용 추정) | 로컬 번들 폰트 패키지로 직접 import | 폰트 로딩 방식 차이 |
| TailwindCSS | ^3.4.14 (자체 UI 프리미티브) | **없음** — CSS 파일 기반(`tokens.css`/`base.css`/`components.css`/`shell.css`) + `scripts/check-design-tokens.mjs` | 스타일링 방법론 자체가 다름(유틸리티클래스 vs 디자인 토큰 CSS) |

**시사점**: 그래프/레이아웃 관련 패키지가 신규에는 전무 — 그래프 기능 자체가 없다는 사실을 스택 레벨에서도 확인. 반대로 파일 미리보기 관련(mammoth/xlsx)은 기존에 전혀 없는 신규 요소.

---

## 3. 도메인 모델 / DB 스키마 차이

### 3-1. `links` 테이블 — 거의 동일
두 버전 모두 컬럼 구성(`id/kind/title/url/description/favicon/thumbnail/note/content/domain/favorite/deleted_at/created_at/updated_at`)이 **동일**. `kind`(web/file/folder/note) 4종도 동일. 마이그레이션 이력(`ALTER TABLE ... ADD COLUMN kind/content`)도 동일 — 두 버전이 공통 조상에서 갈라졌음을 강하게 시사.

### 3-2. `tags` 테이블 — 컬럼 추가됨
- 기존: `id, name, color`
- 신규: `id, name, color, source_path` (폴더 가져오기로 생성된 태그의 원본 폴더 절대경로 추적용, nullable)
- 신규는 태그 이름에 `"/"` 구분자를 넣어 계층처럼 보이게 하는 **표현(convention) 방식**을 사용(`tagTree.ts`가 파싱) — 실제 DB에는 평면 테이블, 트리는 프론트에서만 파생.

### 3-3. `link_tags` — 동일 (N:M 조인, PK/인덱스 동일)

### 3-4. `relations` 테이블 — **신규에서 완전 제거**
기존: 다형적 관계 그래프 테이블(`source_id/source_kind/target_id/target_kind/type/label`). 신규는 이 테이블 자체가 없고, 레거시 DB에 남아있으면 마이그레이션 시 DROP.

### 3-5. `collections` / `collection_links` 테이블 — **신규에서 완전 제거**
기존: 무제한 중첩 폴더 트리(`parent_id` self-FK) + N:M 링크 소속. 신규는 `migrateLegacyCollectionsIntoTags()`로 컬렉션 경로를 `/`구분 태그 이름으로 변환 후 테이블 자체를 DROP — **컬렉션 개념이 태그로 흡수·대체**됨.

### 3-6. DB 파일 경로 차이
- 기존: `%APPDATA%\linkmap\linkmap.db`
- 신규: `%APPDATA%\linkmap-app\linkmap.db` (의도적으로 별도 경로 — 두 앱이 같은 DB를 공유하지 않도록)

---

## 4. IPC / API 계약 차이

| 구분 | 기존 | 신규 |
|---|---|---|
| 데이터 CRUD 경로 | 전부 IPC(`ipcRenderer.invoke`), main 프로세스가 직접 DB 접근 | 전부 **HTTP REST**(`/api/linkmap/*`, fetch 기반), Electron IPC는 창 제어 + 파일시스템 접근에만 사용 |
| IPC 채널 네이밍 | `graph:snapshot`, `links:create` 등 콜론 네임스페이스 | `mast:minimize`, `mast:open-external` 등 `mast:` 접두어(창 제어/파일시스템 전용, 데이터 CRUD 채널 없음) |
| 관계/컬렉션 관련 채널 | `relations:create/delete`, `collections:create/delete/move/addLink/removeLink` 등 다수 | **없음**(기능 자체가 없으므로) |
| 신규 전용 API | 없음 | `/linkmap/folder/list`, `/linkmap/folder/import`, `/linkmap/folder/sync`, `/linkmap/links/bulk-tag`, `/linkmap/links/bulk-trash`, `/linkmap/links/bulk-restore`, `/linkmap/trash/empty` |
| 파일 시스템 접근 | `dialog:pick`(file/folder 모드), `path:info`(stat+본문), `shell:openExternal/openPath` | `mast:pick-folder`(폴더 전용), `mast:stat-path`, `mast:read-text-file`, `mast:read-binary-file`(PDF/이미지용 Uint8Array), `mast:open-external`(스킴 화이트리스트 재검증), `mast:open-path` |
| 파비콘/OG메타 수집 | `meta:fetch` → `OgMeta`(본문 텍스트 포함) | `/linkmap/meta`(동일 목적, REST) |
| 파일 본문 읽기(전문검색용) | `path:info` 핸들러 내부에서 처리 | `/linkmap/file-content` 별도 엔드포인트 |
| 동기 API | `getPathForFile`(webUtils, 유일한 동기) | 동일하게 `getPathForFile` 동기 유지 |

**시사점**: 신규는 파일 읽기 API가 텍스트/바이너리로 분리되어 있다(`read-text-file` / `read-binary-file`) — 기존은 텍스트 전용(`readTextFileContent`)만 있어 PDF/이미지 등 바이너리 파일 미리보기가 애초에 불가능한 구조. 이 부분은 신규 기능(파일 미리보기)을 이식하려면 반드시 필요한 신규 IPC 채널.

---

## 5. 기능 차이 종합

### 5-1. 신규 버전에만 있는 기능 (이식 후보)
1. **파일 미리보기(리치)** — PDF(Chromium PDFium `<embed>`), 이미지(png/jpg/gif/webp/bmp/svg), 마크다운(자체 경량 렌더러), 텍스트/코드(`<pre>`), Word(.docx, mammoth), Excel(.xlsx, SheetJS, 시트탭+최대500행). 기존은 상세패널의 "미리보기 탭"이 favicon/thumbnail/OG메타만 보여주고 파일 내용 렌더링은 없음.
2. **폴더 가져오기(Folder Import)** — 폴더 재귀 스캔(최대 3000개, `.git`/`node_modules` 등 자동 제외) → 체크박스 선택 → 일괄 링크 생성(폴더명 자동 태깅). 기존은 파일/폴더를 개별 선택하거나 드래그드롭만 가능, 폴더 내용 일괄 가져오기 없음.
3. **폴더 동기화(Folder Sync)** — 이미 가져온 폴더의 파일 추가/삭제를 감지해 링크 추가/휴지통 자동 반영. 기존에 대응 기능 없음.
4. **태그 계층 표현("/" 구분)** — 태그 이름에 슬래시로 계층 표현 + 트리 UI. 기존은 태그가 완전 평면(색상+이름만).
5. **저장된 검색 필터를 이름 붙여 칩으로 재사용** — 기존도 "저장된 필터"(`savedFilters` in settingsStore)가 있어 유사 기능 존재. (완전 신규는 아님, UI/UX 세부 차이 가능성 — 실제 구현 시 재확인 필요)
6. **커스텀 프레임리스 타이틀바** — 기존은 표준 OS 프레임 사용.
7. **일괄 작업 API 확장**(`bulk-trash`/`bulk-restore`/`bulk-tag`) — 기존도 다중선택+일괄작업바가 있으나 구현 위치가 다름(렌더러에서 개별 IPC 호출 반복 vs 신규는 전용 bulk 엔드포인트). 기능적으로는 기존도 이미 충족.
8. **읽기 전용 바이너리 파일 IPC**(`read-binary-file`) — 미리보기 기능의 전제조건.

### 5-2. 기존 버전에만 있는 기능 (신규에서 제거됨 — 유지 여부 결정 필요)
1. **그래프 캔버스 시각화**(React Flow) — 노드(Link/Tag/Collection)-엣지 그래프, Force/Hierarchical/Radial 3종 레이아웃, 미니맵/범례/줌.
2. **관계(Relations)** — 타입 있는 링크 간 관계(related/uses/part_of/custom), 수동 생성 4가지 경로, AI 로컬 휴리스틱 추천.
3. **컬렉션(중첩 폴더 트리)** — `parent_id` self-FK 기반 무제한 depth, 링크의 N:M 폴더 소속, 그래프상 하위/포함 엣지 시각화.
4. **AI 관계 추천**(로컬 휴리스틱, 완전 오프라인).
5. **노드 컨텍스트 메뉴, 드래그로 관계 생성**(그래프 인터랙션 전반).

> **이 5가지는 "LinkMap"이라는 이름의 원래 핵심 차별점(그래프형 지식관리)이다.** 신규 버전은 이 부분을 의도적으로 걷어낸 다른 제품 방향(태그 기반 단순 파일/링크 매니저 + 리치 미리보기)이다. 사용자가 "신규 버전 수준으로 최신화"라고 표현했지만, 그대로 따르면 기존 앱의 정체성인 그래프/관계/컬렉션이 사라진다 — **2단계 계획에서 반드시 사용자 확인이 필요한 지점**.

### 5-3. 양쪽 다 있으나 구현이 다른 기능
| 기능 | 기존 구현 | 신규 구현 |
|---|---|---|
| 데이터 갱신 전략 | IPC invoke 후 store에서 `refresh()`(전체 재조회), 낙관적 업데이트 없음 | REST fetch 후 동일하게 전체 `refresh()` — **전략 동일**, 전송 방식만 다름 |
| 검색 미니 언어 | `parseSearch`(공백=AND, 콤마=OR, `"구절"`, `tag:/url:/memo:`) | `searchQuery.ts`(서버 `search.js`와 동일 로직 클라이언트에도 이식) — **문법 거의 동일**, 콤마-인용부호 처리에 동일한 의도적 보존 버그 존재 |
| 열기 동작 | `openLink.ts`(kind별 openPath/openExternal 분기) | `openLink.ts`(동일 목적, 스킴 화이트리스트가 더 엄격 — javascript:/data:/file: 명시적 차단) |
| 상태관리 | zustand 3-store 분리(app/ui/settings) | zustand 단일 스토어(`store.ts`) — 관리 방식 단순화 |
| 레이아웃 | 4열(레일-목록-그래프-상세) 가변폭 리사이저 | 고정 3열(레일-목록-상세), 그래프 열 없음, 리사이즈 불가 |
| 스타일링 | Tailwind 유틸리티 클래스 | CSS 커스텀 프로퍼티 기반 디자인 토큰 파일(`tokens.css` 등) + 검증 스크립트 |

---

## 6. UI/UX 구조 차이

- **기존**: 4열 — 좌측 레일(다크, 220px) / 링크목록(248px) / **그래프 캔버스(나머지 전부)** / 상세패널(320px, 4탭: 상세/관계/메모/미리보기).
- **신규**: 3열 — 좌측 레일(208px, 태그트리+스마트뷰) / 링크목록(360px) / 상세패널(280px, 필드 표시 또는 **확장 미리보기 모드**). 그래프 열 자체가 없음.
- 신규는 커스텀 프레임리스 타이틀바로 창 상단이 다름.
- 신규 상세패널은 "관계 탭"이 없는 대신(관계 기능 자체가 없음) 리치 미리보기가 더 강화됨.

---

## 7. 종합 요약 표

| 카테고리 | 판정 |
|---|---|
| 빌드/구조 | 완전히 다른 아키텍처 (electron-vite+IPC+libsql/Drizzle vs Vite+CJS+REST+node:sqlite) |
| links 스키마 | 거의 동일(공통 조상) |
| tags 스키마 | 신규가 `source_path` 컬럼 추가 |
| relations/collections | 신규에서 완전 제거 (기존에만 존재) |
| 그래프 시각화 | 신규에서 완전 제거 (기존에만 존재) |
| 파일 미리보기 | 신규에서 대폭 강화 (기존에 없음) |
| 폴더 가져오기/동기화 | 신규 전용 신기능 |
| 검색 문법 | 거의 동일 |
| 상태관리/갱신전략 | 사상은 동일(zustand + 전체 refresh), 구조만 다름 |

---

## 8. 참고: 조사 방법
- 기존 버전: `docs/08_FEATURE_GUIDE.md`, `src/shared/{types.ts,ipc.ts}`, `src/main/**`, `src/preload/index.ts`, `src/renderer/src/**`, `package.json`, 각종 설정 파일을 직접 Read.
- 신규 버전(읽기 전용): `package.json`, `electron/*.cjs`, `server/**`, `src/**`, `vite.config.ts`, `electron-builder.yml`, `.claude/launch.json`을 직접 Read/Glob/Grep. 이 폴더는 수정하지 않았다.
