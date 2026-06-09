import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken } from '../lib/api'

const gold   = '#c8a882'
const muted  = 'rgba(232,228,220,0.55)'
const border = 'rgba(232,228,220,0.1)'
const alert  = '#e07060'
const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
      const res = await fetch(`${base}/admin/v1/stats`, {
        headers: { Authorization: `Bearer ${password}` },
      })
      if (res.status === 401) {
        setError('パスワードが違います')
        return
      }
      if (!res.ok) throw new Error()
      setToken(password)
      navigate('/')
    } catch {
      setError('接続エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 80 80" fill="none" style={{ marginBottom: 12 }}>
          <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)" stroke={gold} strokeWidth="4" opacity="0.9"/>
          <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="4" opacity="0.5"/>
        </svg>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 18, letterSpacing: '0.3em', color: '#e8e4dc' }}>
          CYGNUS <span style={{ color: gold }}>ADMIN</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: '#211f1d',
            border: `1px solid ${border}`,
            borderRadius: 6,
            color: '#e8e4dc',
            fontSize: 16,
            fontFamily: zen,
            outline: 'none',
            marginBottom: 12,
          }}
        />
        {error && (
          <div style={{ fontSize: 14, color: alert, marginBottom: 12, fontFamily: zen }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: '100%',
            padding: '14px',
            background: gold,
            border: 'none',
            borderRadius: 6,
            color: '#1a1816',
            fontSize: 15,
            fontFamily: josefin,
            fontWeight: 300,
            letterSpacing: '0.15em',
            cursor: loading || !password ? 'not-allowed' : 'pointer',
            opacity: loading || !password ? 0.5 : 1,
          }}
        >
          {loading ? '...' : 'LOGIN'}
        </button>
      </form>

      <div style={{ marginTop: 24, fontSize: 13, color: muted, fontFamily: zen }}>
        Cygnus 管理者専用
      </div>
    </div>
  )
}
