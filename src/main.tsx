import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getActionBuffer } from './game/actionBuffer'

// Debug hook: inspect the named-action history from the browser console via
// `__actionBuffer()`.
declare global {
  interface Window {
    __actionBuffer: typeof getActionBuffer
  }
}
window.__actionBuffer = getActionBuffer

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
