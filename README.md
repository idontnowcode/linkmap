# LinkMap

관계형 북마크 그래프 매니저 — 저장한 링크를 태그·관계로 연결하고 인터랙티브 그래프로 탐색하는 Electron 데스크톱 앱.

![3-panel layout](docs/07_WIREFRAME_COMPONENT_TREE.md)

## 스택
Electron · electron-vite · React 18 · TypeScript · TailwindCSS · Zustand · React Flow (@xyflow/react) · d3-force · SQLite(libsql) · Drizzle ORM · open-graph-scraper · react-markdown

## 실행

```bash
npm install      # 의존성 설치 (libsql은 prebuilt 바이너리 — C++ 컴파일러 불필요)
npm run dev      # 개발 모드 (HMR)
```

> 첫 실행 시 `userData/linkmap.db`가 생성되고 데모 그래프(시드 데이터)가 채워집니다.

### 기타 스크립트
```bash
npm run typecheck     # 메인 + 렌더러 타입 검사
npm run build         # 프로덕션 번들 (out/)
npm run package       # 설치 파일 패키징 (dist/)
npm run db:generate   # Drizzle 마이그레이션 SQL 생성 (선택)
```

## 주요 기능 (MVP)
- **링크 저장**: 수동 폼 + URL 드래그앤드롭 + OpenGraph 메타 자동 수집
- **로컬 파일·폴더 링크**: 파일/폴더를 드롭하거나 네이티브 피커로 선택 → 그래프 노드로 저장. 더블클릭 시 OS 기본 앱/탐색기로 열기(`shell.openPath`). 웹/파일/폴더는 아이콘으로 구분
- **태그 관리**: 색상 태그 생성, 링크에 N:M 부여, 사이드바 필터
- **관계 생성**: 6개 타입(`related/reference/uses/part_of/supports/custom`)의 의미적 엣지
- **그래프 탐색**: Force/Hierarchical/Radial 레이아웃, 검색(`tag:` `url:` `memo:`), 미니맵, 범례
- **상세 패널**: 상세정보 · 관계 · 메모(Markdown) · 미리보기 4탭
- **스마트 뷰**: 모든 링크 / 즐겨찾기 / 최근 / 휴지통(soft delete)

## 노드/엣지 인터랙션
- 노드 **클릭**: 우측 상세 동기화 · **더블클릭**: URL 열기 · **우클릭**: 편집/삭제/관계추가/URL열기
- 좌측 링크 카드 클릭 → 그래프에서 해당 노드로 센터링

## 아키텍처
```
src/
├─ main/        Electron main — better-sqlite3 + Drizzle, repositories, IPC, OG meta fetch
├─ preload/     contextBridge → window.api (typed)
├─ shared/      도메인 타입 + IPC 계약
└─ renderer/    React (feature-based): navigation · links · tags · relations · graph · detail
```
- 모든 DB 접근은 메인 프로세스. 렌더러는 `window.api`만 사용 (`contextIsolation: true`).
- 설계 문서: [`docs/`](docs/) (01_PRD ~ 07_WIREFRAME_COMPONENT_TREE).

## 참고 / 알려진 제약 (v1)
- shadcn/ui CLI 대신 동등한 경량 UI 프리미티브를 `src/renderer/src/components/ui`에 직접 구현(설치 없이 실행 가능). 추후 `npx shadcn@latest init`로 교체 가능.
- 컬렉션(폴더)에 링크 담기 UI는 v1 미구현(데이터 모델·노드는 준비됨).
- DB 드라이버로 `@libsql/client`(SQLite 호환) 사용. prebuilt N-API 바이너리라 C++ 빌드 툴 없이 설치/실행되며 Electron ABI 리빌드도 불필요. 원래 스펙의 `better-sqlite3`로 바꾸려면 VS "Desktop development with C++" 워크로드 설치 후 `better-sqlite3` + `postinstall: electron-builder install-app-deps`로 교체하면 됨(스키마/쿼리는 Drizzle이라 거의 그대로).
