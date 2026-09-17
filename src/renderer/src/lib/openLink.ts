import type { LinkKind } from '@shared/types'
import { useAppStore } from '@/store/appStore'

/** kind에 맞춰 웹은 기본 브라우저, 파일/폴더는 OS 기본 앱/탐색기로 연다.
 * id를 주면 "최근 연 링크" 스마트뷰 기준(links.opened_at)도 함께 갱신한다(fire-and-forget). */
export function openTarget(kind: LinkKind | undefined, target: string, id?: string): void {
  if (kind === 'file' || kind === 'folder') {
    void window.api.openPath(target)
  } else {
    void window.api.openExternal(target)
  }
  if (id) {
    void window.api.markLinkOpened(id).then(() => useAppStore.getState().refresh())
  }
}
