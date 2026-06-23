import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'

const josefin = "'Josefin Sans', sans-serif"
const gold    = '#C8A882'
const bg      = '#F8F7F4'
const border  = '#E4E0D8'

const NAV = [
  { to: '/admin',            label: 'HOME',   icon: HomeIcon },
  { to: '/admin/staffs',    label: 'STAFF',  icon: StaffIcon },
  { to: '/admin/responses', label: 'VOICE',  icon: VoiceIcon },
  { to: '/admin/settings',  label: 'SET',    icon: SettingsIcon },
]

const OrbitSVG = () => (
  <svg width="14" height="14" viewBox="0 0 80 80" fill="none">
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke={gold} strokeWidth="6" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="6" opacity="0.5"/>
  </svg>
)

export { OrbitSVG }

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: bg,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
        background: '#fff',
        borderBottom: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <OrbitSVG />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, letterSpacing: '0.2em', color: '#1a1816' }}>CYGNUS</span>
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, letterSpacing: '0.2em', color: gold }}>VOICE</span>
          </div>
        </div>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.15em', color: '#aaa', textTransform: 'uppercase' }}>
          管理画面
        </div>
      </header>

      {/* Content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        <Outlet />
      </div>

      {/* Bottom Nav */}
      <nav style={{
        flexShrink: 0,
        display: 'flex',
        background: '#fff',
        borderTop: `1px solid ${border}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 10,
      }}>
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === '/admin'
            ? location.pathname === '/admin'
            : location.pathname.startsWith(to)
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                gap: 4,
                padding: '14px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              <Icon active={active} />
              <span style={{
                fontFamily: josefin,
                fontWeight: 100,
                fontSize: 10,
                letterSpacing: '0.15em',
                color: active ? gold : '#bbb',
              }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#1a1816' : '#ccc'
  return (
    <svg viewBox="0 0 22 22" width="20" height="20" fill="none">
      <rect x="2" y="2" width="8" height="8" rx="1" stroke={c} strokeWidth="1.5"/>
      <rect x="12" y="2" width="8" height="8" rx="1" stroke={c} strokeWidth="1.5"/>
      <rect x="2" y="12" width="8" height="8" rx="1" stroke={c} strokeWidth="1.5"/>
      <rect x="12" y="12" width="8" height="8" rx="1" stroke={c} strokeWidth="1.5"/>
    </svg>
  )
}
function StaffIcon({ active }: { active: boolean }) {
  const c = active ? '#1a1816' : '#ccc'
  return (
    <svg viewBox="0 0 22 22" width="20" height="20" fill="none">
      <circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.5"/>
      <path d="M3 19C3 15.7 6.6 13 11 13C15.4 13 19 15.7 19 19" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function VoiceIcon({ active }: { active: boolean }) {
  const c = active ? '#1a1816' : '#ccc'
  return (
    <svg viewBox="0 0 22 22" width="20" height="20" fill="none">
      <path d="M4 8h14M4 12h10M4 16h6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function SettingsIcon({ active }: { active: boolean }) {
  const c = active ? '#1a1816' : '#ccc'
  return (
    <svg viewBox="0 0 22 22" width="20" height="20" fill="none">
      <circle cx="11" cy="11" r="3" stroke={c} strokeWidth="1.5"/>
      <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.9 4.9l1.4 1.4M15.7 15.7l1.4 1.4M4.9 17.1l1.4-1.4M15.7 6.3l1.4-1.4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
