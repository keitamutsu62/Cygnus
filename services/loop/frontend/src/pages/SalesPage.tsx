import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { api, apiFetch } from '../lib/api'
import { getClaims } from '../lib/auth'
import type { DailySales, Staff, StaffDailySales, StaffSalesSummary, Store } from '../types'

const gold       = '#c8a882'
const surface    = '#211f1d'
const bdr        = 'rgba(232,228,220,0.1)'
const goldDim    = 'rgba(200,168,130,0.12)'
const goldBorder = 'rgba(200,168,130,0.2)'
const muted      = 'rgba(232,228,220,0.55)'
const txt        = '#e8e4dc'
const green      = '#6dba8e'
const alertC     = '#e07060'
const bg         = '#1a1816'
const josefin    = "'Josefin Sans', sans-serif"
const zen        = "'Zen Kaku Gothic New', sans-serif"

type View   = 'all' | 'store' | 'staff'
type Period = 'today' | 'week' | 'month' | 'compare'

function fmt(n: number) { return n.toLocaleString('ja-JP') }

// APIの date フィールドは "2026-06-01T00:00:00+09:00" 形式で返るので先頭10文字だけ使う
function ds(d: string) { return d.slice(0, 10) }

// toISOString()はUTCなのでローカル日付を直接組み立てる
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function weekBoundsNow() {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { from: toLocal(mon), to: toLocal(sun), today: toLocal(now) }
}

function monthBoundsYm(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const last   = new Date(y, m, 0).getDate()
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` }
}

function currentYm() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function fetchRange(period: Period) {
  const wb = weekBoundsNow()
  if (period === 'today') return { from: wb.from, to: wb.to }   // always fetch full week for chart
  if (period === 'week')  return { from: wb.from, to: wb.to }
  return monthBoundsYm(currentYm())
}

// ── Bar data ─────────────────────────────────────────────────────────────
const DAYS = ['月', '火', '水', '木', '金', '土', '日']
const FUTURE_H = [80, 60, 45, 30, 20]

type BarItem = { day: string; amount: number; label: string; isToday: boolean; isFuture: boolean; height: number }

function buildWeekBars(sales: DailySales[]): BarItem[] {
  const wb = weekBoundsNow()
  const byDate: Record<string, number> = {}
  sales.forEach(d => { const k = ds(d.date); byDate[k] = (byDate[k] || 0) + d.total_sales })

  const raw = DAYS.map((day, i) => {
    const d = new Date(wb.from); d.setDate(d.getDate() + i)
    // ローカル日付で組み立てる（toISOString はUTCになるため使わない）
    const dstr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const amount   = byDate[dstr] || 0
    const isFuture = dstr > wb.today
    return { day, amount, label: amount ? `¥${fmt(amount)}` : '—', isToday: dstr === wb.today, isFuture }
  })

  const max = Math.max(...raw.filter(b => !b.isFuture).map(b => b.amount), 1)
  let fi = 0
  return raw.map(b => ({
    ...b,
    height: b.isFuture ? FUTURE_H[fi++ % FUTURE_H.length] : Math.max(5, (b.amount / max) * 90),
  }))
}

// ── OrbitSVG ──────────────────────────────────────────────────────────────
function OrbitSVG({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke={gold} strokeWidth="6" opacity="0.9"/>
      <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="6" opacity="0.5"/>
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <polyline points="2,4 6,8 10,4" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── KpiCard ───────────────────────────────────────────────────────────────
function KpiCard({
  label, yenValue, numValue, numUnit = '名', diff, diffDown, large, full,
}: {
  label: React.ReactNode
  yenValue?: number; numValue?: number; numUnit?: string
  diff?: string; diffDown?: boolean; large?: boolean; full?: boolean
}) {
  const val   = yenValue !== undefined ? yenValue : (numValue ?? 0)
  const isYen = yenValue !== undefined
  return (
    <div style={{
      gridColumn: full ? '1 / -1' : undefined,
      background: surface, border: `1px solid ${bdr}`, borderRadius: 2,
      padding: '14px 12px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${gold}, transparent)` }}/>
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: muted, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
        {label}
      </div>
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: large ? 32 : 26, color: txt, lineHeight: 1 }}>
        {isYen && <span style={{ fontSize: large ? 16 : 13, color: muted, marginRight: 2 }}>¥</span>}
        {fmt(val)}
        {!isYen && numUnit && <span style={{ fontSize: 13, color: muted, marginLeft: 2 }}>{numUnit}</span>}
      </div>
      {diff && <div style={{ fontSize: 11, color: diffDown ? alertC : green, marginTop: 4 }}>{diff}</div>}
    </div>
  )
}

