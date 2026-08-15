# 12_LinkMap

관계형 북마크 그래프 매니저 (Electron 데스크톱).

## 현재 상태
- **Phase**: Do 완료, 반복 개선 진행 중 (런어블 앱, 기능 다수 구현 완료)
- 전체 기능 목록·구조·데이터 모델은 `docs/08_FEATURE_GUIDE.md` 참조 (가장 최신, 구현 기준).
- 실행: `npm run dev`

## 문서 (읽는 순서)
- `docs/08_FEATURE_GUIDE.md` — **구현 완료 기준 종합 기능 설명서** (목적·구조·기능 전체, 가장 정확)
- `docs/01_PRD.md` ~ `07_WIREFRAME_COMPONENT_TREE.md` — 초기 기획 단계 문서(참고용, 이후 확장된 부분은 08번이 우선)

## 스택
Electron · electron-vite · React 18 · TS(strict) · Tailwind(자체 UI 프리미티브) · Zustand · React Flow · d3-force/dagre · @libsql/client · Drizzle.
