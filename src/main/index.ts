import { app, BrowserWindow, globalShortcut, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { initDb } from './db/client'
import { seedIfEmpty } from './db/seed'
import { registerIpcHandlers } from './ipc'

const isDev = !app.isPackaged
let quickCaptureWin: BrowserWindow | null = null

// 개발: 프로젝트 루트의 resources/icon.png · 패키징: extraResources로 복사된 리소스 경로
const iconPath = isDev
  ? join(__dirname, '../../resources/icon.png')
  : join(process.resourcesPath, 'icon.png')

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    backgroundColor: '#1B2030',
    title: 'LinkMap',
    ...(existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload가 require('electron')만 사용 — DB는 main에서만 접근
      plugins: true // Chromium 내장 PDFium 활성화 — 파일 미리보기 탭의 <embed type="application/pdf"> 렌더링에 필요
    }
  })

  win.once('ready-to-show', () => win.show())

  // 외부 링크는 기본 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * 전역 단축키 빠른 캡처(P12) — 작은 always-on-top 프레임리스 팝업 창. 별도 렌더러 번들을
 * 두지 않고 같은 index.html을 "#popup" 해시로 로드해 main.tsx가 다른 컴포넌트를 렌더링하게
 * 한다. 포커스를 잃으면(blur) 자동으로 닫힌다.
 */
function createQuickCapturePopup(): void {
  if (quickCaptureWin && !quickCaptureWin.isDestroyed()) {
    quickCaptureWin.focus()
    return
  }
  quickCaptureWin = new BrowserWindow({
    width: 480,
    height: 180,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#1B2030',
    ...(existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  quickCaptureWin.once('ready-to-show', () => {
    quickCaptureWin?.show()
    quickCaptureWin?.focus()
  })
  quickCaptureWin.on('blur', () => quickCaptureWin?.close())
  quickCaptureWin.on('closed', () => {
    quickCaptureWin = null
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    quickCaptureWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#popup`)
  } else {
    quickCaptureWin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'popup' })
  }
}

app.whenReady().then(async () => {
  // DB 초기화 + 시드 (테이블 생성은 initDb 내부에서 보장)
  await initDb()
  await seedIfEmpty()
  registerIpcHandlers()
  createWindow()

  const registered = globalShortcut.register('CommandOrControl+Shift+L', () => {
    createQuickCapturePopup()
  })
  if (!registered) {
    console.error('[LinkMap] 전역 단축키(Ctrl/Cmd+Shift+L) 등록 실패 — 다른 앱이 선점했을 수 있습니다.')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
