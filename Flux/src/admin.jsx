import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppAdmin from './appAdmin.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
      <AppAdmin />
  </StrictMode>,
)
