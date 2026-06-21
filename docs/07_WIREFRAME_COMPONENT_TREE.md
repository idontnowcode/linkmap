# 07 — Wireframe + Component Tree (v1)

## 1. 전체 화면 와이어프레임

```
┌─ AppShell ───────────────────────────────────────────────────────────────────────┐
│ ┌─LeftRail─┐┌─LinkList────┐┌─GraphPanel───────────────────────┐┌─DetailPanel────┐ │
│ │◢ Link Map││ AI          ││ [🔍 검색…] [필터▾][레이아웃▾] [▦][⋯]││ ◎ OpenAI    ★ ✕│ │
│ │          ││ 21개 링크  ⋮││  [—][100%][?] [—][□][✕]          ││────────────────│ │
│ │[+ 새 링크]││┌──────────┐ ││                                  ││[상세][관계8][메모│ │
│ │[+ 새 태그]│││🔍 태그검색│ ││        ( OpenAI )                ││ ][미리보기]    │ │
│ │          ││└──────────┘ ││           │ related              ││────────────────│ │
│ │모든링크152││┌──────────┐ ││    [AI]──provides──▶( ChatGPT )  ││ 링크           │ │
│ │즐겨찾기 23│││◎ OpenAI ★│ ││     │part of      │              ││ 제목  OpenAI   │ │
│ │최근추가 12│││ openai.com│ ││  [Development]   ( OpenAI API )  ││ URL   openai…↗ │ │
│ │휴지통   3│││──────────│ ││     │            uses│           ││ 설명  …        │ │
│ │          │││◎ ChatGPT ★│ ││  [Research]──used in──(LangChain)││ 태그 [AI][Res]+│ │
│ │── 태그 ──│││ chat.open…│ ││                                  ││ 도메인 openai… │ │
│ │●AI     21│││──────────│ ││                                  ││ 생성 24.05.15  │ │
│ │●Dev    15│││◎ GPT-4   ☆│ ││ ┌legend──┐          ┌─minimap─┐ ││ 즐겨찾기  [⚫─]│ │
│ │●Prod    8│││ openai.c… │ ││ │related │          │ • • •   │ ││────────────────│ │
│ │●Design  7││└──────────┘ ││ │provides│          │  •  •   │ ││ 빠른 작업      │ │
│ │── 폴더 ──││             ││ └────────┘          └─────────┘ ││ [관련링크추가] │ │
│ │설정      ││             ││                                  ││ [메모 추가] ⋯ │ │
│ └──────────┘└─────────────┘└──────────────────────────────────┘└────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────┘
   ~18%          ~17%                  ~45%                            ~20%
```
> 비율은 PRD의 20/55/25를 기준선으로, 좌측을 rail+list 2단으로 나눈 실측 근사치. CSS는 `grid-template-columns: 220px 240px 1fr 320px` (반응형 최소값) 권장.

## 2. 컴포넌트 트리

