import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

type Store = { id: number; name: string }

export default function AcceptInvitationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [salonName, setSalonName] = useState('')
  const [stores, setStores]       = useState<Store[]>([])
  const [name, setName]           = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [storeId, setStoreId]     = useState<number | null>(null)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [infoLoading, setInfoLoading] = useState(true)

  useEffect(() => {
    if (!token) { setInfoLoading(false); return }
    fetch(`/api/v1/auth/invite-info?token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setSalonName(data.salon_name ?? '')
        setStores(data.stores ?? [])
        if ((data.stores ?? []).length === 1) setStoreId(data.stores[0].id)
      })
      .catch(() => setError('招待リンクが無効または期限切れです'))
      .finally(() => setInfoLoading(false))
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('パスワードが一致しません'); return }
    if (!token) { setError('招待リンクが無効です'); return }
    if (stores.length > 0 && storeId === null) { setError('所属店舗を選択してください'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password, store_id: storeId }),
      })
      if (!res.ok) { setError('招待リンクが無効または期限切れです'); return }
      navigate('/login')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const josefin = "'Josefin Sans', sans-serif"
  const zen     = "'Zen Kaku Gothic New', sans-serif"
  const gold    = '#c8a882'
  const text    = '#e8e4dc'
  const muted   = 'rgba(232,228,220,0.55)'
  const border  = 'rgba(232,228,220,0.12)'

  return (
    <div style={{ minHeight: '100dvh', background: '#1a1816', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px 40px', overflowY: 'auto' }}>

        {/* ロゴエリア */}
        <div style={{ padding: '48px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <OrbitSVG />
          <div style={{ textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 22, letterSpacing: '0.22em', color: text }}>CYGNUS</div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 22, letterSpacing: '0.22em', color: gold }}>LOOP</div>
          </div>
        </div>

        {/* ヘッドライン */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 19, fontWeight: 300, color: text, marginBottom: 6, fontFamily: zen }}>チームへようこそ。</div>
          {salonName && (
            <div style={{ fontSize: 14, color: gold, fontFamily: zen, marginBottom: 4 }}>{salonName}</div>
          )}
          <div style={{ fontSize: 14, color: muted, lineHeight: 1.7, letterSpacing: '0.05em', fontFamily: josefin, fontWeight: 100 }}>
            名前とパスワードを設定してください。
          </div>
        </div>

        {infoLoading ? (
          <div style={{ color: muted, fontFamily: zen, fontSize: 14, textAlign: 'center' }}>読み込み中...</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FieldInput label="氏名" type="text" value={name} onChange={setName} placeholder="田中 健太" />
            <FieldInput label="パスワード" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            <FieldInput label="パスワード（確認）" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />

            {/* 店舗選択 */}
            {stores.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: muted, fontFamily: josefin, fontWeight: 100 }}>所属店舗</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stores.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStoreId(s.id)}
                      style={{
                        padding: '13px 14px',
                        background: storeId === s.id ? 'rgba(200,168,130,0.12)' : 'rgba(232,228,220,0.04)',
                        border: `1px solid ${storeId === s.id ? 'rgba(200,168,130,0.5)' : border}`,
                        borderRadius: 2,
                        fontSize: 15,
                        color: storeId === s.id ? gold : text,
                        fontFamily: zen,
                        fontWeight: 300,
                        cursor: 'pointer',
                        textAlign: 'left',
                        WebkitAppearance: 'none',
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{ fontSize: 14, color: '#e07060', background: 'rgba(224,112,96,0.1)', border: '1px solid rgba(224,112,96,0.2)', borderRadius: 2, padding: '10px 14px', fontFamily: zen }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: 15, background: gold, border: 'none', borderRadius: 2, fontFamily: josefin, fontWeight: 200, fontSize: 14, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#1a1816', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 6, WebkitAppearance: 'none' }}
            >
              {loading ? '...' : 'チームに参加する'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.7, fontFamily: zen }}>招待に心当たりがない場合は無視してください</div>
        </div>
      </div>
    </div>
  )
}

function FieldInput({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(232,228,220,0.55)', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 100 }}>{label}</div>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ background: 'rgba(232,228,220,0.04)', border: `1px solid ${focused ? 'rgba(200,168,130,0.4)' : 'rgba(232,228,220,0.12)'}`, borderRadius: 2, padding: '13px 14px', fontSize: 16, color: '#e8e4dc', fontFamily: "'Zen Kaku Gothic New', sans-serif", fontWeight: 300, outline: 'none', WebkitAppearance: 'none', width: '100%' }}
      />
    </div>
  )
}

function OrbitSVG() {
  return (
    <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes aiCW  { from { transform: rotate(0deg);    } to { transform: rotate(360deg);  } }
        @keyframes aiCCW { from { transform: rotate(0deg);    } to { transform: rotate(-360deg); } }
        .ai1 { animation: aiCW  28s linear infinite; transform-origin: 40px 40px; }
        .ai2 { animation: aiCCW 28s linear infinite; transform-origin: 40px 40px; }
      `}</style>
      <ellipse className="ai1" cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.9"/>
      <ellipse className="ai2" cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke="#c8a882" strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}
