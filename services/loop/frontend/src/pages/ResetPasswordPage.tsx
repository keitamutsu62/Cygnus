import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const S = {
  bg:          '#1a1816',
  gold:        '#c8a882',
  text:        '#e8e4dc',
  muted:       'rgba(232,228,220,0.55)',
  inputBg:     'rgba(232,228,220,0.04)',
  inputBorder: 'rgba(232,228,220,0.12)',
  inputFocus:  'rgba(200,168,130,0.4)',
  josefin:     "'Josefin Sans', sans-serif",
  zen:         "'Zen Kaku Gothic New', sans-serif",
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (!res.ok) {
        setError('リンクが無効または期限切れです。再度お試しください。')
        return
      }
      setDone(true)
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100dvh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: S.muted, fontFamily: S.zen, fontSize: 14 }}>無効なリンクです</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: S.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px 40px', overflowY: 'auto' }}>

        {/* ロゴ */}
        <div style={{ padding: '48px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <OrbitSVG />
          <div style={{ textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 22, letterSpacing: '0.22em', color: S.text }}>CYGNUS</div>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 22, letterSpacing: '0.22em', color: S.gold }}>LOOP</div>
          </div>
        </div>

        {!done ? (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 19, fontWeight: 300, color: S.text, marginBottom: 6, fontFamily: S.zen }}>
                新しいパスワードを設定
              </div>
              <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7, fontFamily: S.zen }}>
                8文字以上で入力してください。
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <PasswordField
                label="新しいパスワード"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <PasswordField
                label="パスワード（確認）"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
              />

              {error && (
                <div style={{
                  fontSize: 12,
                  color: '#e07060',
                  background: 'rgba(224,112,96,0.1)',
                  border: '1px solid rgba(224,112,96,0.2)',
                  borderRadius: 2,
                  padding: '10px 14px',
                }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 15,
                  background: S.gold,
                  border: 'none',
                  borderRadius: 2,
                  fontFamily: S.josefin,
                  fontWeight: 200,
                  fontSize: 12,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#1a1816',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  marginTop: 6,
                  WebkitAppearance: 'none',
                }}
              >
                {loading ? '...' : 'パスワードを変更'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{
              background: 'rgba(200,168,130,0.08)',
              border: '1px solid rgba(200,168,130,0.2)',
              borderRadius: 4,
              padding: '24px 20px',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 15, fontWeight: 300, color: S.gold, fontFamily: S.zen, marginBottom: 8 }}>
                パスワードを変更しました
              </div>
              <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.8, fontFamily: S.zen }}>
                新しいパスワードでログインしてください。
              </div>
            </div>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: 15,
                background: S.gold,
                border: 'none',
                borderRadius: 2,
                fontFamily: S.josefin,
                fontWeight: 200,
                fontSize: 12,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#1a1816',
                cursor: 'pointer',
                WebkitAppearance: 'none',
              }}
            >
              ログインへ
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function PasswordField({ label, value, onChange, autoComplete }: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: S.muted,
        fontFamily: S.josefin,
        fontWeight: 100,
      }}>{label}</div>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="••••••••"
        required
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: S.inputBg,
          border: `1px solid ${focused ? S.inputFocus : S.inputBorder}`,
          borderRadius: 2,
          padding: '13px 14px',
          fontSize: 16,
          color: S.text,
          fontFamily: S.zen,
          fontWeight: 300,
          outline: 'none',
          WebkitAppearance: 'none',
          width: '100%',
        }}
      />
    </div>
  )
}

function OrbitSVG() {
  return (
    <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes orbitCW  { from { transform: rotate(0deg);   transform-origin: 40px 40px; }
                              to   { transform: rotate(360deg);  transform-origin: 40px 40px; } }
        @keyframes orbitCCW { from { transform: rotate(0deg);   transform-origin: 40px 40px; }
                              to   { transform: rotate(-360deg); transform-origin: 40px 40px; } }
        .o1 { animation: orbitCW  28s linear infinite; transform-origin: 40px 40px; }
        .o2 { animation: orbitCCW 28s linear infinite; transform-origin: 40px 40px; }
      `}</style>
      <ellipse className="o1" cx="40" cy="40" rx="28" ry="14"
        transform="rotate(18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.9"/>
      <ellipse className="o2" cx="40" cy="40" rx="28" ry="14"
        transform="rotate(-18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}
