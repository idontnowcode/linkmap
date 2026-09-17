// 창 간 알림용 — 전역 단축키 빠른 캡처 팝업(P12)이 메인 창과 별도의 렌더러 인스턴스(별도
// zustand 스토어)로 뜨기 때문에, 팝업에서 링크를 만들면 메인 창이 자동으로는 알 수 없다.
// linkCreate가 성공할 때마다 모든 창에 이벤트를 보내 메인 창(App.tsx)이 스냅샷을 새로고침하게 한다.
import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'

export function broadcastGraphChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC.graphChanged)
  }
}
