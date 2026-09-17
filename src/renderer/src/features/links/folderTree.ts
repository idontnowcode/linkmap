// 폴더 가져오기(FolderImportDialog)와 동기화 범위 편집(FolderSyncExclusionDialog)이 공유하는
// 트리 빌드/선택 계산 순수 유틸. entries는 백엔드 walk()가 DFS 전위 순회로 넣어준다(폴더
// 자신 -> 그 하위 전부 -> 다음 형제) — 그 보장 덕분에 depth만으로 스택 기반 재구성이 가능하다.
import type { FolderEntry } from '@shared/ipc'

export interface TreeNode {
  entry: FolderEntry
  children: TreeNode[]
}

export function buildTree(entries: FolderEntry[]): TreeNode[] {
  const roots: TreeNode[] = []
  const stack: TreeNode[] = []
  for (const entry of entries) {
    const node: TreeNode = { entry, children: [] }
    const parent = entry.depth > 1 ? stack[entry.depth - 2] : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
    stack.length = entry.depth - 1
    stack[entry.depth - 1] = node
  }
  return roots
}

export function collectFilePaths(node: TreeNode, out: string[]): void {
  if (!node.entry.isDirectory) {
    out.push(node.entry.relativePath)
    return
  }
  for (const c of node.children) collectFilePaths(c, out)
}

function normalizeRel(p: string): string {
  return p.replace(/\\/g, '/')
}

/** relativePath 자신이나 그 조상 경로가 excluded 목록에 있으면 true (gitignore 스타일, main의 isPathExcluded와 동일 로직). */
export function isPathExcluded(relativePath: string, excluded: ReadonlySet<string>): boolean {
  if (excluded.size === 0) return false
  const norm = normalizeRel(relativePath)
  for (const ex of excluded) {
    const exNorm = normalizeRel(ex)
    if (norm === exNorm || norm.startsWith(`${exNorm}/`)) return true
  }
  return false
}

/** 트리 전체 파일 중 included(체크됨)가 아닌 것들의 최소 경로 집합을 계산 — 폴더 전체가
 * 빠지면 파일 하나하나 대신 그 폴더 경로 하나만 담아 저장 크기를 줄인다(gitignore 스타일). */
export function computeExcludedPaths(nodes: TreeNode[], included: ReadonlySet<string>): string[] {
  const excluded: string[] = []

  function anyIncluded(node: TreeNode): boolean {
    if (!node.entry.isDirectory) return included.has(node.entry.relativePath)
    return node.children.some((c) => anyIncluded(c))
  }

  function visit(node: TreeNode): void {
    if (!node.entry.isDirectory) {
      if (!included.has(node.entry.relativePath)) excluded.push(node.entry.relativePath)
      return
    }
    if (!anyIncluded(node)) {
      excluded.push(node.entry.relativePath)
      return
    }
    for (const c of node.children) visit(c)
  }

  for (const n of nodes) visit(n)
  return excluded
}
