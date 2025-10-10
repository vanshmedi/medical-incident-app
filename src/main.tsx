import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root');
if (!rootEl) {
  // eslint-disable-next-line no-console
  console.error('Root element #root not found');
}
createRoot(rootEl!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
