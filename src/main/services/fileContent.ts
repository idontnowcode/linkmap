import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'
import type { ReadBinaryResult } from '@shared/ipc'
import { extractText, getDocumentProxy } from 'unpdf'
import * as mammoth from 'mammoth'
import * as XLSX from 'xlsx'

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
  'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'php', 'swift', 'sh', 'bash', 'zsh', 'sql', 'bat', 'ps1',
  'dart', 'lua', 'pl', 'r', 'scala', 'clj', 'ex', 'exs', 'elm', 'hs', 'ml', 'jl'
])

const MAX_BYTES = 2_000_000 // 2MB 초과 텍스트/코드 파일은 색인 안 함
const MAX_CHARS = 8000

// PDF/DOCX/XLSX도 전문검색 대상에 포함(2026-09-18) — unpdf(pdf.js 기반 순수 JS/WASM,
// 네이티브 바이너리 없음)로 PDF, 이미 의존성 있는 mammoth로 DOCX, xlsx(SheetJS)로 XLSX
// 본문을 추출한다. 원문 자체를 파싱해야 해서 텍스트 파일보다 큰 상한을 둔다.
const RICH_TEXT_EXT = new Set(['pdf', 'docx', 'xlsx'])
const MAX_RICH_TEXT_SOURCE_BYTES = 30_000_000 // 30MB 초과 원본은 파싱 안 함(리치 미리보기 상한과 동일)

async function extractRichTextContent(path: string, ext: string): Promise<string | null> {
  try {
    const s = await stat(path)
    if (!s.isFile() || s.size > MAX_RICH_TEXT_SOURCE_BYTES) return null
    const buf = await readFile(path)
    let raw = ''
    if (ext === 'pdf') {
      const doc = await getDocumentProxy(new Uint8Array(buf))
      const { text } = await extractText(doc, { mergePages: true })
      raw = text
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: buf })
      raw = result.value
    } else if (ext === 'xlsx') {
      const workbook = XLSX.read(buf, { type: 'buffer' })
      raw = workbook.SheetNames.map((name) => XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join('\n')
    }
    const text = raw.replace(/\s+/g, ' ').trim()
    return text ? text.slice(0, MAX_CHARS) : null
  } catch {
    // 손상되었거나 지원 범위 밖인 파일 — 전문검색 대상에서만 조용히 제외(제목/경로로는 여전히 검색 가능)
    return null
  }
}

/** 파일의 본문을 읽어 전문검색용으로 반환. 텍스트/코드는 그대로, pdf/docx/xlsx는 파싱해 추출.
 *  대상 확장자가 아니면 null. */
export async function readTextFileContent(path: string): Promise<string | null> {
  const ext = extname(path).toLowerCase().replace(/^\./, '')
  if (RICH_TEXT_EXT.has(ext)) return extractRichTextContent(path, ext)
  try {
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

// ── 바이너리 파일 미리보기용 읽기 ──────────────────────────
// P1(파일 미리보기 강화)의 전제 IPC. 렌더러의 previewKind.ts가 판정하는 6종류
// (pdf/image/markdown/text/docx/xlsx)를 이 채널 하나로 커버한다 — pdf/image/docx/xlsx는
// Uint8Array를 그대로 쓰고, markdown/text는 렌더러에서 TextDecoder로 디코딩한다.
// 임의 바이너리를 렌더러로 노출하지 않도록 확장자 화이트리스트를 둔다.
const RICH_BINARY_EXT = new Set([
  'pdf',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg',
  'docx',
  'xlsx'
])
const TEXT_PREVIEW_EXT = new Set([...TEXT_EXT, 'markdown'])

const MAX_RICH_BINARY_BYTES = 30_000_000 // 30MB 초과는 pdf/이미지/docx/xlsx 미리보기 대상에서 제외
const MAX_TEXT_PREVIEW_BYTES = 5_000_000 // 5MB 초과는 텍스트/마크다운 미리보기 대상에서 제외

/** 미리보기용 파일을 원문 그대로 Uint8Array로 읽어 반환. 확장자/용량 제한 적용. */
export async function readBinaryFile(path: string): Promise<ReadBinaryResult> {
  try {
    const ext = extname(path).toLowerCase().replace(/^\./, '')
    const isRich = RICH_BINARY_EXT.has(ext)
    const isText = TEXT_PREVIEW_EXT.has(ext)
    if (!isRich && !isText) return { ok: false, data: null, reason: 'unsupported' }
    const s = await stat(path)
    if (!s.isFile()) return { ok: false, data: null, reason: 'not_found' }
    const maxBytes = isRich ? MAX_RICH_BINARY_BYTES : MAX_TEXT_PREVIEW_BYTES
    if (s.size > maxBytes) return { ok: false, data: null, reason: 'too_large' }
    const buf = await readFile(path)
    return { ok: true, data: new Uint8Array(buf) }
  } catch {
    return { ok: false, data: null, reason: 'error' }
  }
}
