import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = '#C8A882'
const border  = 'rgba(232,228,220,0.15)'
const muted   = 'rgba(232,228,220,0.4)'

const OrbitSVG = () => (
  <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke={gold} strokeWidth="5" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="5" opacity="0.5"/>
  </svg>
)

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    navigate('/admin')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${border}`,
    borderRadius: 2,
    fontFamily: zen, fontSize: 15, color: '#e8e4dc',
    outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#1a1816',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 48 }}>
        <OrbitSVG />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 18, letterSpacing: '0.25em', color: '#e8e4dc' }}>CYGNUS</span>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 18, letterSpacing: '0.25em', color: gold }}>VOICE</span>
        </div>
        <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.3em', color: 'rgba(232,228,220,0.3)', textTransform: 'uppercase' }}>管理画面</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: muted, display: 'block', marginBottom: 8 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="salon@example.com"
            style={{ ...inputStyle, '::placeholder': { color: 'rgba(232,228,220,0.2)' } } as React.CSSProperties}
            autoComplete="email"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: muted, display: 'block', marginBottom: 8 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(224,112,96,0.1)', border: '1px solid rgba(224,112,96,0.25)',
            borderRadius: 2, padding: '10px 14px', marginBottom: 16,
            fontFamily: zen, fontSize: 13, color: '#e07060',
          }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: 15,
            background: loading ? 'rgba(200,168,130,0.3)' : gold,
            border: 'none', borderRadius: 2, cursor: loading ? 'default' : 'pointer',
            fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.25em',
            textTransform: 'uppercase', color: loading ? muted : '#1a1816',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'ログイン中…' : 'Login'}
        </button>
      </form>

      <p style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.15em', color: 'rgba(232,228,220,0.15)', marginTop: 48, textTransform: 'uppercase' }}>
        © CYGNUS VOICE
      </p>
    </div>
  )
}
