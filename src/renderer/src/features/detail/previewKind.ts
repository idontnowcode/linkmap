// 파일 링크(kind: 'file')의 확장자를 보고 어떤 방식으로 미리보기를 렌더링할지 판정.
// 신규 버전(Linkmap)의 previewKind.ts 판정 로직을 참고해 기존 타입(LinkKind)에 맞게 재작성.
import type { LinkKind } from '@shared/types'

export type PreviewKind = 'pdf' | 'image' | 'markdown' | 'text' | 'docx' | 'xlsx'

const MARKDOWN_EXTS = new Set(['md', 'markdown'])

// <img>가 그대로 그릴 수 있는 형식만 다룬다 — svg도 <img src="blob:...">로 넣으면
// "이미지 컨텍스트"로 취급되어 내부 스크립트가 실행되지 않는다.
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'])

export const IMAGE_MIME_BY_EXT: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml'
}

// 소스코드·설정 파일처럼 열어서 바로 읽을 수 있는 평문 확장자.
// main/services/fileContent.ts의 TEXT_EXT(readBinary 화이트리스트)와 반드시 맞춰야
// "판정은 되는데 IPC가 거절하는" 불일치가 안 생긴다.
const TEXT_EXTS = new Set([
  'txt', 'rst', 'log', 'csv', 'tsv',
  'json', 'jsonc', 'yml', 'yaml', 'xml', 'toml', 'ini', 'env', 'conf', 'properties',
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'rb', 'go', 'rs', 'java', 'kt',
  'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'php', 'swift', 'sh', 'bash', 'zsh', 'sql', 'bat', 'ps1',
  'dart', 'lua', 'pl', 'r', 'scala', 'clj', 'ex', 'exs', 'elm', 'hs', 'ml', 'jl'
])

function extOf(pathOrUrl: string): string {
  const clean = pathOrUrl.split(/[?#]/)[0]
  const i = clean.lastIndexOf('.')
  return i === -1 ? '' : clean.slice(i + 1).toLowerCase()
}

/** Blob 생성 시 쓸 MIME 타입. 매핑에 없으면 브라우저의 매직바이트 추론에 맡긴다. */
export function imageMimeFor(url: string): string {
  return IMAGE_MIME_BY_EXT[extOf(url)] ?? 'application/octet-stream'
}

/** file 링크만 대상 — folder는 열어서 안을 봐야 뜻이 있고 web/note는 각자의 방식이 있다. */
export function previewKindFor(kind: LinkKind, url: string): PreviewKind | null {
  if (kind !== 'file') return null
  const ext = extOf(url || '')
  if (ext === 'pdf') return 'pdf'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (MARKDOWN_EXTS.has(ext)) return 'markdown'
  if (TEXT_EXTS.has(ext)) return 'text'
  // 옛 바이너리 포맷(.doc/.xls)은 OLE Compound File이라 지원하지 않음.
  // 신형 OOXML(.docx/.xlsx)만 mammoth/xlsx로 파싱해 렌더링한다.
  if (ext === 'docx') return 'docx'
  if (ext === 'xlsx') return 'xlsx'
  return null
}
