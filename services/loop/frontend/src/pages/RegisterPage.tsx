import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    salonName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
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
          salon_name: form.salonName,
          owner_name: form.ownerName,
          owner_email: form.ownerEmail,
          owner_password: form.ownerPassword,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message === 'email already in use'
          ? 'このメールアドレスはすでに登録されています'
          : '登録に失敗しました')
        return
      }
      navigate('/login')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { name: 'salonName',        label: 'Salon Name',      type: 'text',     placeholder: 'Hair Studio LUNA' },
    { name: 'ownerName',        label: 'Your Name',       type: 'text',     placeholder: '田中 彩花' },
    { name: 'ownerEmail',       label: 'Email',           type: 'email',    placeholder: 'hello@salon.com' },
    { name: 'ownerPassword',    label: 'Password',        type: 'password', placeholder: '••••••••' },
    { name: 'confirmPassword',  label: 'Confirm Password',type: 'password', placeholder: '••••••••' },
  ] as const

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
         style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%)' }}>

      {/* ロゴ */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl tracking-[0.25em] uppercase mb-1"
            style={{ fontFamily: 'Josefin Sans', fontWeight: 300, color: '#c8a882' }}>
          CYGNUS
        </h1>
        <p className="text-xs tracking-[0.3em] uppercase"
           style={{ color: '#888', fontFamily: 'Josefin Sans' }}>
          LOOP
        </p>
      </div>

      {/* カード */}
      <div className="w-full max-w-sm rounded-2xl p-8"
           style={{ background: '#141414', border: '1px solid #2a2a2a' }}>

        <h2 className="text-lg font-light mb-1" style={{ color: '#e8e4dc' }}>
          サロン登録
        </h2>
        <p className="text-sm mb-8" style={{ color: '#888' }}>
          無料でアカウントを作成
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map(f => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label className="text-xs tracking-widest uppercase"
                     style={{ color: '#888', fontFamily: 'Josefin Sans' }}>
                {f.label}
              </label>
              <input
                type={f.type}
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  color: '#e8e4dc',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#c8a882'}
                onBlur={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              />
            </div>
          ))}

          {error && (
            <p className="text-xs text-center py-2 px-3 rounded-lg"
               style={{ color: '#e88', background: 'rgba(255,80,80,0.08)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm tracking-widest uppercase mt-2 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #c8a882, #a8845e)',
              color: '#0a0a0a',
              fontFamily: 'Josefin Sans',
              fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
          <span className="text-xs" style={{ color: '#555' }}>or</span>
          <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
        </div>

        <p className="text-center text-xs" style={{ color: '#888' }}>
          すでにアカウントをお持ちの方は{' '}
          <Link to="/login" style={{ color: '#c8a882' }}>ログイン</Link>
        </p>
      </div>
    </div>
  )
}
