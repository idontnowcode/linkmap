# 06 — Design System (v1)

> 첨부 목업에서 추출한 토큰. Tailwind `theme.extend` + CSS 변수로 구현.

## 1. 색상 (Color Tokens)

### 표면 / 중립
| 토큰 | Hex | 용도 |
|---|---|---|
| `--bg-rail` | `#1B2030` | 좌측 nav rail 배경 (다크 navy) |
| `--bg-rail-hover` | `#262C3E` | rail 항목 hover |
| `--bg-rail-active` | `#2E3650` | 선택된 태그/뷰 배경 |
| `--bg-canvas` | `#FFFFFF` | 그래프 캔버스 |
| `--dot-grid` | `#E5E7EB` | 캔버스 도트 |
| `--bg-panel` | `#FFFFFF` | 우측/리스트 패널 |
| `--bg-list` | `#F8FAFC` | 링크 리스트 영역 |
| `--border` | `#E5E7EB` | 구분선 |
| `--text-strong` | `#0F172A` | 본문 강조(라이트 영역) |
| `--text-muted` | `#64748B` | 보조 텍스트 |
| `--text-on-dark` | `#E2E8F0` | rail 텍스트 |
| `--text-on-dark-muted` | `#94A3B8` | rail 보조 |

### 브랜드 / 액센트
| 토큰 | Hex | 용도 |
|---|---|---|
| `--primary` | `#3B82F6` | 주요 버튼, 활성, 링크 노드 링 |
| `--primary-hover` | `#2563EB` | |
| `--node-link` | `#8B5CF6` | 링크 노드 보라 링/채움 |
| `--star` | `#3B82F6` | 즐겨찾기 별(활성) |

### 태그 팔레트 (목업 매칭)
| 태그 | Hex |
|---|---|
| AI | `#3B82F6` (blue) |
| Development | `#22C55E` (green) |
| Productivity | `#F97316` (orange) |
| Design | `#A855F7` (purple) |
| Business | `#EAB308` (yellow) |
| Research | `#14B8A6` (teal) |

### 엣지(관계) 색
| 타입 | 색 | 선 |
|---|---|---|
| related | `#8B5CF6` | 실선 |
| reference | `#3B82F6` | 점선 |
| uses | `#3B82F6` | 실선 |
| part_of | `#22C55E` | 실선 |
| supports | `#14B8A6` | 실선 |
| custom | `#94A3B8` | 점선 |

## 2. 타이포그래피
- 폰트: `Inter`, system-ui fallback. 한글 `Pretendard`(선택), fallback `system-ui`.
| 토큰 | size / line / weight | 용도 |
|---|---|---|
| `text-logo` | 18 / 24 / 700 | "Link Map" 로고 |
| `text-h` | 15 / 20 / 600 | 패널 헤더, 제목 |
| `text-body` | 13 / 18 / 400 | 기본 본문 |
| `text-sm` | 12 / 16 / 400 | URL, 메타, count |
| `text-label` | 11 / 14 / 600 / +0.04em uppercase | 섹션 라벨(태그/폴더) |

## 3. 스페이싱 / 모양
- 스페이스 스케일: 4 / 8 / 12 / 16 / 24 (Tailwind 기본 1·2·3·4·6).
- radius: `--radius-sm` 6px(칩/인풋), `--radius-md` 10px(카드/버튼), `--radius-lg` 14px(패널 카드).
- 그림자: `--shadow-card` `0 1px 2px rgba(15,23,42,.06)`, `--shadow-pop` `0 8px 24px rgba(15,23,42,.12)`(팝오버/컨텍스트 메뉴).

## 4. 노드 사양 (그래프)
| 노드 | 모양 | 크기 | 채움 / 테두리 |
|---|---|---|---|
| Link | 원 | r 40~60 (연결수 비례) | 흰 채움 + 2px 보라(`--node-link`) 링, favicon 중앙 |
| Tag | 라운드 사각 | 80×80, radius 14 | 태그 색 12% 틴트 채움 + 태그색 테두리 |
| Collection | 육각형 | 약 84×76 | 흰 채움 + 점선 테두리 |
- 선택 시: 외곽 글로우(보라 4px, 20% opacity).
- hover 시: 살짝 확대(scale 1.04) + shadow-pop.

## 5. 컴포넌트 스타일 규칙
- **Primary 버튼**: `--primary` 채움, 흰 텍스트, radius-md, 높이 36, 풀폭(좌측 액션).
- **Secondary 버튼**: 투명 + `--text-on-dark` 텍스트 + 1px 외곽선(rail 내).
- **태그 항목**: 색상 점(8px) + 이름 + 우측 count, 선택 시 `--bg-rail-active`.
- **링크 카드**: favicon(16) + 제목(text-body) + URL(text-sm muted) + 별 아이콘. hover 시 `--bg-rail-hover`(리스트는 라이트라 `#EEF2F7`).
- **칩(태그 chip)**: 태그색 12% 틴트 배경 + 태그색 텍스트, radius-sm, 높이 22.
- **탭**: 활성 탭 하단 2px `--primary` 인디케이터.
- **토글(즐겨찾기)**: on=`--primary`.

## 6. 다크/라이트
- v1: 좌측 rail만 다크 고정, 나머지 라이트. 전체 다크 모드는 v2(토큰은 CSS 변수라 확장 용이).

## 7. 아이콘
- `lucide-react`. 네트워크/그래프 로고, 별, 검색, 필터, 레이아웃, 외부링크, 휴지통, 설정, 플러스.
