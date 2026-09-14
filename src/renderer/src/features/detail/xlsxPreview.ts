// xlsx 워크북을 문자열 표(시트별)로 변환. 신규 버전의 xlsxPreview.ts 로직 참고.
import * as XLSX from 'xlsx'

export interface XlsxSheetData {
  rows: string[][]
  truncated: boolean
}

// 큰 시트를 그대로 DOM에 쏟으면 렌더링이 버벅인다 — 앞부분만 보여주고 잘렸음을 알린다.
const MAX_ROWS = 500

export function xlsxSheetToRows(ws: XLSX.WorkSheet): XlsxSheetData {
  const all = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '', raw: false })
  const truncated = all.length > MAX_ROWS
  return { rows: truncated ? all.slice(0, MAX_ROWS) : all, truncated }
}

export interface XlsxWorkbookData {
  sheetNames: string[]
  sheets: Record<string, XlsxSheetData>
}

export function xlsxWorkbookToSheets(wb: XLSX.WorkBook): XlsxWorkbookData {
  const sheets: Record<string, XlsxSheetData> = {}
  for (const name of wb.SheetNames) sheets[name] = xlsxSheetToRows(wb.Sheets[name])
  return { sheetNames: wb.SheetNames, sheets }
}
