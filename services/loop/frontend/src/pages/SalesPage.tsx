import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { apiFetch } from '../lib/api'
import { getClaims } from '../lib/auth'
import type { DailySales, StaffDailySales, Store } from '../types'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const muted   = 'rgba(232,228,220,0.55)'
const border  = 'rgba(232,228,220,0.08)'
const gold    = '#c8a882'

function monthBounds(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const from = `${ym}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${ym}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function fmt(n: number) {
  return n.toLocaleString('ja-JP')
}

function KpiCard({ label, value, unit = '円' }: { label: string; value: number; unit?: string }) {
  return (
    <div style={{
      flex: 1,
      background: '#211f1d',
      borderRadius: 2,
      border: `1px solid ${border}`,
      padding: '14px 12px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 20, fontFamily: josefin, fontWeight: 100, color: '#e8e4dc', lineHeight: 1 }}>{fmt(value)}</span>
        <span style={{ fontSize: 10, color: muted, fontFamily: josefin }}>{unit}</span>
      </div>
    </div>
  )
}

function DailyRow({ date, total, clients, label }: { date: string; total: number; clients: number; label?: string }) {
  const d = date.slice(5)
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: `1px solid ${border}`,
    }}>
      <div style={{ width: 48, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontFamily: josefin, fontWeight: 100, color: muted }}>{d}</span>
      </div>
      {label && (
        <div style={{ flex: 1, fontSize: 11, color: muted, fontFamily: zen }}>{label}</div>
      )}
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontFamily: josefin, fontWeight: 100, color: '#e8e4dc' }}>{fmt(total)}円</div>
        <div style={{ fontSize: 10, color: muted, fontFamily: josefin }}>{clients}客</div>
      </div>
    </div>
  )
}

// ─── 店舗タブ ──────────────────────────────────────────────────────────────
function StoreTab({ ym }: { ym: string }) {
  const [stores, setStores]     = useState<Store[]>([])
  const [storeId, setStoreId]   = useState<number | null>(null)
  const [sales, setSales]       = useState<DailySales[]>([])
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    apiFetch<Store[]>('/api/v1/stores').then(data => {
      setStores(data)
      if (data.length > 0 && storeId === null) setStoreId(data[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!storeId) return
    setLoading(true)
    const { from, to } = monthBounds(ym)
    apiFetch<DailySales[]>(`/api/v1/sales/store?store_id=${storeId}&from=${from}&to=${to}`)
      .then(data => setSales(Array.isArray(data) ? data : []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false))
  }, [storeId, ym])

  const total       = sales.reduce((s, d) => s + d.total_sales,  0)
  const techTotal   = sales.reduce((s, d) => s + d.tech_sales,   0)
  const retailTotal = sales.reduce((s, d) => s + d.retail_sales, 0)
  const clients     = sales.reduce((s, d) => s + d.client_count, 0)

  return (
    <div style={{ padding: '0 20px 24px' }}>
      {/* 店舗セレクタ */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={storeId ?? ''}
          onChange={e => setStoreId(Number(e.target.value))}
          style={{
            background: '#211f1d',
            border: `1px solid rgba(232,228,220,0.12)`,
            borderRadius: 2,
            padding: '8px 12px',
            fontSize: 13,
            color: '#e8e4dc',
            fontFamily: zen,
            width: '100%',
            outline: 'none',
          }}
        >
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* KPI */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <KpiCard label="総売上" value={total} />
        <KpiCard label="来客数" value={clients} unit="名" />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <KpiCard label="技術売上" value={techTotal} />
        <KpiCard label="物販売上" value={retailTotal} />
      </div>

      {/* 日別リスト */}
      {loading ? (
        <div style={{ textAlign: 'center', color: muted, padding: 32, fontFamily: josefin, fontSize: 12 }}>Loading...</div>
      ) : sales.length === 0 ? (
        <div style={{ textAlign: 'center', color: muted, padding: 32, fontFamily: josefin, fontSize: 12 }}>この期間のデータはありません</div>
      ) : (
        sales.map(d => (
          <DailyRow key={d.id} date={d.date} total={d.total_sales} clients={d.client_count} />
        ))
      )}
    </div>
  )
}

// ─── スタッフタブ ──────────────────────────────────────────────────────────
function StaffTab({ ym }: { ym: string }) {
  const [sales, setSales]     = useState<StaffDailySales[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const { from, to } = monthBounds(ym)
    apiFetch<StaffDailySales[]>(`/api/v1/sales/staff?from=${from}&to=${to}`)
      .then(data => setSales(Array.isArray(data) ? data : []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false))
  }, [ym])

  const total       = sales.reduce((s, d) => s + d.total_sales,  0)
  const retailTotal = sales.reduce((s, d) => s + d.retail_sales, 0)
  const clients     = sales.reduce((s, d) => s + d.client_count, 0)
  const avgUnit     = clients > 0 ? Math.round(total / clients) : 0

  return (
    <div style={{ padding: '0 20px 24px' }}>
      {/* KPI */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <KpiCard label="総売上" value={total} />
        <KpiCard label="来客数" value={clients} unit="名" />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <KpiCard label="客単価" value={avgUnit} />
        <KpiCard label="物販売上" value={retailTotal} />
      </div>

      {/* 日別リスト */}
      {loading ? (
        <div style={{ textAlign: 'center', color: muted, padding: 32, fontFamily: josefin, fontSize: 12 }}>Loading...</div>
      ) : sales.length === 0 ? (
        <div style={{ textAlign: 'center', color: muted, padding: 32, fontFamily: josefin, fontSize: 12 }}>この期間のデータはありません</div>
      ) : (
        sales.map(d => (
          <DailyRow key={d.id} date={d.date} total={d.total_sales} clients={d.client_count} />
        ))
      )}
    </div>
  )
}

// ─── メインページ ──────────────────────────────────────────────────────────
export default function SalesPage() {
  const claims = getClaims()
  const isManager = claims?.role === 'owner' || claims?.role === 'admin'

  const now = new Date()
  const [ym, setYm] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [tab, setTab] = useState<'store' | 'staff'>('store')

  function prevMonth() {
    const [y, m] = ym.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function nextMonth() {
    const [y, m] = ym.split('-').map(Number)
    const d = new Date(y, m, 1)
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const [y, m] = ym.split('-')
  const monthLabel = `${y}年${Number(m)}月`

  return (
    <AppLayout>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 19, fontWeight: 400, color: '#e8e4dc', fontFamily: zen, marginBottom: 16 }}>売上</div>

        {/* 月セレクタ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
          <button
            onClick={prevMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polyline points="10,3 5,8 10,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span style={{ fontSize: 14, color: '#e8e4dc', fontFamily: josefin, fontWeight: 100, letterSpacing: '0.1em', minWidth: 100, textAlign: 'center' }}>
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polyline points="6,3 11,8 6,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, marginBottom: 20 }}>
          {isManager && (
            <TabBtn label="店舗" active={tab === 'store'} onClick={() => setTab('store')} />
          )}
          <TabBtn label="スタッフ" active={tab === 'staff'} onClick={() => setTab('staff')} />
        </div>
      </div>

      {tab === 'store' && isManager ? (
        <StoreTab ym={ym} />
      ) : (
        <StaffTab ym={ym} />
      )}
    </AppLayout>
  )
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: 'none',
        border: 'none',
        borderBottom: active ? `2px solid ${gold}` : '2px solid transparent',
        padding: '8px 0',
        marginBottom: -1,
        cursor: 'pointer',
        color: active ? gold : muted,
        fontFamily: josefin,
        fontWeight: 100,
        fontSize: 12,
        letterSpacing: '0.12em',
      }}
    >
      {label}
    </button>
  )
}
