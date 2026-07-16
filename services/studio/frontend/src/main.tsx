import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadTheme, applyTheme } from './lib/theme'
applyTheme(loadTheme())
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import AuthGuard from './components/AuthGuard'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import ArchivePage from './pages/ArchivePage'
import TimelinePage from './pages/TimelinePage'
import ProfilePage from './pages/ProfilePage'
import PreviewPage from './pages/PreviewPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AppLayout />}>
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/preview/:page" element={<PreviewPage />} />
        </Route>
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
