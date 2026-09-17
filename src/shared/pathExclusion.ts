// 폴더 동기화 제외 목록 판정 — main(folderImport.ts)과 renderer(folderTree.ts) 양쪽에
// 똑같은 로직이 복제되어 있던 것을 하나로 합쳤다(eval-rubric 지적, 2026-09-18). 순수 문자열
// 연산만 하므로 두 프로세스 어디서든 그대로 쓸 수 있다.

function normalizeRel(p: string): string {
  return p.replace(/\\/g, '/')
}

/** relativePath 자신이나 그 조상 경로가 excluded 목록에 있으면 true (gitignore 스타일). */
export function isPathExcluded(relativePath: string, excluded: ReadonlySet<string>): boolean {
  if (excluded.size === 0) return false
  const norm = normalizeRel(relativePath)
  for (const ex of excluded) {
    const exNorm = normalizeRel(ex)
    if (norm === exNorm || norm.startsWith(`${exNorm}/`)) return true
  }
  return false
}
