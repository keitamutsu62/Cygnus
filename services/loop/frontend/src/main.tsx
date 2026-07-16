import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadTheme, applyTheme } from './lib/theme'
applyTheme(loadTheme())
if (window.location.pathname.startsWith('/preview')) {
  ;(window as unknown as { __CYGNUS_PREVIEW?: boolean }).__CYGNUS_PREVIEW = true
}
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ReviewsPage from './pages/ReviewsPage'
import ThemePreviewPage from './pages/ThemePreviewPage'
import './index.css'
import AuthGuard from './components/AuthGuard'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import SalesPage from './pages/SalesPage'
import SettingsPage from './pages/SettingsPage'
import CheckoutPage from './pages/CheckoutPage'
import MenusPage from './pages/MenusPage'
import PlanPage from './pages/PlanPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/insights" element={<DashboardPage />} />
            <Route path="/dashboard" element={<Navigate to="/insights" replace />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/menus" element={<MenusPage />} />
            <Route path="/plan" element={<PlanPage />} />
          </Route>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Route>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route element={<AppLayout />}>
          <Route path="/preview/:theme" element={<ThemePreviewPage />} />
          <Route path="/preview/:page/:theme" element={<ThemePreviewPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
