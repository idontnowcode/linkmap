# 11. 버전 최신화 실행 계획 (초안 — 사용자 승인 대기)

> 전제: `docs/10_VERSION_DIFF_ANALYSIS.md`의 분석 결과에 기반. 신규 버전(`C:\Users\admin\Desktop\Linkmap`)은 읽기 전용 참고 자료로만 사용하며 수정하지 않는다. 실행 대상은 `12_LinkMap`(electron-vite + IPC + libsql/Drizzle 아키텍처)이며, **기존 아키텍처를 유지한 채 신규 버전의 기능을 이식**하는 것을 기본 원칙으로 한다(신규의 Vite+REST+node:sqlite 구조로 전면 교체하지 않음 — 이미 QA 완료된 기존 아키텍처를 무너뜨릴 이유가 없음).

---

## 핵심 결정 필요 사항 (실행 전 사용자 확인 필수)

diff 분석에서 드러난 가장 중요한 사실: **신규 버전은 기존 버전의 그래프 캔버스·관계(Relations)·컬렉션(중첩 폴더) 기능을 의도적으로 완전히 제거**하고 태그 기반으로 단순화했다. 이 세 기능은 `12_LinkMap`의 원래 정체성("관계형 지식그래프")의 핵심이며, 최근 QA(`09_QA_CHECKLIST.md`)까지 완료된 상태다.

**아래 질문에 대한 답을 주시면 그에 따라 실행하겠습니다** (별도 답이 없으면 각 항목의 "권장안"으로 진행):

### Q1. 그래프/관계/컬렉션 기능을 유지할 것인가, 신규 버전처럼 제거할 것인가?
- **권장안(기본값): 유지.** 신규 버전에만 있는 기능(폴더 가져오기/동기화, 파일 미리보기, 태그 계층 표현)만 **추가**하고, 기존의 그래프/관계/컬렉션은 그대로 둔다. "최신화"를 "신규에서 늘어난 것만 흡수, 기존 QA 완료 기능은 유지"로 해석.
- 대안: 신규 버전과 동일하게 그래프/관계/컬렉션을 제거하고 태그로 통합(기존 앱의 정체성이 크게 바뀜, 되돌리기 어려움).

### Q2. 컬렉션을 태그 계층("/")으로도 병행 지원할 것인가?
- **권장안: 병행 지원하지 않음.** 컬렉션(트리)과 태그(평면, 이번에 계층 표현 추가)는 서로 다른 개념으로 계속 분리 유지. 태그 이름에 "/"를 허용해 계층처럼 보이는 신규 UX만 추가.
- 대안: 컬렉션을 없애고 태그 계층으로 완전 대체(Q1에서 "제거" 선택 시에만 해당).

### Q3. DB 파일 경로를 신규 버전처럼 분리할 것인가?
- **권장안: 분리하지 않음.** 기존 경로(`%APPDATA%/linkmap/linkmap.db`) 유지, 새 컬럼(`tags.source_path`)만 마이그레이션으로 추가. 이미 QA된 시드 데이터/사용자 데이터와의 연속성 유지.

### Q4. 신규 의존성(mammoth, xlsx/SheetJS) 추가에 동의하는가?
- **권장안: 동의.** 파일 미리보기 이식에 필수. `xlsx`는 npm 레지스트리가 아닌 SheetJS CDN tgz URL 참조이므로 설치 시 네트워크 접근 필요 — 사내/오프라인 환경 이슈 없는지만 확인.

### Q5. UI 레이아웃은 기존 4열(레일-목록-그래프-상세)을 유지할 것인가?
- **권장안: 유지.** 그래프 열을 없애지 않고, 상세패널(4번째 열)의 "미리보기 탭"만 리치 렌더러로 강화(PDF/이미지/docx/xlsx/md).

---

## 이식 대상 기능 — 우선순위 (MoSCoW + 근거)

