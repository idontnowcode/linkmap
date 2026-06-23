import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'

// 본문 색인 대상 텍스트/코드 확장자
const TEXT_EXT = new Set([
  // 텍스트/문서
  'txt', 'md', 'markdown', 'rst', 'log', 'csv', 'tsv',
  // 설정/데이터
  'json', 'jsonc', 'yml', 'yaml', 'xml', 'toml', 'ini', 'env', 'conf', 'properties',
  // 웹/스타일
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
  // 코드
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'rb', 'go', 'rs', 'java', 'kt',
  'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'php', 'swift', 'sh', 'bash', 'zsh', 'sql',
  'dart', 'lua', 'pl', 'r', 'scala', 'clj', 'ex', 'exs', 'elm', 'hs', 'ml', 'jl'
])

const MAX_BYTES = 2_000_000 // 2MB 초과 파일은 색인 안 함
const MAX_CHARS = 8000

/** 텍스트/코드 파일의 본문을 읽어 전문검색용으로 반환. 대상 아니면 null. */
export async function readTextFileContent(path: string): Promise<string | null> {
  try {
    const ext = extname(path).toLowerCase().replace(/^\./, '')
    if (!TEXT_EXT.has(ext)) return null
    const s = await stat(path)
    if (!s.isFile() || s.size > MAX_BYTES) return null
    const raw = await readFile(path, 'utf8')
    const text = raw.replace(/\s+/g, ' ').trim()
    return text ? text.slice(0, MAX_CHARS) : null
  } catch {
    return null
  }
}