function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>{children}</div>
}

// ── SectionTitle ──────────────────────────────────────────────────────────
function SectionTitle({ text, link, onLink }: { text: string; link?: string; onLink?: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 12px' }}>
      <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: txt, display: 'flex', alignItems: 'center', gap: 7 }}>
        <OrbitSVG size={12}/> {text}
      </div>
      {link && <div style={{ fontSize: 12, color: gold, opacity: 0.8, cursor: 'pointer' }} onClick={onLink}>{link}</div>}
    </div>
  )
}

// ── WeekBarChart ──────────────────────────────────────────────────────────
function WeekBarChart({ bars, title, total }: { bars: BarItem[]; title: string; total: number }) {
  const [tip, setTip] = useState('')
  const [selIdx, setSelIdx] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  function idxAt(clientX: number) {
    if (!ref.current) return -1
    const r = ref.current.getBoundingClientRect()
    return Math.max(0, Math.min(6, Math.floor(((clientX - r.left) / r.width) * 7)))
  }

  function pick(i: number) {
    setSelIdx(i)
    const b = bars[i]
    setTip(b ? `${b.day}  ${b.label}` : '')
  }

  function reset() { setSelIdx(null); setTip('') }

  return (
    <div style={{ background: surface, border: `1px solid ${bdr}`, borderRadius: 2, padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <OrbitSVG size={10}/> {title}
        </div>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 17, color: txt }}>
          <span style={{ fontSize: 11, color: muted, marginRight: 2 }}>¥</span>{fmt(total)}
        </div>
      </div>
      <div style={{ textAlign: 'center', height: 22, marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: gold, fontFamily: josefin, fontWeight: 100 }}>{tip}</div>
      </div>
      <div
        ref={ref}
        style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 70, marginBottom: 6, cursor: 'pointer', userSelect: 'none' } as React.CSSProperties}
        onTouchStart={e => { e.preventDefault(); pick(idxAt(e.touches[0].clientX)) }}
        onTouchMove={e => pick(idxAt(e.touches[0].clientX))}
        onTouchEnd={reset}
        onMouseLeave={reset}
      >
        {bars.map((b, i) => {
          const dimmed = selIdx !== null && selIdx !== i
          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 }}
              onClick={() => pick(i)}
            >
              <div style={{
                width: '100%', borderRadius: '2px 2px 0 0',
                background: b.isToday ? gold : goldDim,
                border: `1px solid ${b.isToday ? gold : goldBorder}`,
                height: `${b.height}%`,
                opacity: b.isFuture ? (i === 6 ? 0.12 : 0.2) : dimmed ? 0.45 : 1,
                transition: 'opacity 0.1s',
              }}/>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 8, color: b.isToday ? gold : muted, opacity: b.isFuture ? (i === 6 ? 0.25 : 0.35) : 1 }}>
                {b.day}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MonthlyBarChart ───────────────────────────────────────────────────────
type MonthBarItem = { label: string; displayAmt: string; height: number; isActive: boolean }

const MONTH_BARS: MonthBarItem[] = [
  { label: '12月', displayAmt: '¥8,500,000', height: 87, isActive: false },
  { label: '1月',  displayAmt: '¥7,200,000', height: 73, isActive: false },
  { label: '2月',  displayAmt: '¥7,600,000', height: 77, isActive: false },
  { label: '3月',  displayAmt: '¥8,000,000', height: 81, isActive: false },
  { label: '4月',  displayAmt: '¥8,204,000', height: 83, isActive: false },
  { label: '5月',  displayAmt: '¥8,820,400', height: 90, isActive: true  },
]

