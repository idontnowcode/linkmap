import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { QuickCapturePopup } from './features/quickCapture/QuickCapturePopup'
import './styles/globals.css'

// 전역 단축키 빠른 캡처(P12) — 별도 렌더러 번들을 만들지 않고, main 프로세스가
// 팝업 창에 같은 index.html을 "#popup" 해시로 로드해 여기서 갈라 렌더링한다.
const isPopup = window.location.hash === '#popup'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isPopup ? <QuickCapturePopup /> : <App />}</React.StrictMode>
)
