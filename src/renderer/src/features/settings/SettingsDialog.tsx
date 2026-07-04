import { useUiStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export function SettingsDialog(): JSX.Element {
  const open = useUiStore((s) => s.settingsOpen)
  const close = useUiStore((s) => s.closeSettings)
  const s = useSettingsStore()

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
