import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const S = {
  bg:          '#1a1816',
  gold:        '#c8a882',
  text:        '#e8e4dc',
  muted:       'rgba(232,228,220,0.55)',
  border:      'rgba(232,228,220,0.1)',
  inputBg:     'rgba(232,228,220,0.04)',
  inputBorder: 'rgba(232,228,220,0.12)',
  inputFocus:  'rgba(200,168,130,0.4)',
  josefin:     "'Josefin Sans', sans-serif",
  zen:         "'Zen Kaku Gothic New', sans-serif",
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    salonName:       '',
    ownerName:       '',
    ownerEmail:      '',
    ownerPassword:   '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.ownerPassword !== form.confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salon_name:     form.salonName,
          owner_name:     form.ownerName,
          owner_email:    form.ownerEmail,
          owner_password: form.ownerPassword,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message === 'email already in use'
          ? 'このメールアドレスはすでに登録されています'
          : '登録に失敗しました。入力内容をご確認ください')
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

  const fields: { key: keyof typeof form; label: string; type: string; placeholder: string }[] = [
    { key: 'salonName',       label: 'サロン名',          type: 'text',     placeholder: 'Hair Studio LUNA' },
    { key: 'ownerName',       label: 'オーナー氏名',       type: 'text',     placeholder: '田中 彩花' },
    { key: 'ownerEmail',      label: 'メールアドレス',     type: 'email',    placeholder: 'hello@salon.com' },
    { key: 'ownerPassword',   label: 'パスワード',         type: 'password', placeholder: '••••••••' },
    { key: 'confirmPassword', label: 'パスワード（確認）', type: 'password', placeholder: '••••••••' },
  ]

  return (
    <div style={{
      height: '100dvh',
      background: S.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '0 28px 40px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>

        {/* ロゴエリア */}
        <div style={{
          padding: '48px 0 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}>
          <OrbitSVG />
          <div style={{ textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 22, letterSpacing: '0.22em', color: S.text }}>
              CYGNUS
            </div>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 22, letterSpacing: '0.22em', color: S.gold }}>
              LOOP
            </div>
          </div>
        </div>

        {/* ヘッドライン */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 19, fontWeight: 300, color: S.text, marginBottom: 6, fontFamily: S.zen }}>
            サロンアカウントを作成
          </div>
          <div style={{ fontSize: 14, color: S.muted, lineHeight: 1.7, letterSpacing: '0.05em', fontFamily: S.josefin, fontWeight: 100 }}>
            Start your journey with Cygnus LOOP.
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fields.map(f => (
            <FieldInput
              key={f.key}
              label={f.label}
              type={f.type}
              value={form[f.key]}
              onChange={v => handleChange(f.key, v)}
              placeholder={f.placeholder}
            />
          ))}

          {error && (
            <div style={{
              fontSize: 14,
              color: '#e07060',
              background: 'rgba(224,112,96,0.1)',
              border: '1px solid rgba(224,112,96,0.2)',
              borderRadius: 2,
              padding: '10px 14px',
              fontFamily: S.zen,
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
            {loading ? '...' : 'アカウントを作成'}
          </button>
        </form>

        {/* フッター */}
        <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.7, fontFamily: S.zen }}>
            すでにアカウントをお持ちの方は{' '}
            <Link to="/login" style={{ color: S.gold, opacity: 0.8, textDecoration: 'none' }}>
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldInput({
  label, type, value, onChange, placeholder
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{
        fontSize: 12,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'rgba(232,228,220,0.55)',
        fontFamily: "'Josefin Sans', sans-serif",
        fontWeight: 100,
      }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: 'rgba(232,228,220,0.04)',
          border: `1px solid ${focused ? 'rgba(200,168,130,0.4)' : 'rgba(232,228,220,0.12)'}`,
          borderRadius: 2,
          padding: '13px 14px',
          fontSize: 16,
          color: '#e8e4dc',
          fontFamily: "'Zen Kaku Gothic New', sans-serif",
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
        @keyframes rCW  { from { transform: rotate(0deg);    } to { transform: rotate(360deg);  } }
        @keyframes rCCW { from { transform: rotate(0deg);    } to { transform: rotate(-360deg); } }
        .ro1 { animation: rCW  28s linear infinite; transform-origin: 40px 40px; }
        .ro2 { animation: rCCW 28s linear infinite; transform-origin: 40px 40px; }
      `}</style>
      <ellipse className="ro1" cx="40" cy="40" rx="28" ry="14"
        transform="rotate(18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.9"/>
      <ellipse className="ro2" cx="40" cy="40" rx="28" ry="14"
        transform="rotate(-18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}
