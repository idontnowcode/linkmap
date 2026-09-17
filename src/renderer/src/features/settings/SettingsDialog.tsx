import { useState } from 'react'
import { Download, Link2Off, Loader2, Upload } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useUiStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export function SettingsDialog(): JSX.Element {
  const open = useUiStore((s) => s.settingsOpen)
  const close = useUiStore((s) => s.closeSettings)
  const s = useSettingsStore()
  const refresh = useAppStore((s) => s.refresh)

  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<{ checked: number; broken: number } | null>(null)

  const runBrokenLinkCheck = async (): Promise<void> => {
    setChecking(true)
    setCheckResult(null)
    try {
      const res = await window.api.checkBrokenLinks()
      await refresh()
      setCheckResult({ checked: res.checked, broken: res.brokenIds.length })
    } finally {
      setChecking(false)
    }
  }

  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const runExport = async (): Promise<void> => {
    setExporting(true)
    setExportMsg(null)
    try {
      const res = await window.api.exportData()
      if (!res.canceled) setExportMsg(`저장했습니다 — ${res.path}`)
    } finally {
      setExporting(false)
    }
  }

  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const runImport = async (): Promise<void> => {
    setImporting(true)
    setImportMsg(null)
    try {
      const res = await window.api.importData()
      if (res.canceled) return
      if (res.error) {
        setImportMsg(res.error)
        return
      }
      await refresh()
      const sm = res.summary
      setImportMsg(
        sm
          ? `가져왔습니다 — 링크 ${sm.links}, 태그 ${sm.tags}, 관계 ${sm.relations}, 폴더(컬렉션) ${sm.collections}, ` +
            `태그연결 ${sm.linkTags}, 폴더연결 ${sm.collectionLinks}, 동기화 제외 ${sm.folderExclusions}건 확인` +
            `(이미 있던 항목은 건너뜀)`
          : '가져왔습니다.'
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="설정"
      width={460}
      footer={
        <Button variant="outline" onClick={close}>
          닫기
        </Button>
      }
    >
      <Row
        label="AI 관계 추천"
        desc="링크 상세의 관계 탭에 연관 링크를 추천합니다 (로컬 분석, 오프라인)"
        checked={s.aiSuggest}
        onChange={s.setAiSuggest}
      />
      <Row
        label="그래프에 태그 노드 표시"
        desc="끄면 링크 간 관계에만 집중할 수 있습니다"
        checked={s.showTags}
        onChange={s.setShowTags}
      />
      <Row
        label="그래프에 컬렉션 표시"
        desc="컬렉션과 소속 링크를 점선(포함)으로 연결해 보여줍니다"
        checked={s.showCollections}
        onChange={s.setShowCollections}
      />
      <Row
        label="검색/필터 시 비매칭 항목 숨기기"
        desc="끄면 흐리게 표시(강조 모드), 켜면 완전히 숨김"
        checked={s.hideUnmatched}
        onChange={s.setHideUnmatched}
      />

      <div className="pt-3">
        <p className="mb-1 text-body font-medium text-ink-strong">깨진 링크 확인</p>
        <p className="mb-2 text-sm text-ink-muted">
          모든 웹 링크의 URL이 아직 살아있는지 확인합니다(HEAD/GET 요청). 링크 수에 따라 시간이
          걸릴 수 있습니다.
        </p>
        <button
          onClick={() => void runBrokenLinkCheck()}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-body text-ink-strong hover:bg-list disabled:opacity-50"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <Link2Off size={14} />}
          {checking ? '확인 중…' : '깨진 링크 확인'}
        </button>
        {checkResult && (
          <p className="mt-2 text-sm text-ink-muted">
            {checkResult.checked}개 확인, {checkResult.broken}개 응답 없음
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-1 text-body font-medium text-ink-strong">데이터 내보내기 / 가져오기</p>
        <p className="mb-2 text-sm text-ink-muted">
          전체 데이터(링크·태그·관계·폴더 등)를 JSON 파일로 백업하거나, 백업 파일을 다시 가져올
          수 있습니다. 가져오기는 기존 데이터를 지우지 않고 추가만 합니다(같은 항목은 건너뜀).
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => void runExport()}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-body text-ink-strong hover:bg-list disabled:opacity-50"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            내보내기(JSON)
          </button>
          <button
            onClick={() => void runImport()}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-body text-ink-strong hover:bg-list disabled:opacity-50"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            가져오기(JSON)
          </button>
        </div>
        {exportMsg && <p className="mt-2 text-sm text-ink-muted">{exportMsg}</p>}
        {importMsg && <p className="mt-2 text-sm text-ink-muted">{importMsg}</p>}
      </div>
    </Modal>
  )
}

function Row({
  label,
  desc,
  checked,
  onChange
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-body font-medium text-ink-strong">{label}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-line'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}