function MonthlyBarChart() {
  const months = MONTH_BARS
  const [activeIdx, setActiveIdx] = useState(() => months.findIndex(m => m.isActive))
  const ref = useRef<HTMLDivElement>(null)

  function idxAt(clientX: number) {
    if (!ref.current) return -1
    const r = ref.current.getBoundingClientRect()
    return Math.max(0, Math.min(months.length - 1, Math.floor(((clientX - r.left) / r.width) * months.length)))
  }

  const tooltipText = activeIdx >= 0 ? `${months[activeIdx].label}  ${months[activeIdx].displayAmt}` : '—'

  return (
    <div style={{ background: surface, border: `1px solid ${bdr}`, borderRadius: 2, padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <OrbitSVG size={10}/> 月次推移（過去6ヶ月）
        </div>
      </div>
      <div style={{ textAlign: 'center', height: 28, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, color: gold }}>{tooltipText}</div>
      </div>
      <div
        ref={ref}
        style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: 6, cursor: 'pointer', userSelect: 'none' } as React.CSSProperties}
        onTouchStart={e => { e.preventDefault(); setActiveIdx(idxAt(e.touches[0].clientX)) }}
        onTouchMove={e => setActiveIdx(idxAt(e.touches[0].clientX))}
        onClick={e => setActiveIdx(idxAt(e.clientX))}
      >
        {months.map((m, i) => {
          const isAct = i === activeIdx
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', borderRadius: '2px 2px 0 0', background: isAct ? gold : goldDim, border: `1px solid ${isAct ? gold : goldBorder}`, height: `${m.height}%`, transition: 'background 0.15s' }}/>
              <div style={{ fontSize: 8, color: isAct ? gold : muted }}>{m.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Picker ────────────────────────────────────────────────────────────────
function Picker({ label, selectedId, items, onSelect, myId }: {
  label: string
  selectedId: number | null
  items: { id: number; name: string }[]
  onSelect: (id: number) => void
  myId?: number
}) {
  const [open, setOpen] = useState(false)
  const selected = items.find(s => s.id === selectedId)
  return (
    <>
      <div
        style={{ background: surface, border: `1px solid ${goldBorder}`, borderRadius: 2, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ fontSize: 12, color: muted }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: gold, fontSize: 13, fontFamily: josefin, fontWeight: 100 }}>{selected?.name ?? '—'}</span>
          <ChevronDown/>
        </div>
      </div>
      {open && (
        <div style={{ background: surface, border: `1px solid ${goldBorder}`, borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{ padding: '12px 16px', fontSize: 13, color: item.id === selectedId ? gold : txt, borderBottom: i < items.length - 1 ? `1px solid ${bdr}` : undefined, cursor: 'pointer' }}
              onClick={() => { onSelect(item.id); setOpen(false) }}
            >
              {item.name}
              {myId !== undefined && item.id === myId && <span style={{ fontSize: 11, color: muted }}> （自店舗）</span>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── StoreRankRow ──────────────────────────────────────────────────────────
function StoreRankRow({ rank, name, meta, sales, pct, onClick }: {
  rank: number; name: string; meta: string; sales: number; pct: string; onClick?: () => void
}) {
  return (
    <div style={{ background: surface, border: `1px solid ${bdr}`, borderRadius: 2, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={onClick}>
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 16, color: rank === 1 ? gold : muted, minWidth: 18, textAlign: 'center' }}>{rank}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 400, color: txt, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 11, color: muted }}>{meta}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 17, color: txt, lineHeight: 1 }}>
          <span style={{ fontSize: 11, color: muted, marginRight: 1 }}>¥</span>{fmt(sales)}
        </div>
        <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{pct}</div>
      </div>
    </div>
  )
}

// ── StaffRankRow ──────────────────────────────────────────────────────────
function StaffRankRow({ rank, name, initials, meta, sales, pct, onClick }: {
  rank: number; name: string; initials?: string | null; meta: string; sales: number; pct: string; onClick?: () => void
}) {
  const ini = initials || (name.length > 0 ? name[0] : '?')
  return (
    <div style={{ background: surface, border: `1px solid ${bdr}`, borderRadius: 2, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={onClick}>
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 16, color: rank === 1 ? gold : muted, minWidth: 18, textAlign: 'center' }}>{rank}</div>
      <div style={{ width: 32, height: 32, background: '#272422', border: `1px solid ${bdr}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: muted, flexShrink: 0 }}>{ini}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 400, color: txt, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 11, color: muted }}>{meta}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 17, color: txt, lineHeight: 1 }}>
          <span style={{ fontSize: 11, color: muted, marginRight: 1 }}>¥</span>{fmt(sales)}
        </div>
        <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{pct}</div>
      </div>
    </div>
  )
}

// ── AllView ───────────────────────────────────────────────────────────────
function AllView({ period, stores, onSelectStore }: {
  period: Period; stores: Store[]; onSelectStore: (id: number) => void
}) {
  const [allSales, setAllSales] = useState<DailySales[]>([])
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (stores.length === 0) return
    const { from, to } = fetchRange(period)
    Promise.allSettled(
      stores.map(s => apiFetch<DailySales[]>(`/api/v1/sales/store?store_id=${s.id}&from=${from}&to=${to}`))
    ).then(results => {
      setAllSales(
        results
          .filter((r): r is PromiseFulfilledResult<DailySales[]> => r.status === 'fulfilled')
          .flatMap(r => r.value)
      )
    })
  }, [stores, period])

  const today      = todayStr()
  const wb         = weekBoundsNow()
  const monthStart = currentYm() + '-01'
  const todayData   = allSales.filter(d => ds(d.date) === today)
  const weekData    = allSales.filter(d => ds(d.date) >= wb.from && ds(d.date) <= today)
  const monthData   = allSales.filter(d => ds(d.date) >= monthStart && ds(d.date) <= today)
  const periodData  = period === 'today' ? todayData : period === 'week' ? weekData : monthData
  const todayTotal   = todayData.reduce((s, d) => s + d.total_sales, 0)
  const weekTotal    = weekData.reduce((s, d) => s + d.total_sales, 0)
  const monthTotal   = monthData.reduce((s, d) => s + d.total_sales, 0)
  const dispTotal    = period === 'today' ? todayTotal : period === 'week' ? weekTotal : monthTotal
  const todayClients = todayData.reduce((s, d) => s + d.client_count, 0)
  const total   = periodData.reduce((s, d) => s + d.total_sales, 0)
  const clients = periodData.reduce((s, d) => s + d.client_count, 0)
  const avgUnit = clients > 0 ? Math.round(total / clients) : 0

  const bars = buildWeekBars(allSales)

  const ranking = stores.map(s => {
    const ss = allSales.filter(d => d.store_id === s.id)
    return { store: s, total: ss.reduce((a, d) => a + d.total_sales, 0), clients: ss.reduce((a, d) => a + d.client_count, 0) }
  }).sort((a, b) => b.total - a.total)

  const periodLabel = period === 'today' ? '本日売上' : period === 'week' ? '今週売上' : '今月売上'

  return (
    <div>
      <KpiGrid>
        <KpiCard label={<><OrbitSVG size={10}/> 全店 · {periodLabel}</>} yenValue={dispTotal} diff="↑ 先週比 +6.1%" large full/>
        <KpiCard label="総客数"    numValue={period === 'today' ? todayClients : clients}/>
        <KpiCard label="平均客単価" yenValue={avgUnit}/>
      </KpiGrid>
      <WeekBarChart bars={bars} title="全店 週間推移" total={weekTotal}/>
      <SectionTitle text="店舗別売上ランキング"/>
      {ranking.slice(0, 3).map((r, i) => (
        <StoreRankRow
          key={r.store.id} rank={i + 1} name={r.store.name}
          meta={`${r.clients}名`} sales={r.total}
          pct={total > 0 ? `${Math.round(r.total / total * 100)}%` : '0%'}
          onClick={() => onSelectStore(r.store.id)}
        />
      ))}
      {moreOpen && ranking.slice(3).map((r, i) => (
        <StoreRankRow
          key={r.store.id} rank={i + 4} name={r.store.name}
          meta={`${r.clients}名`} sales={r.total}
          pct={total > 0 ? `${Math.round(r.total / total * 100)}%` : '0%'}
          onClick={() => onSelectStore(r.store.id)}
        />
      ))}
      {ranking.length > 3 && (
        <div
          style={{ textAlign: 'center', padding: 12, fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: gold, cursor: 'pointer', opacity: 0.8 }}
          onClick={() => setMoreOpen(o => !o)}
        >
          {moreOpen ? '閉じる ↑' : 'もっと見る ↓'}
        </div>
      )}
    </div>
  )
}

// ── StoreView ─────────────────────────────────────────────────────────────
function StoreView({ period, stores, selectedId, onSelectId, onGoStaff }: {
  period: Period; stores: Store[]; selectedId: number | null
  onSelectId: (id: number) => void; onGoStaff: (staffId?: number) => void
}) {
  const [sales, setSales]             = useState<DailySales[]>([])
  const [staffRanking, setStaffRanking] = useState<StaffSalesSummary[]>([])

  const selectedStore = stores.find(s => s.id === selectedId)

  useEffect(() => {
    if (!selectedId) return
    const { from, to } = fetchRange(period)
    const today = todayStr()
    Promise.allSettled([
      apiFetch<DailySales[]>(`/api/v1/sales/store?store_id=${selectedId}&from=${from}&to=${to}`),
      apiFetch<StaffSalesSummary[]>(`/api/v1/sales/store/staff?store_id=${selectedId}&date=${today}`),
    ]).then(([sR, stR]) => {
      if (sR.status === 'fulfilled')  setSales(Array.isArray(sR.value) ? sR.value : [])
      if (stR.status === 'fulfilled') setStaffRanking(Array.isArray(stR.value) ? stR.value : [])
    })
  }, [selectedId, period])

  const today       = todayStr()
  const wb          = weekBoundsNow()
  const monthStart  = currentYm() + '-01'
  const todayData   = sales.filter(d => ds(d.date) === today)
  const weekData    = sales.filter(d => ds(d.date) >= wb.from && ds(d.date) <= today)
  const monthData   = sales.filter(d => ds(d.date) >= monthStart && ds(d.date) <= today)
  const todayTotal  = todayData.reduce((s, d) => s + d.total_sales, 0)
  const weekTotal   = weekData.reduce((s, d) => s + d.total_sales, 0)
  const monthTotal  = monthData.reduce((s, d) => s + d.total_sales, 0)

  const periodData  = period === 'today' ? todayData : period === 'week' ? weekData : monthData
  const dispTotal   = period === 'today' ? todayTotal : period === 'week' ? weekTotal : monthTotal
  const clients     = periodData.reduce((s, d) => s + d.client_count, 0)
  const avgUnit     = clients > 0 ? Math.round(dispTotal / clients) : 0
  const techTotal   = periodData.reduce((s, d) => s + d.tech_sales, 0)
  const retailTotal = periodData.reduce((s, d) => s + d.retail_sales, 0)

  const bars     = buildWeekBars(sales)

  const staffTotal = staffRanking.reduce((s, r) => s + r.total_sales, 0)
  const periodLabel = period === 'today' ? '本日売上' : period === 'week' ? '今週売上' : '今月売上'

  return (
    <div>
      <Picker label="表示中の店舗" selectedId={selectedId} items={stores} onSelect={onSelectId}/>
      <KpiGrid>
        <KpiCard
          label={<><OrbitSVG size={10}/> {selectedStore?.name ?? ''} · {periodLabel}</>}
          yenValue={dispTotal} large full
        />
        <KpiCard label="客数"    numValue={clients}/>
        <KpiCard label="客単価"  yenValue={avgUnit}/>
        <KpiCard label="技術売上" yenValue={techTotal}/>
        <KpiCard label="物販売上" yenValue={retailTotal}/>
      </KpiGrid>
      <WeekBarChart bars={bars} title="週間売上推移" total={weekTotal}/>
      <SectionTitle text="スタッフ売上" link="詳細 →" onLink={() => onGoStaff()}/>
      {staffRanking.slice(0, 3).map((r, i) => (
        <StaffRankRow
          key={r.staff_id} rank={i + 1} name={r.name} initials={r.avatar_initials}
          meta={`${r.client_count}名`} sales={r.total_sales}
          pct={staffTotal > 0 ? `${Math.round(r.total_sales / staffTotal * 100)}%` : '0%'}
          onClick={() => onGoStaff(r.staff_id)}
        />
      ))}
    </div>
  )
}

// ── StaffView ─────────────────────────────────────────────────────────────
function StaffView({ period, initStaffId }: { period: Period; initStaffId?: number }) {
  const claims = getClaims()
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(initStaffId ?? claims?.staff_id ?? null)
  const [staffList, setStaffList]   = useState<Staff[]>([])
  const [sales, setSales]           = useState<StaffDailySales[]>([])
  const [aiResult, setAiResult]     = useState<string | null>(null)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState<string | null>(null)

  useEffect(() => {
    apiFetch<Staff[]>('/api/v1/staffs')
      .then(data => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const { from, to } = fetchRange(period)
    const staffParam = selectedStaffId ? `&staff_id=${selectedStaffId}` : ''
    apiFetch<StaffDailySales[]>(`/api/v1/sales/staff?from=${from}&to=${to}${staffParam}`)
      .then(data => setSales(Array.isArray(data) ? data : []))
      .catch(() => setSales([]))
  }, [period, selectedStaffId])

  const today          = todayStr()
  const wbS            = weekBoundsNow()
  const monthStartS    = currentYm() + '-01'
  const displayStaff   = staffList.find(s => s.id === selectedStaffId)
  const todaySales     = sales.filter(d => ds(d.date) === today)
  const weekSales      = sales.filter(d => ds(d.date) >= wbS.from && ds(d.date) <= today)
  const monthSales     = sales.filter(d => ds(d.date) >= monthStartS && ds(d.date) <= today)
  const periodSales    = period === 'today' ? todaySales : period === 'week' ? weekSales : monthSales
  const periodTotal    = periodSales.reduce((s, d) => s + d.total_sales, 0)
  const clients        = periodSales.reduce((s, d) => s + d.client_count, 0)
  const avgUnit        = clients > 0 ? Math.round(periodTotal / clients) : 0
  const retailTotal    = periodSales.reduce((s, d) => s + d.retail_sales, 0)
  const staffPeriodLabel = period === 'today' ? '本日' : period === 'week' ? '今週' : '今月'

  const MENUS = [
    { name: 'カット + カラー', count: 3, amount: 33000, pct: 80 },
    { name: 'カット + パーマ', count: 1, amount: 15000, pct: 40 },
    { name: 'カットのみ',      count: 1, amount:  5500, pct: 15 },
  ]

  return (
    <div>
      {/* Staff picker */}
      {(claims?.role === 'owner' || claims?.role === 'admin') ? (
        <Picker
          label="表示中のスタッフ"
          selectedId={selectedStaffId}
          items={staffList.map(s => ({ id: s.id, name: s.name }))}
          onSelect={setSelectedStaffId}
          myId={claims?.staff_id}
        />
      ) : (
        <div style={{ background: surface, border: `1px solid ${goldBorder}`, borderRadius: 2, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: muted }}>表示中のスタッフ</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: gold, fontSize: 13, fontFamily: josefin, fontWeight: 100 }}>{displayStaff?.name ?? '—'}</span>
          </div>
        </div>
      )}

      {/* my-header */}
      <div style={{ background: surface, border: `1px solid ${bdr}`, borderRadius: 2, padding: '18px 16px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${gold}, transparent)` }}/>
        <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>{staffPeriodLabel}の売上</div>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 40, color: txt, lineHeight: 1, marginBottom: 14 }}>
          <span style={{ fontSize: 17, color: muted, marginRight: 3 }}>¥</span>{fmt(periodTotal)}
        </div>
        <div style={{ display: 'flex', gap: 20, paddingTop: 12, borderTop: `1px solid ${bdr}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 10, color: muted }}>担当客数</div>
            <div style={{ fontSize: 15, fontWeight: 400, color: txt }}>{clients}名</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 10, color: muted }}>客単価</div>
            <div style={{ fontSize: 15, fontWeight: 400, color: txt }}>¥{fmt(avgUnit)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 10, color: muted }}>物販</div>
            <div style={{ fontSize: 15, fontWeight: 400, color: txt }}>¥{fmt(retailTotal)}</div>
          </div>
        </div>
      </div>

      <SectionTitle text="メニュー別内訳"/>
      {MENUS.map((m, i) => (
        <div key={i}>
          <div style={{ background: surface, border: `1px solid ${bdr}`, borderRadius: 2, padding: '12px 16px', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 400, color: txt, marginBottom: 2 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: muted }}>{m.count}件</div>
            </div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 17, color: txt }}>
              <span style={{ fontSize: 11, color: muted, marginRight: 1 }}>¥</span>{fmt(m.amount)}
            </div>
          </div>
          <div style={{ height: 2, background: 'rgba(232,228,220,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${m.pct}%`, background: gold, borderRadius: 2, opacity: 0.6 }}/>
          </div>
        </div>
      ))}

      <SectionTitle text="AI 得意領域分析"/>

      {/* 分析結果カード */}
      {aiResult && (
        <div style={{ background: surface, border: `1px solid ${goldBorder}`, borderRadius: 2, padding: 16, position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${gold}, transparent)` }}/>
          <div style={{ fontSize: 13, color: txt, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiResult}</div>
        </div>
      )}

      {/* エラー表示 */}
      {aiError && (
        <div style={{ fontSize: 12, color: alertC, marginBottom: 12, padding: '8px 0' }}>{aiError}</div>
      )}

      {/* 生成ボタン */}
      <button
        disabled={aiLoading}
        style={{ width: '100%', padding: 14, background: 'transparent', border: `1px solid ${aiLoading ? bdr : goldBorder}`, borderRadius: 2, fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: aiLoading ? muted : gold, cursor: aiLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        onClick={async () => {
          setAiLoading(true)
          setAiError(null)
          try {
            const res = await api('/api/v1/staff/analysis', { method: 'POST' })
            if (!res.ok) throw new Error(`${res.status}`)
            const data = await res.json() as { analysis: string }
            setAiResult(data.analysis)
          } catch {
            setAiError('分析の取得に失敗しました。しばらくしてから再試行してください。')
          } finally {
            setAiLoading(false)
          }
        }}
      >
        {aiLoading ? (
          <><OrbitSVG size={12}/> 分析中...</>
        ) : (
          <><OrbitSVG size={12}/> {aiResult ? 'AI分析を再生成する' : 'AI分析を生成する'}</>
        )}
      </button>
    </div>
  )
}

// ── CompareView ───────────────────────────────────────────────────────────
type CompareRow = { name: string; prev: string; curr: string; diff: string; up: boolean }
const COMPARE: Record<View, { label: string; rows: CompareRow[] }> = {
  all: {
    label: '全店 — 2026年5月 vs 4月',
    rows: [
      { name: '売上合計', prev: '¥8,204,000', curr: '¥8,820,400', diff: '↑ +7.5%',  up: true  },
      { name: '客数',     prev: '648名',       curr: '680名',      diff: '↑ +4.9%',  up: true  },
      { name: '客単価',   prev: '¥12,661',    curr: '¥12,971',   diff: '↑ +2.4%',  up: true  },
      { name: '技術売上', prev: '¥6,980,000', curr: '¥7,560,000', diff: '↑ +8.3%',  up: true  },
      { name: '物販売上', prev: '¥1,224,000', curr: '¥1,260,400', diff: '↑ +3.0%',  up: true  },
    ],
  },
  store: {
    label: '店舗 — 2026年5月 vs 4月',
    rows: [
      { name: '売上合計', prev: '¥2,804,000', curr: '¥3,204,000', diff: '↑ +14.3%', up: true  },
      { name: '客数',     prev: '218名',       curr: '248名',      diff: '↑ +13.8%', up: true  },
      { name: '客単価',   prev: '¥12,862',    curr: '¥12,919',   diff: '↑ +0.4%',  up: true  },
      { name: '技術売上', prev: '¥2,380,000', curr: '¥2,760,000', diff: '↑ +16.0%', up: true  },
      { name: '物販売上', prev: '¥424,000',   curr: '¥444,000',  diff: '↑ +4.7%',  up: true  },
    ],
  },
  staff: {
    label: 'スタッフ — 2026年5月 vs 4月',
    rows: [
      { name: '売上合計', prev: '¥1,048,000', curr: '¥1,240,000', diff: '↑ +18.3%', up: true  },
      { name: '客数',     prev: '74名',        curr: '88名',       diff: '↑ +18.9%', up: true  },
      { name: '客単価',   prev: '¥14,162',    curr: '¥14,091',   diff: '↓ -0.5%',  up: false },
      { name: '技術売上', prev: '¥904,000',   curr: '¥1,072,000', diff: '↑ +18.6%', up: true  },
      { name: '物販売上', prev: '¥144,000',   curr: '¥168,000',  diff: '↑ +16.7%', up: true  },
    ],
  },
}

function CompareView({ view }: { view: View }) {
  const data = COMPARE[view]
  return (
    <div>
      <div style={{ fontSize: 11, color: muted, padding: '8px 0 12px' }}>{data.label}</div>
      <div style={{ background: surface, border: `1px solid ${bdr}`, borderRadius: 2, padding: '14px 16px', marginBottom: 8 }}>
        {data.rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < data.rows.length - 1 ? `1px solid ${bdr}` : undefined }}>
            <div style={{ fontSize: 12, color: muted }}>{row.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontSize: 11, color: muted }}>先月 {row.prev}</div>
              <div style={{ fontSize: 17, fontWeight: 300, color: txt }}>{row.curr}</div>
              <div style={{ fontSize: 11, color: row.up ? green : alertC }}>{row.diff}</div>
            </div>
          </div>
        ))}
      </div>
      <MonthlyBarChart/>
    </div>
  )
}

// ── SalesPage ─────────────────────────────────────────────────────────────
export default function SalesPage() {
  const loc = useLocation()
  const [view, setView] = useState<View>(() => {
    const t = (loc.state as any)?.tab
    if (t === 'store') return 'store'
    if (t === 'staff') return 'staff'
    return 'all'
  })
  const [period, setPeriod]   = useState<Period>('today')
  const [stores, setStores]   = useState<Store[]>([])
  const [selStoreId, setSelStoreId] = useState<number | null>(null)
  const [selStaffId, setSelStaffId] = useState<number | null>((loc.state as any)?.staffId ?? null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiFetch<Store[]>('/api/v1/stores')
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setStores(list)
        if (list.length > 0) setSelStoreId(list[0].id)
      })
      .catch(() => {})
  }, [])

  // タブ切替時に先頭にスクロールリセット
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [view, period])

  const showCompare = period === 'compare'

  return (
    <AppLayout>
      {/* height:100% で外側スクロールを殺し、内側スクロールコンテナを使う */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* ヘッダー（固定） */}
        <div style={{ flexShrink: 0, background: bg }}>
          <div style={{ padding: '14px 20px 0' }}>
            <div style={{ fontSize: 19, fontWeight: 400, color: txt, fontFamily: zen }}>売上管理</div>
          </div>
          <div style={{ padding: '10px 20px 0' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: surface, border: `1px solid ${bdr}`, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
              {(['all', 'store', 'staff'] as View[]).map(v => {
                const active = view === v
                const label  = v === 'all' ? '全店' : v === 'store' ? '店舗' : 'スタッフ'
                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{ flex: 1, padding: 10, fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: active ? gold : muted, textAlign: 'center', cursor: 'pointer', border: active ? `1px solid ${goldBorder}` : 'none', background: active ? goldDim : 'transparent' } as React.CSSProperties}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {/* Period tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {(['today', 'week', 'month', 'compare'] as Period[]).map(p => {
                const active = period === p
                const label  = p === 'today' ? '今日' : p === 'week' ? '今週' : p === 'month' ? '今月' : '前月比'
                return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '5px 12px', borderRadius: 2, cursor: 'pointer', border: `1px solid ${active ? goldBorder : bdr}`, color: active ? gold : muted, background: active ? goldDim : 'transparent' } as React.CSSProperties}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* スクロールコンテンツ（内側スクロール） */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 24px' } as React.CSSProperties}>
          {showCompare ? (
            <CompareView view={view}/>
          ) : view === 'all' ? (
            <AllView
              period={period}
              stores={stores}
              onSelectStore={id => { setSelStoreId(id); setView('store') }}
            />
          ) : view === 'store' ? (
            <StoreView
              period={period}
              stores={stores}
              selectedId={selStoreId}
              onSelectId={setSelStoreId}
              onGoStaff={(staffId) => { if (staffId !== undefined) setSelStaffId(staffId); setView('staff') }}
            />
          ) : (
            <StaffView period={period} initStaffId={selStaffId ?? undefined}/>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
