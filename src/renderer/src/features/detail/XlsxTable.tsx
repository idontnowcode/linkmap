import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { XlsxSheetData } from './xlsxPreview'

interface Props {
  sheetNames: string[]
  sheets: Record<string, XlsxSheetData>
}

// 첫 행을 항상 머리글로 본다 (신규 버전 XlsxTable.tsx와 동일 가정)
export function XlsxTable({ sheetNames, sheets }: Props): JSX.Element {
  const [active, setActive] = useState(sheetNames[0])
  const sheet = sheets[active] ?? sheets[sheetNames[0]]
  const [header, ...body] = sheet.rows

  return (
    <div>
      {sheetNames.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {sheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActive(name)}
              className={cn(
                'rounded-sm px-2 py-1 text-sm',
                name === active
                  ? 'bg-brand/10 font-semibold text-brand'
                  : 'text-ink-muted hover:bg-list'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-80 overflow-auto rounded-md border border-line">
        {sheet.rows.length === 0 ? (
          <p className="p-3 text-sm text-ink-muted">빈 시트입니다.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-list">
              <tr>
                {header.map((cell, j) => (
                  <th
                    key={j}
                    className="whitespace-nowrap border-b border-line px-2 py-1.5 text-left font-medium text-ink-strong"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-2 py-1.5 text-ink-strong">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {sheet.truncated && <p className="mt-1.5 text-sm text-ink-muted">처음 500행만 표시합니다.</p>}
    </div>
  )
}
