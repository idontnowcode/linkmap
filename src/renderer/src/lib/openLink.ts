import type { LinkKind } from '@shared/types'

/** kind에 맞춰 웹은 기본 브라우저, 파일/폴더는 OS 기본 앱/탐색기로 연다. */
export function openTarget(kind: LinkKind | undefined, target: string): void {
  if (kind === 'file' || kind === 'folder') {
    void window.api.openPath(target)
  } else {
    void window.api.openExternal(target)
  }
}
