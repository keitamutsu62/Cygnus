import { useEffect, useState } from 'react'
import { adminFetch, adminApi } from '../lib/api'

const gold    = '#c8a882'
const muted   = 'rgba(232,228,220,0.55)'
const border  = 'rgba(232,228,220,0.08)'
const green   = '#6dba8e'
const amber   = '#c8a056'
const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"

function fmt(n: number) { return n.toLocaleString('ja-JP') }

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86400000)
}

type Salon = {
  id: number
  name: string
  is_internal: boolean
  plan_name: string | null
  staff_count: number
  mrr: number
  sub_status: string | null
  sub_created_at: string | null
}

export default function SalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<Set<number>>(new Set())

  useEffect(() => {
    adminFetch<Salon[]>('/admin/v1/salons')
      .then(setSalons)
      .finally(() => setLoading(false))
  }, [])

  async function toggle(salon: Salon) {
    setToggling(prev => new Set(prev).add(salon.id))
    try {
      const res = await adminApi(`/admin/v1/salons/${salon.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_internal: !salon.is_internal }),
      })
      if (!res.ok) throw new Error()
      setSalons(prev => prev.map(s => s.id === salon.id ? { ...s, is_internal: !s.is_internal } : s))
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(salon.id); return s })
    }
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.15em' }}>SALON MANAGEMENT</div>
        <div style={{ fontSize: 20, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.2em', color: gold, marginTop: 4 }}>サロン管理</div>
      </div>

      {loading ? (
        <div style={{ color: muted, fontFamily: zen, fontSize: 14 }}>読み込み中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {salons.map(salon => {
            const days = daysSince(salon.sub_created_at)
            const isFree = salon.is_internal
            const busy = toggling.has(salon.id)
            return (
              <div key={salon.id} style={{
                background: '#211f1d',
                border: `1px solid ${isFree ? border : 'rgba(200,168,130,0.2)'}`,
                borderRadius: 8,
                padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, color: '#e8e4dc', fontFamily: zen, marginBottom: 4 }}>{salon.name}</div>
                    <div style={{ fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.1em' }}>
                      {salon.plan_name ?? '—'} · {salon.staff_count}名
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontFamily: josefin, letterSpacing: '0.12em',
                    padding: '3px 10px', borderRadius: 2,
                    background: isFree ? 'rgba(200,160,86,0.1)' : 'rgba(109,186,142,0.1)',
                    border: `1px solid ${isFree ? 'rgba(200,160,86,0.3)' : 'rgba(109,186,142,0.3)'}`,
                    color: isFree ? amber : green,
                  }}>
                    {isFree ? '無料利用中' : '契約中'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: muted, fontFamily: josefin, marginBottom: 3 }}>契約開始</div>
                    <div style={{ fontSize: 13, color: '#e8e4dc', fontFamily: josefin }}>
                      {salon.sub_created_at ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: muted, fontFamily: josefin, marginBottom: 3 }}>経過日数</div>
                    <div style={{ fontSize: 13, color: '#e8e4dc', fontFamily: josefin }}>
                      {days !== null ? `${days}日` : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: muted, fontFamily: josefin, marginBottom: 3 }}>MRR</div>
                    <div style={{ fontSize: 13, color: isFree ? muted : gold, fontFamily: josefin }}>
                      {isFree ? '—' : `¥${fmt(salon.mrr)}`}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggle(salon)}
                  disabled={busy}
                  style={{
                    width: '100%', padding: '9px 0',
                    background: 'transparent',
                    border: `1px solid ${isFree ? 'rgba(109,186,142,0.4)' : 'rgba(200,160,86,0.4)'}`,
                    borderRadius: 2,
                    fontSize: 12, fontFamily: josefin, letterSpacing: '0.12em',
                    color: isFree ? green : amber,
                    cursor: busy ? 'default' : 'pointer',
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  {busy ? '更新中...' : isFree ? '契約サロンに変更する' : '無料利用中に変更する'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
