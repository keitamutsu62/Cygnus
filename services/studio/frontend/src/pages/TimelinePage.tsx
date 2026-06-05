import { useState, useEffect } from 'react'
import { apiFetch, api } from '../lib/api'
import { getClaims } from '../lib/auth'
import BottomSheet, { useBottomSheetDismiss } from '../components/BottomSheet'

const S = {
  gold: '#c8a882', text: '#e8e4dc', muted: 'rgba(232,228,220,0.5)',
  border: 'rgba(232,228,220,0.08)', surface: '#211f1d', surface2: '#272422',
  goldBorder: 'rgba(200,168,130,0.2)', goldDim: 'rgba(200,168,130,0.1)',
  josefin: "'Josefin Sans', sans-serif", zen: "'Zen Kaku Gothic New', sans-serif",
  green: 'rgba(109,186,142,0.7)', greenBg: 'rgba(109,186,142,0.08)', greenBorder: 'rgba(109,186,142,0.2)',
}

type Career = {
  id: number
  salon_name: string
  role: string
  start_year: number
  start_month: number
  end_year: number | null
  end_month: number | null
  is_current: boolean
}

type LoopMembership = {
  salon_name: string
  role: string
  is_active: boolean
  joined_at: string
  left_at: string | null
}

export default function TimelinePage() {
  const claims = getClaims()
  const displayName = claims?.display_name ?? ''

  const [careers, setCareers] = useState<Career[]>([])
  const [memberships, setMemberships] = useState<LoopMembership[]>([])
  const [totalTreatments, setTotalTreatments] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Career | null>(null)

  async function fetchCareers() {
    const data = await apiFetch<Career[] | null>('/api/v1/studio/careers').catch(() => null)
    setCareers(data ?? [])
  }

  async function fetchMemberships() {
    const data = await apiFetch<LoopMembership[] | null>('/api/v1/studio/memberships').catch(() => null)
    setMemberships(data ?? [])
  }

  useEffect(() => {
    fetchCareers()
    fetchMemberships()
    apiFetch<{ count: number }>('/api/v1/studio/treatments/count')
      .then(d => setTotalTreatments(d?.count ?? null))
      .catch(() => {})
  }, [])

  const allYears = [
    ...careers.map(c => c.start_year),
    ...memberships.map(m => Number(m.joined_at.slice(0, 4))),
  ]
  const minYear = allYears.length > 0 ? Math.min(...allYears) : new Date().getFullYear()
  const yearsExp = new Date().getFullYear() - minYear + 1
  const totalStores = careers.length + memberships.length

  function careerPeriodLabel(c: Career) {
    const end = c.is_current ? '現在' : (c.end_year && c.end_month ? `${c.end_year}年${c.end_month}月` : '—')
    return `${c.start_year}年${c.start_month}月 — ${end}`
  }

  function membershipPeriodLabel(m: LoopMembership) {
    const start = m.joined_at.replace(/-/g, '/').slice(0, 7).replace('/', '年').replace('/', '月')
    const end = m.is_active ? '現在' : (m.left_at ? m.left_at.replace(/-/g, '/').slice(0, 7).replace('/', '年').replace('/', '月') : '—')
    return `${start} — ${end}`
  }

  function roleLabel(role: string) {
    switch (role) {
      case 'owner': return 'オーナー'
      case 'admin': return 'マネージャー'
      default: return 'スタッフ'
    }
  }

  const hasAny = careers.length > 0 || memberships.length > 0

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ padding: '24px 20px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          {displayName && <div style={{ fontSize: 18, fontWeight: 400, color: S.text, fontFamily: S.zen, marginBottom: 4 }}>{displayName}</div>}
          {hasAny && (
            <div style={{ fontSize: 11, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.1em' }}>
              美容師歴 {yearsExp}年
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: 32, height: 32, borderRadius: '50%', border: `1px solid ${S.border}`,
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: 0.7, flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="7" y1="2" x2="7" y2="12" stroke={S.gold} strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="2" y1="7" x2="12" y2="7" stroke={S.gold} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* 累計サマリ */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold, fontFamily: S.josefin }}>Cumulative</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(109,186,142,0.08)', border: '1px solid rgba(109,186,142,0.2)', borderRadius: 2, fontSize: 9, color: 'rgba(109,186,142,0.7)', fontFamily: S.josefin, letterSpacing: '0.1em' }}>LOOP 連携予定</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 2, padding: 16 }}>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 6, fontFamily: S.josefin, letterSpacing: '0.1em' }}>累計施術</div>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 26, color: S.text }}>
              {totalTreatments !== null ? totalTreatments.toLocaleString('ja-JP') : '—'}
              <span style={{ fontSize: 13, color: S.muted, marginLeft: 2 }}>件</span>
            </div>
          </div>
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 2, padding: 16 }}>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 6, fontFamily: S.josefin, letterSpacing: '0.1em' }}>在籍店舗</div>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 26, color: S.text }}>
              {totalStores > 0 ? totalStores : '—'}
              <span style={{ fontSize: 13, color: S.muted, marginLeft: 2 }}>店</span>
            </div>
          </div>
        </div>
      </div>

      {/* LOOP連携キャリア */}
      {memberships.length > 0 && (
        <div style={{ padding: '8px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold, fontFamily: S.josefin }}>LOOP</div>
            <div style={{ padding: '2px 6px', background: S.greenBg, border: `1px solid ${S.greenBorder}`, borderRadius: 2, fontSize: 8, color: S.green, fontFamily: S.josefin, letterSpacing: '0.1em' }}>自動連携</div>
          </div>
          {memberships.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '0 20px 24px', position: 'relative' }}>
              {i < memberships.length - 1 && (
                <div style={{ position: 'absolute', left: 23, top: 8, bottom: -8, width: 1, background: S.greenBorder }} />
              )}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                border: `1px solid ${S.green}`, background: m.is_active ? S.green : '#1a1816',
                flexShrink: 0, marginTop: 4,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', color: S.muted, fontFamily: S.josefin, marginBottom: 4 }}>
                  {membershipPeriodLabel(m)}
                </div>
                <div style={{ fontSize: 14, color: S.text, fontFamily: S.zen, marginBottom: 6 }}>{m.salon_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 11, color: S.green, fontFamily: S.zen }}>{roleLabel(m.role)}</div>
                  {m.is_active && totalTreatments !== null && (
                    <div style={{ padding: '2px 8px', background: S.greenBg, border: `1px solid ${S.greenBorder}`, borderRadius: 2, fontSize: 9, color: S.green, fontFamily: S.josefin, letterSpacing: '0.08em' }}>
                      施術 {totalTreatments.toLocaleString('ja-JP')} 件
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 手動キャリア */}
      <div style={{ padding: memberships.length > 0 ? '0' : '8px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold, fontFamily: S.josefin }}>Career</div>
          <div style={{ fontSize: 9, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.08em' }}>手動入力</div>
        </div>

        {careers.length === 0 ? (
          <div style={{ padding: '0 20px 20px', textAlign: 'center', color: S.muted, fontSize: 12, fontFamily: S.zen }}>
            右上の ＋ からキャリアを追加してみましょう
          </div>
        ) : (
          careers.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setEditing(c)}
              style={{ display: 'flex', gap: 16, padding: '0 20px 24px', position: 'relative', cursor: 'pointer' }}
            >
              {i < careers.length - 1 && (
                <div style={{ position: 'absolute', left: 23, top: 8, bottom: -8, width: 1, background: S.border }} />
              )}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                border: `1px solid ${S.gold}`, background: c.is_current ? S.gold : '#1a1816',
                flexShrink: 0, marginTop: 4,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', color: S.muted, fontFamily: S.josefin, marginBottom: 4 }}>
                  {careerPeriodLabel(c)}
                </div>
                <div style={{ fontSize: 14, color: S.text, fontFamily: S.zen, marginBottom: 3 }}>{c.salon_name}</div>
                <div style={{ fontSize: 11, color: S.gold, fontFamily: S.zen }}>{c.role}</div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.35 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9.5 2L12 4.5L5 11.5L2 12L2.5 9L9.5 2Z" stroke={S.gold} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <BottomSheet onClose={() => setShowAdd(false)} maxHeight="95vh">
          <CareerForm
            onSaved={async () => { await fetchCareers(); setShowAdd(false) }}
          />
        </BottomSheet>
      )}

      {editing && (
        <BottomSheet onClose={() => setEditing(null)} maxHeight="95vh">
          <CareerForm
            initial={editing}
            onSaved={async () => { await fetchCareers(); setEditing(null) }}
            onDeleted={async () => { await fetchCareers(); setEditing(null) }}
          />
        </BottomSheet>
      )}
    </div>
  )
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function CareerForm({ initial, onSaved, onDeleted }: {
  initial?: Career
  onSaved: () => Promise<void>
  onDeleted?: () => Promise<void>
}) {
  const dismiss = useBottomSheetDismiss()
  const isEdit = !!initial

  const [salonName, setSalonName] = useState(initial?.salon_name ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [startYear, setStartYear] = useState(initial?.start_year ?? CURRENT_YEAR)
  const [startMonth, setStartMonth] = useState(initial?.start_month ?? 1)
  const [endYear, setEndYear] = useState(initial?.end_year ?? CURRENT_YEAR)
  const [endMonth, setEndMonth] = useState(initial?.end_month ?? 1)
  const [isCurrent, setIsCurrent] = useState(initial?.is_current ?? false)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!salonName.trim() || !role.trim()) return
    setLoading(true)
    try {
      const body = {
        salon_name: salonName.trim(),
        role: role.trim(),
        start_year: startYear,
        start_month: startMonth,
        end_year: isCurrent ? null : endYear,
        end_month: isCurrent ? null : endMonth,
        is_current: isCurrent,
      }
      if (isEdit) {
        await api(`/api/v1/studio/careers/${initial!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api('/api/v1/studio/careers', { method: 'POST', body: JSON.stringify(body) })
      }
      await onSaved()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!initial) return
    setLoading(true)
    try {
      await api(`/api/v1/studio/careers/${initial.id}`, { method: 'DELETE' })
      await onDeleted?.()
    } finally {
      setLoading(false)
    }
  }

  const selectStyle: React.CSSProperties = {
    flex: 1, background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 2,
    padding: '13px 14px', color: S.text, fontSize: 14, fontFamily: S.zen, outline: 'none',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: S.surface2, border: `1px solid ${S.border}`,
    borderRadius: 2, padding: '13px 14px', color: S.text, fontSize: 14,
    fontFamily: S.zen, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
    color: S.muted, fontFamily: S.josefin, marginBottom: 8, display: 'block',
  }

  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold, marginBottom: 20, fontFamily: S.josefin }}>
        {isEdit ? 'キャリアを編集' : 'キャリアを追加'}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>店舗名</label>
        <input value={salonName} onChange={e => setSalonName(e.target.value)} placeholder="サロン名を入力" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>役職</label>
        <input value={role} onChange={e => setRole(e.target.value)} placeholder="スタイリスト、アシスタント など" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>在籍開始</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={startYear} onChange={e => setStartYear(Number(e.target.value))} style={selectStyle}>
            {YEARS.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} style={{ ...selectStyle, flex: 'none', width: 90 }}>
            {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
          </select>
        </div>
      </div>

      {!isCurrent && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>在籍終了</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={endYear} onChange={e => setEndYear(Number(e.target.value))} style={selectStyle}>
              {YEARS.map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} style={{ ...selectStyle, flex: 'none', width: 90 }}>
              {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
            </select>
          </div>
        </div>
      )}

      <div
        onClick={() => setIsCurrent(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, cursor: 'pointer' }}
      >
        <div style={{
          width: 18, height: 18, border: `1px solid ${isCurrent ? S.gold : S.border}`,
          borderRadius: 2, background: isCurrent ? S.gold : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {isCurrent && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#1a1816" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <span style={{ fontSize: 12, color: S.muted, fontFamily: S.zen }}>現在在籍中</span>
      </div>

      <button onClick={handleSave} disabled={loading || !salonName.trim() || !role.trim()} style={{
        width: '100%', padding: 15, background: S.gold, border: 'none', borderRadius: 2,
        fontFamily: S.josefin, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: '#1a1816', cursor: 'pointer', opacity: (loading || !salonName.trim() || !role.trim()) ? 0.5 : 1,
        marginBottom: 8,
      }}>{isEdit ? '更新する' : '追加する'}</button>

      {isEdit && (
        <button onClick={handleDelete} disabled={loading} style={{
          width: '100%', padding: 13, background: 'transparent',
          border: '1px solid rgba(220,80,80,0.3)', borderRadius: 2,
          color: 'rgba(220,80,80,0.7)', fontSize: 11, letterSpacing: '0.12em',
          cursor: 'pointer', fontFamily: S.josefin, marginBottom: 8,
        }}>このキャリアを削除</button>
      )}

      <button onClick={dismiss} style={{
        width: '100%', padding: 13, background: 'transparent', border: `1px solid ${S.border}`,
        borderRadius: 2, color: S.muted, fontSize: 11, letterSpacing: '0.12em',
        cursor: 'pointer', fontFamily: S.josefin,
      }}>キャンセル</button>
    </>
  )
}
