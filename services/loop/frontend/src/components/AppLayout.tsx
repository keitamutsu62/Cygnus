import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { getSalonName } from '../lib/auth'

const accent = 'var(--accent)'
const text   = 'var(--text)'

const NAV = [
  {
    path: '/dashboard',
    label: 'ホーム',
    icon: (active: boolean) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <rect x="2" y="2" width="8" height="8" rx="1.5" stroke={active ? accent : text} strokeWidth="1.5"/>
        <rect x="12" y="2" width="8" height="8" rx="1.5" stroke={active ? accent : text} strokeWidth="1.5"/>
        <rect x="2" y="12" width="8" height="8" rx="1.5" stroke={active ? accent : text} strokeWidth="1.5"/>
        <rect x="12" y="12" width="8" height="8" rx="1.5" stroke={active ? accent : text} strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    path: '/inventory',
    label: '在庫',
    icon: (active: boolean) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <rect x="2" y="5" width="18" height="14" rx="1.5" stroke={active ? accent : text} strokeWidth="1.5"/>
        <line x1="7" y1="2" x2="7" y2="8" stroke={active ? accent : text} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="15" y1="2" x2="15" y2="8" stroke={active ? accent : text} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="6" y1="13" x2="16" y2="13" stroke={active ? accent : text} strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/sales',
    label: '売上',
    icon: (active: boolean) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <polyline points="2,16 7,10 11,13 16,7 20,9" stroke={active ? accent : text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="2" y1="19" x2="20" y2="19" stroke={active ? accent : text} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      </svg>
    ),
  },
  {
    path: '/settings',
    label: '設定',
    icon: (active: boolean) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <circle cx="11" cy="8" r="4" stroke={active ? accent : text} strokeWidth="1.5"/>
        <path d="M3 19C3 15.7 6.6 13 11 13C15.4 13 19 15.7 19 19" stroke={active ? accent : text} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const salonName = getSalonName()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div style={{
      height: '100%',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* トップバー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="22" height="22" viewBox="0 0 80 80" fill="none">
            <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)" stroke="var(--accent)" strokeWidth="4" opacity="0.9"/>
            <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke="var(--accent)" strokeWidth="4" opacity="0.5"/>
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 100, fontSize: 15, letterSpacing: '0.2em', color: 'var(--text)' }}>CYGNUS</span>
            <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 100, fontSize: 15, letterSpacing: '0.2em', color: 'var(--accent)' }}>LOOP</span>
          </div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
          {salonName}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </div>

      {/* 会計 FAB */}
      <button
        onClick={() => navigate('/checkout')}
        style={{
          position: 'fixed',
          bottom: 'calc(88px + env(safe-area-inset-bottom))',
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          boxShadow: '0 4px 20px var(--accent-dim)',
          zIndex: 20,
          touchAction: 'manipulation',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <rect x="3" y="5" width="16" height="13" rx="2" stroke="var(--on-accent)" strokeWidth="1.6"/>
          <line x1="3" y1="9" x2="19" y2="9" stroke="var(--on-accent)" strokeWidth="1.2"/>
          <line x1="7" y1="13" x2="10" y2="13" stroke="var(--on-accent)" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="7" y1="15.5" x2="12" y2="15.5" stroke="var(--on-accent)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300, fontSize: 7, letterSpacing: '0.12em', color: 'var(--on-accent)' }}>会計</span>
      </button>

      {/* ボトムナビ */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        zIndex: 10,
      }}>
        {NAV.map(item => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '25px 0 23px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {item.icon(active)}
              <span style={{
                fontSize: 12,
                letterSpacing: '0.08em',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: "'Josefin Sans', sans-serif",
                fontWeight: 100,
              }}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
