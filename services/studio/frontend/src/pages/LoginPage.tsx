import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { setToken } from '../lib/auth'

const S = {
  bg: '#1a1816', gold: '#c8a882', text: '#e8e4dc',
  muted: 'rgba(232,228,220,0.55)',
  inputBg: 'rgba(232,228,220,0.04)', inputBorder: 'rgba(232,228,220,0.12)',
  inputFocus: 'rgba(200,168,130,0.4)',
  josefin: "'Josefin Sans', sans-serif", zen: "'Zen Kaku Gothic New', sans-serif",
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/studio/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        setError('メールアドレスまたはパスワードが正しくありません')
        return
      }
      const { token } = await res.json() as { token: string }
      setToken(token)
      navigate('/home')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: S.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px 40px', overflowY: 'auto' }}>

        <div style={{ padding: '48px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <OrbitSVG />
          <div style={{ textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 22, letterSpacing: '0.22em', color: S.text }}>CYGNUS</div>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 22, letterSpacing: '0.22em', color: S.gold }}>STUDIO</div>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 19, fontWeight: 300, color: S.text, marginBottom: 6, fontFamily: S.zen }}>
            あなたの技術を、記録する場所。
          </div>
          <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7, letterSpacing: '0.05em', fontFamily: S.josefin, fontWeight: 100 }}>
            Your craft belongs to you.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="メールアドレス" type="email" value={email} onChange={setEmail} placeholder="hello@stylist.com" autoComplete="email" />
          <Field label="パスワード" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password"
            extra={<Link to="/forgot-password" style={{ fontSize: 11, color: S.gold, textDecoration: 'none', display: 'block', textAlign: 'right', opacity: 0.8, fontFamily: S.zen }}>パスワードを忘れた場合</Link>}
          />

          {error && (
            <div style={{ fontSize: 12, color: '#e07060', background: 'rgba(224,112,96,0.1)', border: '1px solid rgba(224,112,96,0.2)', borderRadius: 2, padding: '10px 14px' }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 15, background: S.gold, border: 'none', borderRadius: 2,
            fontFamily: S.josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.25em',
            textTransform: 'uppercase', color: '#1a1816', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginTop: 6, WebkitAppearance: 'none',
          }}>
            {loading ? '...' : 'ログイン'}
          </button>
        </form>

        <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.7, fontFamily: S.zen }}>
            はじめての方は{' '}
            <Link to="/register" style={{ color: S.gold, textDecoration: 'none' }}>アカウントを作成</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, autoComplete, extra }: {
  label: string; type: string; value: string; onChange: (v: string) => void
  placeholder: string; autoComplete: string; extra?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, fontWeight: 100 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        required autoCapitalize="none" autoCorrect="off" autoComplete={autoComplete}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background: S.inputBg, border: `1px solid ${focused ? S.inputFocus : S.inputBorder}`,
          borderRadius: 2, padding: '13px 14px', fontSize: 16, color: S.text,
          fontFamily: S.zen, fontWeight: 300, outline: 'none', WebkitAppearance: 'none', width: '100%',
        }}
      />
      {extra}
    </div>
  )
}

function OrbitSVG() {
  return (
    <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes lCW{from{transform:rotate(0deg);transform-origin:40px 40px}to{transform:rotate(360deg);transform-origin:40px 40px}}
        @keyframes lCCW{from{transform:rotate(0deg);transform-origin:40px 40px}to{transform:rotate(-360deg);transform-origin:40px 40px}}
        .lo1{animation:lCW 28s linear infinite;transform-origin:40px 40px}
        .lo2{animation:lCCW 28s linear infinite;transform-origin:40px 40px}
      `}</style>
      <ellipse className="lo1" cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.9"/>
      <ellipse className="lo2" cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}
