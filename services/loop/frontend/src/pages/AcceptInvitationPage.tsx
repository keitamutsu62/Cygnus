import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AcceptInvitationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (!token) {
      setError('招待リンクが無効です')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      })
      if (!res.ok) {
        setError('招待リンクが無効または期限切れです')
        return
      }
      navigate('/login')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
         style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%)' }}>

      <div className="mb-12 text-center">
        <h1 className="text-3xl tracking-[0.25em] uppercase mb-1"
            style={{ fontFamily: 'Josefin Sans', fontWeight: 300, color: '#c8a882' }}>
          CYGNUS
        </h1>
        <p className="text-xs tracking-[0.3em] uppercase"
           style={{ color: '#888', fontFamily: 'Josefin Sans' }}>
          LOOP
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-8"
           style={{ background: '#141414', border: '1px solid #2a2a2a' }}>

        <h2 className="text-lg font-light mb-1" style={{ color: '#e8e4dc' }}>
          招待を承諾
        </h2>
        <p className="text-sm mb-8" style={{ color: '#888' }}>
          名前とパスワードを設定してください
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: 'Your Name', value: name, onChange: setName, type: 'text', placeholder: '田中 健太' },
            { label: 'Password', value: password, onChange: setPassword, type: 'password', placeholder: '••••••••' },
            { label: 'Confirm Password', value: confirm, onChange: setConfirm, type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-1.5">
              <label className="text-xs tracking-widest uppercase"
                     style={{ color: '#888', fontFamily: 'Josefin Sans' }}>
                {f.label}
              </label>
              <input
                type={f.type}
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                placeholder={f.placeholder}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8e4dc' }}
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
            className="w-full py-3.5 rounded-xl text-sm tracking-widest uppercase mt-2"
            style={{
              background: 'linear-gradient(135deg, #c8a882, #a8845e)',
              color: '#0a0a0a',
              fontFamily: 'Josefin Sans',
              fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : 'Join Team'}
          </button>
        </form>
      </div>
    </div>
  )
}
