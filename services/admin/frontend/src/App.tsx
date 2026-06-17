import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { clearToken, getToken } from './lib/api'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import AppointmentsPage from './pages/AppointmentsPage'
import SalonsPage from './pages/SalonsPage'

const gold    = '#c8a882'
const border  = 'rgba(232,228,220,0.08)'
const muted   = 'rgba(232,228,220,0.55)'
const josefin = "'Josefin Sans', sans-serif"

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

const NAV = [
  { path: '/',             label: 'OVERVIEW' },
  { path: '/salons',       label: 'SALONS' },
  { path: '/appointments', label: 'APPO' },
]

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  if (location.pathname === '/login') return <>{children}</>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* トップバー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 80 80" fill="none">
            <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)" stroke={gold} strokeWidth="4" opacity="0.9"/>
            <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="4" opacity="0.5"/>
          </svg>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, letterSpacing: '0.25em', color: '#e8e4dc' }}>
            CYGNUS <span style={{ color: gold }}>ADMIN</span>
          </span>
        </div>
        <button
          onClick={() => { clearToken(); window.location.href = '/login' }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.12em',
          }}
        >
          LOGOUT
        </button>
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {children}
      </div>

      {/* ボトムナビ */}
      <div style={{
        display: 'flex',
        background: '#211f1d',
        borderTop: `1px solid ${border}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        flexShrink: 0,
      }}>
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 0',
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: josefin,
              letterSpacing: '0.15em',
              color: isActive ? gold : muted,
              borderTop: isActive ? `1px solid ${gold}` : '1px solid transparent',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/salons" element={<RequireAuth><SalonsPage /></RequireAuth>} />
          <Route path="/appointments" element={<RequireAuth><AppointmentsPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
