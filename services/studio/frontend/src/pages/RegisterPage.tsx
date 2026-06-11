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

export default function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('パスワードは8文字以上で入力してください'); return }
    setLoading(true)
    const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
    try {
      const res = await fetch(`${base}/api/v1/auth/studio/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name, email, password }),
      })
      if (res.status === 409) { setError('このメールアドレスはすでに登録されています'); return }
      if (!res.ok) { setError('登録に失敗しました'); return }

      // 登録後そのままログイン
      const loginRes = await fetch(`${base}/api/v1/auth/studio/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const { token } = await loginRes.json() as { token: string }
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
          <div style={{ fontSize: 19, fontWeight: 300, color: S.text, marginBottom: 6, fontFamily: S.zen }}>アカウントを作成</div>
          <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7, fontFamily: S.zen }}>あなたの技術と作品を記録する場所。</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="お名前" type="text" value={name} onChange={setName} placeholder="高橋 美咲" autoComplete="name" />
          <Field label="メールアドレス" type="email" value={email} onChange={setEmail} placeholder="hello@stylist.com" autoComplete="email" />
          <Field label="パスワード" type="password" value={password} onChange={setPassword} placeholder="8文字以上" autoComplete="new-password" />

          {error && (
            <div style={{ fontSize: 12, color: '#e07060', background: 'rgba(224,112,96,0.1)', border: '1px solid rgba(224,112,96,0.2)', borderRadius: 2, padding: '10px 14px' }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 15, background: S.gold, border: 'none', borderRadius: 2,
            fontFamily: S.josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.25em',
            textTransform: 'uppercase', color: '#1a1816', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginTop: 6, WebkitAppearance: 'none',
          }}>
            {loading ? '...' : 'アカウントを作成'}
          </button>
        </form>

        <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: S.muted, fontFamily: S.zen }}>
            すでにアカウントをお持ちの方は{' '}
            <Link to="/login" style={{ color: S.gold, textDecoration: 'none' }}>ログイン</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, autoComplete }: {
  label: string; type: string; value: string; onChange: (v: string) => void
  placeholder: string; autoComplete: string
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
    </div>
  )
}

function OrbitSVG() {
  return (
    <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes rCW{from{transform:rotate(0deg);transform-origin:40px 40px}to{transform:rotate(360deg);transform-origin:40px 40px}}
        @keyframes rCCW{from{transform:rotate(0deg);transform-origin:40px 40px}to{transform:rotate(-360deg);transform-origin:40px 40px}}
        .ro1{animation:rCW 28s linear infinite;transform-origin:40px 40px}
        .ro2{animation:rCCW 28s linear infinite;transform-origin:40px 40px}
      `}</style>
      <ellipse className="ro1" cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.9"/>
      <ellipse className="ro2" cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}
