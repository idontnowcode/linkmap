// 전역 단축키 빠른 캡처 팝업(P12, Ctrl/Cmd+Shift+L) — main.tsx가 "#popup" 해시일 때 이
// 컴포넌트를 렌더링한다. 이 창은 메인 창과 별도 렌더러 인스턴스(별도 zustand 스토어)라
// window.api를 직접 호출한다 — 생성된 링크는 main 프로세스가 graph:changed 이벤트로
// 메인 창에 알려 자동 새로고침되게 한다(windowEvents.ts + App.tsx 참조).
import { useEffect, useRef, useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'done'; title: string }
  | { kind: 'error'; message: string }
  | { kind: 'confirm-duplicate'; existingTitle: string }

export function QuickCapturePopup(): JSX.Element {
  const [value, setValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') window.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (status.kind !== 'done') return
    const t = setTimeout(() => window.close(), 700)
    return () => clearTimeout(t)
  }, [status])

  const saveUrl = async (raw: string): Promise<void> => {
    const url = raw.trim()
    if (!url) return
    const isWeb = /^https?:\/\//i.test(url)
    // 이 팝업은 별도 렌더러 인스턴스라 메인 창의 LinkFormDialog가 하는 중복 경고(P3)를
    // 그대로 못 쓴다 — window.api로 직접 확인. LinkFormDialog와 같은 원칙(경고만, 저장은
    // 막지 않음)을 따르되, 이미 한 번 경고를 보고도 Enter를 다시 눌렀으면 그대로 저장한다.
    if (isWeb && status.kind !== 'confirm-duplicate') {
      const snapshot = await window.api.getSnapshot()
      const dup = snapshot.links.find((l) => l.kind === 'web' && l.deletedAt == null && l.url === url)
      if (dup) {
        setStatus({ kind: 'confirm-duplicate', existingTitle: dup.title })
        return
      }
    }
    setStatus({ kind: 'saving' })
    try {
      if (isWeb) {
        const meta = await window.api.fetchMeta(url)
        const link = await window.api.createLink({
          kind: 'web',
          url,
          title: meta.title || url,
          description: meta.description,
          favicon: meta.favicon,
          thumbnail: meta.thumbnail,
          content: meta.content
        })
        setStatus({ kind: 'done', title: link.title })
      } else {
        // URL 형태가 아니면 로컬 경로로 간주 — pathInfo로 파일/폴더 판별 후 그대로 링크화
        const info = await window.api.pathInfo(url)
        if (!info.exists) {
          setStatus({ kind: 'error', message: '유효한 URL도, 존재하는 경로도 아닙니다.' })
          return
        }
        const link = await window.api.createLink({ kind: info.kind, url, title: info.title, content: info.content })
        setStatus({ kind: 'done', title: link.title })
      }
    } catch {
      setStatus({ kind: 'error', message: '저장하지 못했습니다.' })
    }
  }

  const saveDroppedFile = async (path: string): Promise<void> => {
    setStatus({ kind: 'saving' })
    try {
      const info = await window.api.pathInfo(path)
      const link = await window.api.createLink({ kind: info.kind, url: path, title: info.title, content: info.content })
      setStatus({ kind: 'done', title: link.title })
    } catch {
      setStatus({ kind: 'error', message: '저장하지 못했습니다.' })
    }
  }

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      const path = window.api.getPathForFile(file)
      if (path) {
        void saveDroppedFile(path)
        return
      }
    }
    const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (text) void saveUrl(text.trim().split('\n')[0])
  }

  const saving = status.kind === 'saving'

  return (
    <div
      className="flex h-screen w-screen flex-col justify-center gap-2.5 bg-rail px-5 py-4 text-ink-dark"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2 text-body font-medium text-white">
        <Link2 size={16} className="text-brand" />
        LinkMap 빠른 캡처
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void saveUrl(value)
        }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (status.kind === 'confirm-duplicate' || status.kind === 'error') setStatus({ kind: 'idle' })
          }}
          disabled={saving}
          placeholder="URL 붙여넣기 또는 파일 경로 입력…"
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-body text-white outline-none placeholder:text-ink-dark-muted focus:border-brand disabled:opacity-50"
        />
      </form>
      <div
        className={`flex h-14 items-center justify-center rounded-md border border-dashed text-sm transition-colors ${
          dragOver ? 'border-brand bg-brand/10 text-white' : 'border-white/10 text-ink-dark-muted'
        }`}
      >
        여기로 파일을 끌어다 놓아도 됩니다
      </div>
      <div className="min-h-[18px] text-sm">
        {status.kind === 'saving' && (
          <span className="flex items-center gap-1.5 text-ink-dark-muted">
            <Loader2 size={13} className="animate-spin" /> 저장 중…
          </span>
        )}
        {status.kind === 'done' && <span className="text-green-400">저장했습니다 — {status.title}</span>}
        {status.kind === 'error' && <span className="text-red-400">{status.message}</span>}
        {status.kind === 'confirm-duplicate' && (
          <span className="text-amber-400">
            이미 저장된 링크입니다 — &lsquo;{status.existingTitle}&rsquo; · Enter를 다시 누르면 그래도 저장
          </span>
        )}
        {status.kind === 'idle' && <span className="text-ink-dark-muted">Enter로 저장 · Esc로 닫기</span>}
      </div>
    </div>
  )
}
