// 로컬 파일 링크(kind: 'file')의 리치 미리보기. 신규 버전(Linkmap)의 LinkPreview.tsx 로직을
// 참고해 기존 컴포넌트 트리(PreviewTab)에 맞게 재작성. mammoth/xlsx는 P1 신규 의존성,
// 마크다운은 신규처럼 자체 렌더러를 새로 만들지 않고 기존에 이미 있는 react-markdown +
// remark-gfm(NotesTab과 동일 라이브러리)을 재사용한다.
import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import * as mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import DOMPurify from 'dompurify'
import type { Link } from '@shared/types'
import { imageMimeFor, previewKindFor } from './previewKind'
import { xlsxWorkbookToSheets, type XlsxSheetData } from './xlsxPreview'
import { XlsxTable } from './XlsxTable'

type Loaded =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'text'; text: string }
  | { status: 'pdf'; blobUrl: string }
  | { status: 'image'; blobUrl: string }
  | { status: 'docx'; html: string }
  | { status: 'xlsx'; sheetNames: string[]; sheets: Record<string, XlsxSheetData> }

/** kind==='file'이고 previewKindFor가 대상이 아니면 null을 반환 — 그 경우 PreviewTab이 기존 UI로 대체 */
export function FilePreview({ link }: { link: Link }): JSX.Element | null {
  const kind = previewKindFor(link.kind, link.url)
  const [state, setState] = useState<Loaded>({ status: 'loading' })

  useEffect(() => {
    if (!kind) return
    let cancelled = false
    setState({ status: 'loading' })

    async function load(): Promise<void> {
      const r = await window.api.readBinary(link.url)
      if (cancelled) return
      if (!r.ok || !r.data) {
        const reason =
          r.reason === 'too_large'
            ? '파일이 너무 커서 미리볼 수 없습니다.'
            : '파일을 열 수 없습니다 — 옮겨졌거나 지워졌을 수 있습니다.'
        setState({ status: 'error', message: reason })
        return
      }

      if (kind === 'pdf' || kind === 'image') {
        // slice()로 복사 — Uint8Array.buffer가 SharedArrayBuffer일 수 있어 Blob 생성자가
        // 그대로 안 받는 경우가 있다. slice()가 만드는 새 버퍼는 항상 순수 ArrayBuffer.
        const mime = kind === 'pdf' ? 'application/pdf' : imageMimeFor(link.url)
        const blobUrl = URL.createObjectURL(new Blob([r.data.slice()], { type: mime }))
        setState({ status: kind, blobUrl })
        return
      }

      if (kind === 'docx' || kind === 'xlsx') {
        try {
          if (kind === 'docx') {
            const result = await mammoth.convertToHtml({ arrayBuffer: r.data.slice().buffer })
            if (cancelled) return
            // mammoth 출력은 원본 .docx의 하이퍼링크/스타일을 그대로 HTML로 옮기므로,
            // 로컬 파일이라도 조작된 문서(예: javascript: href)를 열 수 있어 반드시 새니타이즈한다.
            setState({ status: 'docx', html: DOMPurify.sanitize(result.value) })
          } else {
            const workbook = XLSX.read(r.data, { type: 'array' })
            if (cancelled) return
            const { sheetNames, sheets } = xlsxWorkbookToSheets(workbook)
            setState({ status: 'xlsx', sheetNames, sheets })
          }
        } catch {
          setState({
            status: 'error',
            message: '파일 형식을 읽지 못했습니다 — 손상되었거나 지원하지 않는 형식일 수 있습니다.'
          })
        }
        return
      }

      // text / markdown — 원문 바이트를 그대로 UTF-8로 디코딩(검색용 content와 달리 줄바꿈 보존)
      const text = new TextDecoder('utf-8').decode(r.data)
      setState({ status: 'text', text })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [kind, link.url])

  // pdf/image Blob URL은 다 쓰면 반드시 해제
  useEffect(() => {
    return () => {
      if (state.status === 'pdf' || state.status === 'image') URL.revokeObjectURL(state.blobUrl)
    }
  }, [state])

  if (!kind) return null

  return (
    <div className="mb-4">
      {state.status === 'loading' && <p className="text-sm text-ink-muted">불러오는 중…</p>}
      {state.status === 'error' && <p className="text-sm text-ink-muted">{state.message}</p>}
      {state.status === 'pdf' && (
        <embed src={state.blobUrl} type="application/pdf" className="h-[480px] w-full rounded-md border border-line" />
      )}
      {state.status === 'image' && (
        <img
          src={state.blobUrl}
          alt={link.title || link.url}
          className="max-h-[480px] w-full rounded-md border border-line object-contain"
        />
      )}
      {state.status === 'text' && kind === 'markdown' && (
        <div className="markdown-body max-h-[480px] space-y-2 overflow-y-auto rounded-md border border-line p-3 text-body text-ink-strong">
          <Markdown remarkPlugins={[remarkGfm]}>{state.text}</Markdown>
        </div>
      )}
      {state.status === 'text' && kind === 'text' && (
        <pre className="max-h-[480px] overflow-auto rounded-md border border-line bg-list p-3 text-sm text-ink-strong">
          {state.text}
        </pre>
      )}
      {state.status === 'docx' && (
        <div
          className="markdown-body max-h-[480px] space-y-2 overflow-y-auto rounded-md border border-line p-3 text-body text-ink-strong"
          dangerouslySetInnerHTML={{ __html: state.html }}
        />
      )}
      {state.status === 'xlsx' && <XlsxTable sheetNames={state.sheetNames} sheets={state.sheets} />}
    </div>
  )
}
