import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'

// Icons use the Material Symbols font: start loading it now and reveal icons only once it is ready
// (see .icons-ready in index.css), so icon names never flash as text while the font downloads.
const ICON_FONT = '24px "Material Symbols Outlined"'
const revealIconsWhenReady = () => {
  if (document.fonts.check(ICON_FONT)) {
    document.documentElement.classList.add('icons-ready')
  }
}
document.fonts.load(ICON_FONT).then(revealIconsWhenReady, () => {})
document.fonts.addEventListener('loadingdone', revealIconsWhenReady)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
