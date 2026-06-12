import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { getClaims } from '../lib/auth'

const accent  = 'var(--accent)'
const text    = 'var(--text)'
const josefin = "'Josefin Sans', sans-serif"

const NAV = [
  {
    path: '/home',
    label: 'Home',
    icon: (active: boolean) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={active ? accent : text} strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M8 20v-7h6v7" stroke={active ? accent : text} strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/archive',
    label: 'Archive',
    icon: (active: boolean) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <rect x="2" y="2" width="8" height="8" rx="1" stroke={active ? accent : text} strokeWidth="1.5"/>
        <rect x="12" y="2" width="8" height="8" rx="1" stroke={active ? accent : text} strokeWidth="1.5"/>
        <rect x="2" y="12" width="8" height="8" rx="1" stroke={active ? accent : text} strokeWidth="1.5"/>
        <rect x="12" y="12" width="8" height="8" rx="1" stroke={active ? accent : text} strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    path: '/timeline',
    label: 'Timeline',
    icon: (active: boolean) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <line x1="7" y1="4" x2="7" y2="18" stroke={active ? accent : text} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="7" cy="7" r="2" stroke={active ? accent : text} strokeWidth="1.5"/>
        <circle cx="7" cy="15" r="2" stroke={active ? accent : text} strokeWidth="1.5"/>
        <line x1="11" y1="7" x2="19" y2="7" stroke={active ? accent : text} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        <line x1="11" y1="15" x2="19" y2="15" stroke={active ? accent : text} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
        <circle cx="11" cy="8" r="4" stroke={active ? accent : text} strokeWidth="1.5"/>
        <path d="M3 19c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke={active ? accent : text} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const claims = getClaims()
  const displayName = claims?.display_name ?? ''
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
      {/* ヘッダー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        paddingTop: 'calc(14px + env(safe-area-inset-top))',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <OrbitSVG />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.22em', color: 'var(--text)' }}>CYGNUS</div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.22em', color: 'var(--accent)' }}>STUDIO</div>
          </div>
        </div>
        {displayName && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: josefin, letterSpacing: '0.1em' }}>
            {displayName}
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'none', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </div>

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
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '25px 0 23px', gap: 4, cursor: 'pointer',
                background: 'none', border: 'none', touchAction: 'manipulation',
              }}
            >
              {item.icon(active)}
              <span style={{
                fontFamily: josefin, fontWeight: 100, fontSize: 10,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
              }}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OrbitSVG() {
  return (
    <svg width="22" height="22" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes sCW  { from{transform:rotate(0deg);transform-origin:40px 40px} to{transform:rotate(360deg);transform-origin:40px 40px} }
        @keyframes sCCW { from{transform:rotate(0deg);transform-origin:40px 40px} to{transform:rotate(-360deg);transform-origin:40px 40px} }
        .soa{animation:sCW 26s linear infinite;transform-origin:40px 40px}
        .sob{animation:sCCW 34s linear infinite;transform-origin:40px 40px}
      `}</style>
      <ellipse className="soa" cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)" stroke="var(--accent)" strokeWidth="4" opacity="0.9"/>
      <ellipse className="sob" cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke="var(--accent)" strokeWidth="4" opacity="0.5"/>
    </svg>
  )
}
