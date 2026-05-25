import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
import InventoryPage from './pages/InventoryPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
