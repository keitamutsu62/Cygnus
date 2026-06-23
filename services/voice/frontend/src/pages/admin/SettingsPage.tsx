import { useState } from 'react'
import { OrbitSVG } from './AdminLayout'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const border  = '#E4E0D8'
const muted   = '#999'

const STORAGE_KEY = 'cygnus_salon_name'
const GOOGLE_URL_KEY = 'cygnus_google_review_url'

export default function SettingsPage() {
  const [salonName, setSalonName] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [googleUrl, setGoogleUrl] = useState(() => localStorage.getItem(GOOGLE_URL_KEY) ?? '')
  const [saved, setSaved] = useState(false)
  const SURVEY_URL = 'https://voice.cygnus.style'

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, salonName)
    localStorage.setItem(GOOGLE_URL_KEY, googleUrl)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: '20px 20px 32px' }}>

      {/* Salon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <OrbitSVG />
        <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1816' }}>Salon</span>
      </div>
      <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '18px 18px', marginBottom: 24 }}>
        <label style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: muted, display: 'block', marginBottom: 8 }}>サロン名</label>
        <input
          value={salonName}
          onChange={e => setSalonName(e.target.value)}
          style={{
            width: '100%', padding: '11px 13px', boxSizing: 'border-box' as const,
            border: `1px solid ${border}`, borderRadius: 4,
            fontFamily: zen, fontSize: 15, color: '#1a1816',
            background: '#FAFAF8', outline: 'none', marginBottom: 14,
          }}
        />
        <label style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: muted, display: 'block', marginBottom: 8 }}>Google Review URL</label>
        <input
          value={googleUrl}
          onChange={e => setGoogleUrl(e.target.value)}
          placeholder="https://g.page/r/xxx/review"
          style={{
            width: '100%', padding: '11px 13px', boxSizing: 'border-box' as const,
            border: `1px solid ${border}`, borderRadius: 4,
            fontFamily: josefin, fontSize: 13, color: '#1a1816',
            background: '#FAFAF8', outline: 'none', marginBottom: 14,
          }}
        />
        <button onClick={handleSave} style={{
          width: '100%', padding: 13,
          background: saved ? '#6dba8e' : '#1a1816', border: 'none', borderRadius: 4, cursor: 'pointer',
          fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em',
          textTransform: 'uppercase' as const, color: '#fff',
          transition: 'background 0.3s',
        }}>
          {saved ? '保存しました' : 'Save'}
        </button>
      </div>

      {/* QR / URL */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <OrbitSVG />
        <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1816' }}>Survey URL</span>
      </div>
      <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '18px 18px', marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#F8F7F4', border: `1px solid ${border}`, borderRadius: 4,
          padding: '11px 13px', marginBottom: 16,
        }}>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>{SURVEY_URL}</span>
          <button onClick={() => navigator.clipboard.writeText(SURVEY_URL)} style={{
            background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: 8,
            fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.1em', color: '#1a1816',
          }}>COPY</button>
        </div>
        {/* QR placeholder */}
        <div style={{
          height: 160, background: '#F8F7F4', border: `1px solid ${border}`,
          borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column' as const, gap: 8,
        }}>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#CCC" strokeWidth="1.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          </svg>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.15em', color: '#CCC', textTransform: 'uppercase' as const }}>QR CODE COMING SOON</span>
        </div>
      </div>

      {/* Account */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <OrbitSVG />
        <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1816' }}>Account</span>
      </div>
      <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden' }}>
        <button style={{
          width: '100%', padding: '15px 18px', background: 'none',
          border: 'none', cursor: 'pointer', textAlign: 'left' as const,
          fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.15em',
          color: '#999', borderBottom: `1px solid ${border}`,
        }}>パスワード変更</button>
        <button style={{
          width: '100%', padding: '15px 18px', background: 'none',
          border: 'none', cursor: 'pointer', textAlign: 'left' as const,
          fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.15em', color: '#E07060',
        }}>ログアウト</button>
      </div>
    </div>
  )
}