```
<App>
└─ <AppProviders>            // Zustand init, theme, toaster
   └─ <AppShell>             // CSS grid 4-column
      ├─ <LeftRail>
      │   ├─ <BrandLogo/>                  // ◢ Link Map
      │   ├─ <RailActions>
      │   │   ├─ <NewLinkButton/>          // primary, opens <LinkFormDialog>
      │   │   └─ <NewTagButton/>           // opens <TagFormDialog>
      │   ├─ <SmartViews>                  // All / Favorites / Recent / Trash (+counts)
      │   │   └─ <SmartViewItem/>          // x4
      │   ├─ <TagList>
      │   │   ├─ <SectionLabel "태그"/> + <AddTagInline/>
      │   │   └─ <TagListItem/>            // ●color + name + count, active state
      │   ├─ <CollectionList>
      │   │   ├─ <SectionLabel "폴더(컬렉션)"/>
      │   │   └─ <CollectionItem/>
      │   └─ <RailFooter><SettingsButton/></RailFooter>
      │
      ├─ <LinkListColumn>
      │   ├─ <LinkListHeader/>             // 선택 뷰명 + "N개 링크" + ⋮
      │   ├─ <InContextSearch/>            // 태그 내 검색 + 필터 아이콘
      │   └─ <LinkCardList>
      │       └─ <LinkCard/>               // favicon + title + url + ★  (click→focus node)
      │
      ├─ <GraphPanel>
      │   ├─ <GraphToolbar>
      │   │   ├─ <SearchBar/>              // tag:/url:/memo: parser
      │   │   ├─ <FilterMenu/>             // Tag/Domain/Date/RelationType
      │   │   ├─ <LayoutMenu/>             // Force(기본)/Hierarchical/Radial
      │   │   ├─ <ViewToggles/> <ZoomControl/> <HelpButton/>
      │   │   └─ <WindowControls/>         // — □ ✕ (frameless 옵션 시)
      │   └─ <GraphCanvas>                 // <ReactFlow>
      │       ├─ <Background variant="dots"/>
      │       ├─ nodeTypes:
      │       │   ├─ <LinkNode/>           // circle, favicon, 보라 링
      │       │   ├─ <TagNode/>            // square, 태그색 틴트
      │       │   └─ <CollectionNode/>     // hexagon
      │       ├─ edgeTypes: <RelationEdge/>// 타입별 스타일 + 라벨 + 화살표
      │       ├─ <NodeContextMenu/>        // Edit/Delete/Create Relation/Open URL
      │       ├─ <GraphLegend/>            // 좌하단 엣지 범례
      │       └─ <MiniMap/>                // 우하단
      │
      └─ <DetailPanel>                     // 노드 선택 시, 없으면 <DetailEmptyState/>
          ├─ <DetailHeader/>              // favicon + title + ★ + ✕
          ├─ <DetailTabs>                 // 상세정보 / 관계(N) / 메모 / 미리보기
          │   ├─ <DetailsTab/>            // 제목·URL·설명·태그칩·도메인·날짜·즐겨찾기 토글
          │   ├─ <RelationsTab/>          // 타입별 관련 링크 목록 + <AddRelationButton/>
          │   ├─ <NotesTab/>              // <MarkdownEditor/> + <MarkdownPreview/>
          │   └─ <PreviewTab/>            // favicon/thumbnail/meta title/desc
          └─ <QuickActions/>             // 새 링크/관련 링크/메모 추가 ...

  // Dialogs / overlays (포털)
  ├─ <LinkFormDialog/>      // 수동 폼 + 메타 자동수집 미리보기
  ├─ <TagFormDialog/>       // 이름 + 색상 선택
  ├─ <RelationDialog/>      // source→target, 타입 선택
  ├─ <ConfirmDialog/>       // 영구 삭제 등
  └─ <DropZoneOverlay/>     // URL drag&drop 시 표시
```

## 3. 상태 ↔ 컴포넌트 매핑
| Store | 주 소비 컴포넌트 |
|---|---|
| `useLinksStore` | LinkCardList, DetailPanel, LinkFormDialog, GraphCanvas |
| `useTagsStore` | TagList, TagFormDialog, DetailsTab(칩), FilterMenu |
| `useRelationsStore` | RelationsTab, RelationDialog, RelationEdge |
| `useGraphStore` | GraphCanvas, GraphToolbar, MiniMap, SearchBar |
| `useUiStore` | DetailTabs, NodeContextMenu, Dialog 열림 상태 |

## 4. 핵심 인터랙션 시퀀스
1. **노드 클릭** → `useUiStore.selectNode(id)` → DetailPanel 리렌더 + LinkCard 하이라이트.
2. **LinkCard 클릭** → `useGraphStore.focusNode(id)` (센터/줌) + select.
3. **노드 더블클릭** → `window.api.openExternal(url)`.
4. **우클릭 → Create Relation** → `<RelationDialog source=node>` → 저장 → edges 갱신.
5. **검색 입력** → parser → `useGraphStore.setQuery` → 노드/엣지 dim + 매칭 강조 + LinkList 필터.
6. **URL 드롭** → `<DropZoneOverlay>` → `meta.fetch` → `<LinkFormDialog prefilled>`.

## 5. 반응형 / 패널 토글
- 창 < 1200px: DetailPanel 오버레이(슬라이드 인). < 1024px: LinkList 접힘(아이콘 rail only).
- 각 패널 collapse 버튼 제공(헤더의 토글).
