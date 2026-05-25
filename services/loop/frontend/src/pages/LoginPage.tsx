import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'

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
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
         style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%)' }}>

      {/* ロゴ */}
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

      {/* カード */}
      <div className="w-full max-w-sm rounded-2xl p-8"
           style={{ background: '#141414', border: '1px solid #2a2a2a' }}>

        <h2 className="text-lg font-light mb-1" style={{ color: '#e8e4dc' }}>
          おかえりなさい
        </h2>
        <p className="text-sm mb-8" style={{ color: '#888' }}>
          アカウントにサインイン
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* メール */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase"
                   style={{ color: '#888', fontFamily: 'Josefin Sans' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hello@salon.com"
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

          {/* パスワード */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase"
                   style={{ color: '#888', fontFamily: 'Josefin Sans' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
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

          {/* エラー */}
          {error && (
            <p className="text-xs text-center py-2 px-3 rounded-lg"
               style={{ color: '#e88', background: 'rgba(255,80,80,0.08)' }}>
              {error}
            </p>
          )}

          {/* ログインボタン */}
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
            {loading ? '...' : 'Sign In'}
          </button>
        </form>

        {/* 区切り */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
          <span className="text-xs" style={{ color: '#555' }}>or</span>
          <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
        </div>

        {/* 登録リンク */}
        <p className="text-center text-xs" style={{ color: '#888' }}>
          アカウントをお持ちでない方は{' '}
          <Link to="/register"
                className="transition-colors"
                style={{ color: '#c8a882' }}>
            新規登録
          </Link>
        </p>
      </div>

      {/* フッター */}
      <p className="mt-8 text-xs" style={{ color: '#555' }}>
        © 2026 Cygnus. All rights reserved.
      </p>
    </div>
  )
}
