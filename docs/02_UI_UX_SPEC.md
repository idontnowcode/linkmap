# 02 — UI / UX Spec

> 첨부 목업(LinkMap) 기준. v1.

## 1. 전체 레이아웃 (3-Panel)

```
┌──────────────┬─────────────────────────────┬───────────────┐
│ LEFT NAV     │ GRAPH VIEW                  │ DETAIL PANEL  │
│ 20%          │ 55%                         │ 25%           │
│ (dark)       │ (white + dot grid)          │ (white)       │
└──────────────┴─────────────────────────────┴───────────────┘
```
- 좌측 패널은 **다크 테마 고정**(navy). 중앙·우측은 라이트.
- 최소 창 크기 1024×720. 우측 패널은 노드 미선택 시 빈 상태(empty state) 표시.
- 목업에는 좌측 nav(20%)와 그 우측에 "태그별 링크 리스트"(2번째 컬럼)가 함께 보임 → 실제로는 **좌측 영역이 [nav rail + link list] 2단**으로 구성. 아래 1.1 참고.

### 1.1 좌측 영역 세부 (목업 반영)
좌측은 두 개의 서브 컬럼으로 나뉜다:
- **Nav Rail** (좌): 로고, 추가 버튼, 스마트 뷰, 태그 목록, 컬렉션, 설정.
- **Link List** (우): 현재 선택된 뷰/태그의 링크 카드 목록 + 인-컨텍스트 검색.

## 2. 좌측 Nav Rail

**Section 1 — 액션**
- `[+ 새 링크 추가]` (primary, 파란 채움 버튼, 풀폭)
- `[+ 새 태그 추가]` (secondary, 외곽선 버튼)

**Section 2 — 스마트 뷰**
- 모든 링크 (count) · 즐겨찾기 (count) · 최근 추가 (count) · 휴지통 (count)

**Section 3 — 태그 목록**
- `● 태그명 (count)` — 색상 점 + 이름 + 개수. 선택 시 강조 배경. `+`로 추가, `더보기`로 펼침.

**Section 4 — 폴더(컬렉션)**
- `Project Alpha (12)` · `Study (18)` · `Inspiration (9)`

**하단**: `설정`

## 3. Link List (2번째 컬럼)
- 헤더: 선택된 태그/뷰 이름 + `N개 링크`, 우측 `⋮` 메뉴.
- 인-컨텍스트 검색창 + 필터 아이콘.
- 카드: `favicon · 제목 · URL` + 즐겨찾기 별. 클릭 시 그래프에서 해당 노드 포커스 + 우측 상세 동기화.

## 4. 중앙 그래프 패널

**Top Toolbar (좌→우)**
- 검색창 (placeholder: `링크, 태그, 메모 검색 (예: openai, tag:AI)`)
- `필터 ▾` · `레이아웃 ▾` · 뷰 토글 아이콘들 · `Zoom 100%` · `?` 도움말 · 창 컨트롤

**Search 문법**
| 입력 | 의미 |
|---|---|
| `openai` | 제목/URL/메모 전체 텍스트 |
| `tag:AI` | 태그 필터 |
| `url:openai` | URL 부분일치 |
| `memo:vector` | 메모 내용 검색 |

**Filter**: Tag · Domain · Date · Relation Type
**Layout**: Force Directed(기본) · Hierarchical · Radial

**Graph Canvas**
- 배경: Dot Grid.
- 노드 타입:
  - **Link** — 원형, radius 40~60, favicon/이니셜, 선택 시 보라 링.
  - **Tag** — 사각형(rounded), 80×80, 태그 색.
  - **Collection** — 육각형.
- 인터랙션:
  - 클릭 → 우측 상세패널 동기화
  - 더블클릭 → 해당 링크(URL) 열기 (`shell.openExternal`)
  - 우클릭 → 컨텍스트 메뉴: `Edit · Delete · Create Relation · Open URL`
  - 드래그 → 노드 위치 이동(고정 핀 옵션)

**Edge (관계) 스타일**
| 타입 | 선 스타일 | 색 |
|---|---|---|
| related | 실선 | 보라 |
| reference | 점선 | 파랑 |
| uses | 실선 | 파랑 |
| part_of | 실선 | 초록 |
| supports | 실선 | 청록 |
| custom (사용자 정의) | 점선 | 회색 |
- 엣지 라벨 표시(예: `provides`, `developed by`). 방향성 화살표.

**Mini Map**: 우하단. 현재 뷰포트 박스 표시.
**Legend**: 좌하단. 엣지 타입 범례.

## 5. 우측 Detail 패널

탭: `상세 정보 · 관계(N) · 메모 · 미리보기`

**상세 정보**
- 링크 헤더(favicon + 제목 + 즐겨찾기 별 + 닫기)
- 제목 · URL(외부 열기 아이콘) · 설명 · 태그(chip + `+`) · 도메인 · 생성일 · 수정일 · 즐겨찾기 토글
- 하단 **빠른 작업**: `새 링크 추가 · 관련 링크 추가 · 메모 추가 · ⋯`

**관계**: 관련 링크 목록(타입별 그룹) + `+ 관계 추가`. 항목 클릭 시 대상 노드로 이동.
**메모**: Markdown 에디터/프리뷰 (`react-markdown`). 자동 저장.
**미리보기**: favicon · thumbnail · meta title · meta description (자동 수집 결과).

## 6. 상태/엣지 케이스
- 빈 그래프: 첫 실행 시드 데이터 or 온보딩 CTA.
- 메타 수집 실패: 도메인 기반 fallback(이니셜 아바타, 제목=호스트명).
- 휴지통: soft delete(복원 가능), 영구 삭제는 확인 모달.
- 검색 결과 0건: "결과 없음" + 필터 초기화 버튼.

## 7. 접근성 / 단축키 (v1 기본)
- `Cmd/Ctrl+N` 새 링크 · `Cmd/Ctrl+F` 검색 포커스 · `Del` 선택 노드 휴지통 · `Esc` 패널 닫기.
- 포커스 링 가시화, 그래프 노드 키보드 탐색은 v2.