| 우선순위 | 기능 | MoSCoW | 근거 |
|---|---|---|---|
| P1 | 파일 미리보기 강화 (PDF/이미지/md/docx/xlsx) | Must | 상세패널 "미리보기 탭"의 실질 가치를 크게 높임, 독립적 추가라 리스크 낮음 |
| P2 | 바이너리 파일 읽기 IPC (`path:readBinary`) | Must | P1의 전제조건 |
| P3 | 폴더 가져오기(Folder Import) | Must | 신규 핵심 기능, 사용자 워크플로우 효율 크게 개선 |
| P4 | 폴더 동기화(Folder Sync) | Should | P3에 의존, 폴더 가져오기 없이는 무의미 |
| P5 | 태그 이름 계층 표현("/" 트리 UI) | Should | UX 개선이나 필수는 아님(태그 목록이 길어질 때만 체감) |
| P6 | 자체 경량 마크다운 렌더러 도입 여부 | Won't (이번 범위 제외) | 기존은 이미 `react-markdown`+`remark-gfm` 사용 중, 대체할 이유 없음(신규가 이걸 쓰는 이유는 의존성 최소화 목적으로 추정, 기존엔 불필요) |
| P7 | 커스텀 프레임리스 타이틀바 | Could | 시각적 변경 크고 회귀 리스크 있음 — 이번 범위에서 제외 권장, 필요 시 별도 요청으로 진행 |
| P8 | bulk API 엔드포인트 구조 변경 | Won't | 기존도 다중선택+일괄작업 UI 기능적으로 이미 충족(구현 위치만 다름) — 변경 불필요 |

> Must 3개 / Should 2개 / Could 1개 / Won't 2개 — Must 비율 낮아 범위 과부하 없음.

---

## 기능별 구현 접근 (기존 아키텍처 기준)

### P1+P2. 파일 미리보기 강화
- **신규 의존성 추가**: `mammoth`, `xlsx`(SheetJS tgz) → `package.json`
- **IPC 신설**: `src/shared/ipc.ts`에 `readBinaryFile` 채널 추가 → `src/main/ipc/index.ts`에 핸들러(`fs.readFile` → `Uint8Array` 반환, 확장자/크기 제한 적용) → `src/preload/index.ts` 노출
- **렌더러**: `src/renderer/src/features/detail/PreviewTab.tsx` 확장 — 확장자별 분기 렌더링 컴포넌트 추가(신규 버전의 `previewKind.ts`/`LinkPreview.tsx`/`XlsxTable.tsx`/`xlsxPreview.ts`/`markdown.ts` 판정 로직을 참고해 기존 컴포넌트 트리에 맞게 재작성). 신규는 메모용으로 자체 마크다운 렌더러를 새로 만들지만, 기존엔 이미 `react-markdown`이 있으므로 파일 미리보기용 md도 동일 라이브러리 재사용.
- **PDF**: Chromium 내장 PDFium `<embed>` — `electron` BrowserWindow의 `webPreferences.plugins: true` 설정 추가 필요(`src/main/index.ts`).

### P3. 폴더 가져오기
- **신규 IPC**: `folderList`(재귀 스캔, 제외 패턴 `.git`/`node_modules`/`.svn`/`.hg`/`__pycache__`/점폴더, 최대 3000개), `folderImport`(선택 파일 목록 → 일괄 링크 생성 + 폴더명 자동 태깅) → `src/main/ipc/index.ts` + `src/main/services/folderImport.ts`(신규 서비스 파일, 신규 버전의 `server/linkmap/folderImport.js` 로직 참고해 TS/비동기 repository 패턴으로 재작성)
- **렌더러**: `src/renderer/src/features/links/FolderImportDialog.tsx` 신설(신규의 `FolderImportDialog.tsx` UX 참고) — 폴더 선택(`window.api.pickPaths('folder')` 재사용) → 파일 체크박스 선택 → 일괄 생성
- **DB**: `tags.source_path` 컬럼 추가 마이그레이션(`src/main/db/schema.ts`의 `MIGRATIONS` 배열에 `ALTER TABLE tags ADD COLUMN source_path TEXT` 추가)

### P4. 폴더 동기화
- P3의 `tags.source_path`를 기준으로 해당 폴더를 재스캔해 diff(추가된 파일→링크 생성, 삭제된 파일→해당 링크 휴지통 이동) 적용하는 IPC(`folderSync`) 추가. LeftRail의 폴더-태그 항목에 동기화 버튼 노출.

