import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

const S = {
  bg:          '#1a1816',
  surface:     '#211f1d',
  gold:        '#c8a882',
  goldBorder:  'rgba(200,168,130,0.2)',
  text:        '#e8e4dc',
  muted:       'rgba(232,228,220,0.55)',
  border:      'rgba(232,228,220,0.1)',
  inputBg:     'rgba(232,228,220,0.04)',
  inputBorder: 'rgba(232,228,220,0.12)',
  inputFocus:  'rgba(200,168,130,0.4)',
  josefin:     "'Josefin Sans', sans-serif",
  zen:         "'Zen Kaku Gothic New', sans-serif",
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
      const res = await api('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        setError('メールアドレスまたはパスワードが正しくありません')
        return
      }
      const { token } = await res.json()
      localStorage.setItem('token', token)
      navigate('/dashboard')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: S.bg,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '0 28px 40px',
        overflowY: 'auto',
      }}>

        {/* ロゴエリア */}
        <div style={{
          padding: '48px 0 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}>
          <OrbitSVG />
          <div style={{ textAlign: 'center', lineHeight: 1 }}>
            <div style={{
              fontFamily: S.josefin,
              fontWeight: 100,
              fontSize: 22,
              letterSpacing: '0.22em',
              color: S.text,
            }}>CYGNUS</div>
            <div style={{
              fontFamily: S.josefin,
              fontWeight: 100,
              fontSize: 22,
              letterSpacing: '0.22em',
              color: S.gold,
            }}>LOOP</div>
          </div>
        </div>

        {/* ヘッドライン */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 19,
            fontWeight: 300,
            color: S.text,
            marginBottom: 6,
            whiteSpace: 'nowrap',
            fontFamily: S.zen,
          }}>ようこそ、Cygnus LOOPへ。</div>
          <div style={{
            fontSize: 14,
            color: S.muted,
            lineHeight: 1.7,
            letterSpacing: '0.05em',
            fontFamily: S.josefin,
            fontWeight: 100,
          }}>Focus on what only you can do.</div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field
            label="メールアドレス"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="hello@salon.com"
          />
          <Field
            label="パスワード"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            extra={
              <Link to="/forgot-password" style={{
                fontSize: 13,
                color: S.gold,
                textAlign: 'right',
                textDecoration: 'none',
                display: 'block',
                opacity: 0.8,
                fontFamily: S.zen,
              }}>パスワードを忘れた場合</Link>
            }
          />

          {error && (
            <div style={{
              fontSize: 14,
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
              fontSize: 14,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#1a1816',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 6,
              WebkitAppearance: 'none',
            }}
          >
            {loading ? '...' : 'ログイン'}
          </button>
        </form>

        {/* フッター */}
        <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.7, fontFamily: S.zen }}>
            サロンアカウントをお持ちでない場合は<br />
            <Link to="/register" style={{ color: S.gold, opacity: 0.8, textDecoration: 'none' }}>
              新規サロン登録
            </Link>
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 20 }}>
            <Link to="/terms" style={{ fontSize: 11, color: S.muted, textDecoration: 'none', fontFamily: S.josefin, letterSpacing: '0.1em', opacity: 0.7 }}>
              利用規約
            </Link>
            <Link to="/privacy" style={{ fontSize: 11, color: S.muted, textDecoration: 'none', fontFamily: S.josefin, letterSpacing: '0.1em', opacity: 0.7 }}>
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label, type, value, onChange, placeholder, extra
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  extra?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  const S = {
    inputBg:     'rgba(232,228,220,0.04)',
    inputBorder: 'rgba(232,228,220,0.12)',
    inputFocus:  'rgba(200,168,130,0.4)',
    muted:       'rgba(232,228,220,0.55)',
    text:        '#e8e4dc',
    josefin:     "'Josefin Sans', sans-serif",
    zen:         "'Zen Kaku Gothic New', sans-serif",
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{
        fontSize: 12,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: S.muted,
        fontFamily: S.josefin,
        fontWeight: 100,
      }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete={type === 'email' ? 'email' : type === 'password' ? 'current-password' : 'off'}
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
      {extra}
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
