import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/global.css'
import './lib/i18n'
import { App } from './app/App'
import { installAriaStrings } from './ui/ariaStrings'

// Before the first render: React Aria reads its global dictionary once (T-M2.32 (f), ui/ariaStrings).
installAriaStrings()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