### P5. 태그 계층 표현
- `src/renderer/src/features/navigation/` 또는 신규 `tagTree.ts` 유틸 추가(신규 버전 로직 참고) — 태그 `name`에 포함된 `/`를 파싱해 트리 노드로 그룹핑, LeftRail 태그 섹션 렌더링만 변경(DB 스키마 변경 없음, 순수 프론트 표현).

---

## 구조적 차이로 그대로 포팅 어려운 부분 — 대안

| 문제 | 원인 | 대안 |
|---|---|---|
| 신규는 REST API, 기존은 IPC | 아키텍처 근본 차이 | 모든 신규 API를 IPC 채널로 재작성(위 계획대로), REST 코드는 로직 참고용으로만 사용 |
| 신규는 `node:sqlite`(동기), 기존은 `@libsql/client`(비동기) | DB 드라이버 상이 | 신규의 동기 SQL 로직을 기존 repository의 async 패턴(`async/await` + libsql `execute`)으로 옮겨 작성. 트랜잭션 묶음 처리 시 libsql의 `batch()` API 활용 |
| 신규 CSS 디자인 토큰 vs 기존 Tailwind | 스타일링 방법론 상이 | 신규 CSS를 그대로 가져오지 않고, 신규 UI의 "모양"만 참고해 기존 Tailwind 클래스/커스텀 토큰으로 재구현 |
| 신규 xlsx 패키지가 CDN tgz 참조 | npm 레지스트리 미등록 | 동일하게 CDN tgz URL로 설치(사내 네트워크 정책상 문제 시 대안: `xlsx` npm 패키지의 구버전 또는 `exceljs`로 대체 — Q4 답변에 따라 결정) |

---

## 실행 순서 (승인 후)

1. `package.json`에 `mammoth`, `xlsx` 추가 → `npm install` → `npm run typecheck` (베이스라인 확인)
2. P2(바이너리 IPC) → 단독 typecheck+build+dev 부팅 확인 → 커밋
3. P1(파일 미리보기 UI) → typecheck+build+dev 부팅 확인 → 커밋
4. `tags.source_path` 마이그레이션 → P3(폴더 가져오기 IPC+서비스+다이얼로그) → typecheck+build+dev 부팅 확인 → 커밋
5. P4(폴더 동기화) → typecheck+build+dev 부팅 확인 → 커밋
6. P5(태그 계층 표현 UI) → typecheck+build+dev 부팅 확인 → 커밋
7. 전체 회귀 확인(그래프/관계/컬렉션 등 기존 기능이 이번 변경으로 깨지지 않았는지) → `docs/08_FEATURE_GUIDE.md`, `docs/09_QA_CHECKLIST.md` 갱신
8. `git push origin main`

각 단계 완료 시마다 `npm run typecheck` + `npm run build`, 주요 마일스톤(2,4,5)마다 `npm run dev` 부팅 로그 확인 — 기존 세션 확립 패턴 그대로 적용.

---

## 리스크

| ID | 리스크 | 대응 |
|---|---|---|
| R1 | `xlsx` CDN tgz 설치 실패(네트워크/사내정책) | `npm install` 실패 시 즉시 보고 후 대체 패키지(exceljs 등) 논의 |
| R2 | PDFium `<embed>` 활성화가 기존 보안설정(`sandbox:false`, `contextIsolation:true`)과 충돌 | `webPreferences.plugins:true` 추가 후 typecheck/build/dev 부팅에서 즉시 확인, 문제 시 `<iframe>` 방식 등 대안 검토 |
| R3 | 폴더 가져오기 대량 파일 시 UI 프리징 | 신규 버전과 동일하게 3000개 상한 적용 + 비동기 처리 유지 |
| R4 | 그래프/관계/컬렉션 회귀 | 각 단계 완료 후 기존 QA 체크리스트(09) 주요 항목 재확인 |

---

## 승인 요청

위 Q1~Q5 권장안대로(그래프/관계/컬렉션 유지 + 신규 기능만 추가) 진행해도 괜찮으시면 "승인" 또는 "진행"이라고 말씀해 주세요. 특정 항목만 다르게 하고 싶으시면 해당 번호로 알려주시면 그에 맞춰 계획을 조정한 뒤 진행하겠습니다.
