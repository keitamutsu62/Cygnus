import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClaims, getSalonName } from '../lib/auth'
import { apiFetch } from '../lib/api'
import type { DailySales, Staff, Store } from '../types'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = 'var(--accent)'
const text    = 'var(--text)'
const muted   = 'var(--text-muted)'
const border  = 'var(--border)'
const surface = 'var(--surface)'
const green   = '#6dba8e'

const OrbitSVG = () => (
  <svg width="12" height="12" viewBox="0 0 80 80" fill="none">
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke={gold} strokeWidth="6" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="6" opacity="0.5"/>
  </svg>
)

// ─── 日付ユーティリティ ─────────────────────────────────────
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function startOfWeek(d: Date): Date {
  // 月曜始まり
  const n = new Date(d)
  const day = n.getDay() // 0=日, 1=月, ..., 6=土
  const diff = day === 0 ? -6 : 1 - day
  n.setDate(n.getDate() + diff)
  n.setHours(0, 0, 0, 0)
  return n
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
function jpDateRange(from: Date, to: Date): string {
  return `${from.getMonth() + 1}月${from.getDate()}日 - ${to.getMonth() + 1}月${to.getDate()}日`
}

function SectionLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '24px 0 12px' }}>
      <OrbitSVG />
      <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: text }}>{label}</span>
      {sub && <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted }}>· {sub}</span>}
    </div>
  )
}

// ─── 型 ─────────────────────────────────────────────────────
type ReviewDetail = {
  id: number
  staff_id: number | null
  staff_name: string | null
  menu_id: number | null
  menu_name: string | null
  rating_overall: number
  rating_finish: number
  rating_service: number
  comment: string | null
  created_at: string
}
type HealthItem = {
  key: string
  label: string
  value: string
  sub: string
  trend: 'up' | 'flat' | 'wip'
  dest: string
}
type FocusStaff = {
  id: number
  name: string
  count: number
  overall: number
  tone: 'good' | 'grow' | 'focus'
  title: string
  detail: string
}

// ─── 集計 ───────────────────────────────────────────────────
function buildHealth(
  thisWeekSales: DailySales[],
  lastWeekSales: DailySales[],
  reviews: ReviewDetail[],
): HealthItem[] {
  const thisTotal = thisWeekSales.reduce((s, d) => s + d.total_sales, 0)
  const lastTotal = lastWeekSales.reduce((s, d) => s + d.total_sales, 0)

  let salesValue = '—'
  let salesSub   = '前週比 (データ待ち)'
  let salesTrend: 'up' | 'flat' | 'wip' = 'wip'
  if (lastTotal > 0) {
    const diff = Math.round(((thisTotal - lastTotal) / lastTotal) * 100)
    salesValue = `${diff >= 0 ? '+' : ''}${diff}%`
    salesSub   = '前週比'
    salesTrend = diff >= 0 ? 'up' : 'flat'
  } else if (thisTotal > 0) {
    salesValue = '¥' + thisTotal.toLocaleString('ja-JP')
    salesSub   = '今週合計'
    salesTrend = 'up'
  }

  let reviewValue = '—'
  let reviewSub   = '平均評価 (データ待ち)'
  let reviewTrend: 'up' | 'flat' | 'wip' = 'wip'
  if (reviews.length > 0) {
    const avg = reviews.reduce((s, r) => s + r.rating_overall, 0) / reviews.length
    reviewValue = avg.toFixed(1)
    reviewSub   = `平均評価 · ${reviews.length}件`
    reviewTrend = avg >= 4 ? 'up' : 'flat'
  }

  return [
    { key: 'sales',  label: '売上',         value: salesValue,  sub: salesSub,  trend: salesTrend, dest: '/sales' },
    { key: 'review', label: '口コミ',       value: reviewValue, sub: reviewSub, trend: reviewTrend, dest: '/reviews' },
    { key: 'repeat', label: 'リピート売上', value: '—',         sub: '準備中',  trend: 'wip', dest: '/sales' },
    { key: 'nomi',   label: '指名売上',     value: '—',         sub: '準備中',  trend: 'wip', dest: '/sales' },
  ]
}

function buildFocusStaffs(reviews: ReviewDetail[]): FocusStaff[] {
  const map = new Map<number, { name: string; ratings: number[] }>()
  for (const r of reviews) {
    if (r.staff_id == null || r.staff_name == null) continue
    if (!map.has(r.staff_id)) map.set(r.staff_id, { name: r.staff_name, ratings: [] })
    map.get(r.staff_id)!.ratings.push(r.rating_overall)
  }
  const arr = Array.from(map.entries()).map(([id, v]) => {
    const overall = v.ratings.reduce((s, n) => s + n, 0) / v.ratings.length
    return { id, name: v.name, count: v.ratings.length, overall }
  })
  arr.sort((a, b) => b.count - a.count)

  return arr.slice(0, 3).map(s => {
    let tone: 'good' | 'grow' | 'focus'
    let title: string
    let detail: string
    const roundedAvg = Math.round(s.overall * 10) / 10
    if (s.overall >= 4.5) {
      tone = 'good'
      title = `高評価が集まっています（平均 ${roundedAvg}）`
      detail = `直近 ${s.count} 件の口コミで平均評価が高水準。強みを言語化してチームに共有すると効果的です。`
    } else if (s.overall >= 4.0) {
      tone = 'grow'
      title = `安定した評価が続いています（平均 ${roundedAvg}）`
      detail = `${s.count} 件の口コミが集まりました。細部の磨き込みで次のステップに進めるタイミングです。`
    } else {
      tone = 'focus'
      title = `伸びしろポイントが見えています（平均 ${roundedAvg}）`
      detail = `${s.count} 件の声から改善の芽があります。詳細を確認して、次の一手を一緒に整理しましょう。`
    }
    return { id: s.id, name: s.name, count: s.count, overall: s.overall, tone, title, detail }
  })
}

// ─── 部品 ─────────────────────────────────────────────────────
function HealthCard({ item, onClick }: { item: HealthItem; onClick: () => void }) {
  const trendC = item.trend === 'up' ? green : muted
  const isWip = item.trend === 'wip'
  return (
    <div onClick={onClick} style={{
      background: surface, border: `1px solid ${border}`, borderRadius: 6,
      padding: '14px 14px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 6,
      opacity: isWip ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const }}>{item.label}</span>
        {item.trend === 'up' && (
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke={trendC} strokeWidth="2" strokeLinecap="round">
            <path d="M3 12L8 5L13 12" />
          </svg>
        )}
      </div>
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 26, color: text, lineHeight: 1 }}>{item.value}</div>
      <div style={{ fontFamily: zen, fontWeight: 300, fontSize: 11, color: muted }}>{item.sub}</div>
    </div>
  )
}

function StaffFocusCard({ s, onClick }: { s: FocusStaff; onClick: () => void }) {
  const accent = s.tone === 'good' ? green : s.tone === 'grow' ? gold : '#dbb98b'
  const badge  = s.tone === 'good' ? '伸びている' : s.tone === 'grow' ? '成長中' : '注目'
  return (
    <div onClick={onClick} style={{
      background: surface, border: `1px solid ${border}`, borderLeft: `3px solid ${accent}`,
      borderRadius: 4, padding: '14px 16px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-dim)', border: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: josefin, fontWeight: 100, fontSize: 14, color: gold,
          }}>{s.name[0]}</div>
          <div>
            <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 14, color: text, lineHeight: 1.3 }}>{s.name}</div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: muted, letterSpacing: '0.08em' }}>{s.count}件の口コミ</div>
          </div>
        </div>
        <span style={{
          fontFamily: josefin, fontWeight: 200, fontSize: 9, letterSpacing: '0.18em',
          padding: '3px 8px', borderRadius: 2,
          background: `${accent}1f`, color: accent, border: `1px solid ${accent}40`,
        }}>{badge}</span>
      </div>
      <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 14, color: text, lineHeight: 1.5 }}>{s.title}</div>
      <div style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted, lineHeight: 1.6 }}>{s.detail}</div>
    </div>
  )
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div style={{
      background: surface, border: `1px dashed ${border}`, borderRadius: 4,
      padding: '18px 16px', textAlign: 'center' as const,
    }}>
      <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted, margin: 0, lineHeight: 1.7 }}>{message}</p>
    </div>
  )
}

// ─── Weekly Insight 型 ─────────────────────────────
type StoreMetrics = {
  period_start: string
  period_end: string
  total_sales: number
  tech_sales: number
  retail_sales: number
  client_count: number
  treatment_count: number
  average_per_client: number | null
  nomination_ratio: number | null
  review_count: number
  finish_star5_rate: number | null
  service_star5_rate: number | null
  star_low_count: number
  response_rate: number | null
}
type StoreObservation = {
  key: string
  label: string
  evidence: string
  tone: 'positive' | 'neutral' | 'attention'
}
type StoreCommentElement = { element: string; count: number; category: string }
type StoreNarratives = {
  strength: string
  change?: string | null
  room?: string | null
  mirror: string
}
type StoreAnalysis = {
  id: number
  store_id: number
  metrics: StoreMetrics
  comment_elements: StoreCommentElement[]
  narratives: StoreNarratives
  observations: StoreObservation[]
  previous_metrics?: StoreMetrics | null
  previous_generated_at?: string | null
  review_count: number
  generated_at: string
}

function fmtYen(v: number | null | undefined): string {
  if (v == null) return '—'
  return '¥' + Math.round(v).toLocaleString('ja-JP')
}
function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${Math.round(v * 100)}%`
}
function fmtDiffYen(cur: number, prev: number | null | undefined): string | null {
  if (prev == null || prev === 0) return null
  const d = cur - prev
  const sign = d >= 0 ? '+' : ''
  return `${sign}${d.toLocaleString('ja-JP')}円`
}
function fmtDiffPct(cur: number | null, prev: number | null): string | null {
  if (cur == null || prev == null) return null
  const d = Math.round((cur - prev) * 100)
  const sign = d >= 0 ? '+' : ''
  return `${sign}${d}pt`
}
function fmtDiffCount(cur: number, prev: number, suffix: string): string | null {
  const d = cur - prev
  if (d === 0) return null
  const sign = d >= 0 ? '+' : ''
  return `${sign}${d}${suffix}`
}

function WeeklyInsightMetric({ label, value, diff }: { label: string; value: string; diff?: string | null }) {
  return (
    <div style={{
      background: surface, border: `1px solid ${border}`, borderRadius: 4,
      padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 9, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const }}>{label}</span>
      <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 20, color: text, lineHeight: 1 }}>{value}</span>
      {diff && <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 10, color: muted }}>前週比 {diff}</span>}
    </div>
  )
}

function WeeklyInsightBlock({
  storeId, storeName, canGenerate,
}: {
  storeId: number | null
  storeName: string
  canGenerate: boolean
}) {
  const [analysis, setAnalysis] = useState<StoreAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (storeId == null) { setLoading(false); return }
    setLoading(true)
    apiFetch<StoreAnalysis | null>(`/api/v1/stores/${storeId}/analysis`)
      .then(r => setAnalysis(r ?? null))
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false))
  }, [storeId])

  const onGenerate = async () => {
    if (storeId == null || generating) return
    setGenerating(true)
    setErr(null)
    try {
      const r = await apiFetch<StoreAnalysis>(`/api/v1/stores/${storeId}/analysis`, { method: 'POST' })
      setAnalysis(r)
    } catch (e) {
      setErr((e as Error).message || '生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <EmptyBlock message="読み込み中..." />
  }
  if (storeId == null) {
    return <EmptyBlock message="店舗が登録されていません。" />
  }
  if (!analysis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EmptyBlock message={`「${storeName}」の週次インサイトはまだ生成されていません。`} />
        {canGenerate && (
          <button
            onClick={onGenerate}
            disabled={generating}
            style={{
              background: 'var(--accent-dim)', color: gold,
              border: `1px solid var(--accent-border)`,
              borderRadius: 4, padding: '10px 14px',
              fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.15em',
              cursor: generating ? 'wait' : 'pointer',
            }}>
            {generating ? '生成中...' : 'AI で今週のインサイトを生成'}
          </button>
        )}
        {err && <div style={{ color: '#d68585', fontSize: 12, fontFamily: zen }}>{err}</div>}
      </div>
    )
  }

  const m = analysis.metrics
  const p = analysis.previous_metrics
  const toneColor = (t: string) => t === 'positive' ? green : t === 'attention' ? '#dbb98b' : muted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <WeeklyInsightMetric label="総売上" value={fmtYen(m.total_sales)} diff={p ? fmtDiffYen(m.total_sales, p.total_sales) : null} />
        <WeeklyInsightMetric label="客単価" value={fmtYen(m.average_per_client)} diff={p && p.average_per_client != null && m.average_per_client != null ? fmtDiffYen(Math.round(m.average_per_client), Math.round(p.average_per_client)) : null} />
        <WeeklyInsightMetric label="客数" value={m.client_count + '名'} diff={p ? fmtDiffCount(m.client_count, p.client_count, '名') : null} />
        <WeeklyInsightMetric label="口コミ" value={m.review_count + '件'} diff={p ? fmtDiffCount(m.review_count, p.review_count, '件') : null} />
        <WeeklyInsightMetric label="仕上がり★5率" value={fmtPct(m.finish_star5_rate)} diff={p ? fmtDiffPct(m.finish_star5_rate, p.finish_star5_rate) : null} />
        <WeeklyInsightMetric label="接客★5率" value={fmtPct(m.service_star5_rate)} diff={p ? fmtDiffPct(m.service_star5_rate, p.service_star5_rate) : null} />
      </div>

      {analysis.narratives.strength && (
        <div style={{
          background: surface, border: `1px solid ${border}`, borderLeft: `3px solid ${gold}`,
          borderRadius: 4, padding: '14px 16px',
        }}>
          <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', color: muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>STRENGTH</div>
          <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 13, color: text, lineHeight: 1.7 }}>{analysis.narratives.strength}</div>
        </div>
      )}

      {analysis.narratives.change && (
        <div style={{
          background: surface, border: `1px solid ${border}`, borderLeft: `3px solid ${green}`,
          borderRadius: 4, padding: '14px 16px',
        }}>
          <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', color: muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>CHANGE</div>
          <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 13, color: text, lineHeight: 1.7 }}>{analysis.narratives.change}</div>
        </div>
      )}

      {analysis.observations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', color: muted, textTransform: 'uppercase' as const }}>OBSERVATIONS</div>
          {analysis.observations.map((o, i) => (
            <div key={i} style={{
              background: surface, border: `1px solid ${border}`, borderLeft: `3px solid ${toneColor(o.tone)}`,
              borderRadius: 4, padding: '10px 14px',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 12, color: text, lineHeight: 1.5 }}>{o.label}</div>
              <div style={{ fontFamily: zen, fontWeight: 300, fontSize: 11, color: muted, lineHeight: 1.5 }}>{o.evidence}</div>
            </div>
          ))}
        </div>
      )}

      {analysis.comment_elements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', color: muted, textTransform: 'uppercase' as const }}>ELEMENTS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {analysis.comment_elements.slice(0, 8).map((e, i) => (
              <span key={i} style={{
                background: 'var(--accent-dim)', color: gold,
                border: `1px solid var(--accent-border)`,
                borderRadius: 2, padding: '3px 8px',
                fontFamily: zen, fontWeight: 300, fontSize: 11,
              }}>
                {e.element}（{e.count}）
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.narratives.mirror && (
        <div style={{ fontFamily: zen, fontWeight: 300, fontSize: 11, color: muted, lineHeight: 1.6, padding: '4px 4px 0' }}>
          {analysis.narratives.mirror}
        </div>
      )}

      {canGenerate && (
        <button
          onClick={onGenerate}
          disabled={generating}
          style={{
            background: 'transparent', color: muted,
            border: `1px solid ${border}`,
            borderRadius: 4, padding: '8px 12px',
            fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.15em',
            cursor: generating ? 'wait' : 'pointer',
            alignSelf: 'flex-end' as const,
          }}>
          {generating ? '更新中...' : 'AI で再生成'}
        </button>
      )}
      {err && <div style={{ color: '#d68585', fontSize: 12, fontFamily: zen }}>{err}</div>}
    </div>
  )
}

// ─── ページ本体 ──────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const salonName = getSalonName()
  const claims = getClaims()
  const [showNotif, setShowNotif] = useState(false)
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null)
  const [myInitial, setMyInitial] = useState<string>('')

  const [thisWeekSales, setThisWeekSales] = useState<DailySales[]>([])
  const [lastWeekSales, setLastWeekSales] = useState<DailySales[]>([])
  const [reviews, setReviews] = useState<ReviewDetail[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)

  const now = new Date()
  const thisWeekStart = startOfWeek(now)
  const thisWeekEnd   = addDays(thisWeekStart, 6)
  const lastWeekStart = addDays(thisWeekStart, -7)
  const lastWeekEnd   = addDays(thisWeekStart, -1)
  const weekLabel     = jpDateRange(thisWeekStart, thisWeekEnd)

  useEffect(() => {
    apiFetch<Staff[]>('/api/v1/staffs')
      .then(list => {
        const me = (Array.isArray(list) ? list : []).find(s => s.id === claims?.staff_id)
        setMyAvatarUrl(me?.avatar_url ?? null)
        setMyInitial(me?.name?.slice(0, 1) ?? '')
      })
      .catch(() => {})
  }, [claims?.staff_id])

  useEffect(() => {
    // 口コミ（全期間、直近200件）
    apiFetch<ReviewDetail[] | null>('/api/v1/reviews?limit=200')
      .then(list => setReviews(Array.isArray(list) ? list : []))
      .catch(() => setReviews([]))

    // 売上（今週・先週）— 全店舗合算
    apiFetch<Store[]>('/api/v1/stores')
      .then(list => {
        const arr = Array.isArray(list) ? list : []
        setStores(arr)
        if (arr.length > 0 && selectedStoreId == null) setSelectedStoreId(arr[0].id)
        if (arr.length === 0) return
        const thisFrom = toDateStr(thisWeekStart)
        const thisTo   = toDateStr(thisWeekEnd)
        const lastFrom = toDateStr(lastWeekStart)
        const lastTo   = toDateStr(lastWeekEnd)
        Promise.all(arr.map(s =>
          apiFetch<DailySales[]>(`/api/v1/sales/store?store_id=${s.id}&from=${thisFrom}&to=${thisTo}`).catch(() => [] as DailySales[])
        )).then(all => setThisWeekSales(all.flat()))
        Promise.all(arr.map(s =>
          apiFetch<DailySales[]>(`/api/v1/sales/store?store_id=${s.id}&from=${lastFrom}&to=${lastTo}`).catch(() => [] as DailySales[])
        )).then(all => setLastWeekSales(all.flat()))
      })
      .catch(() => {})
  }, [])

  const health       = useMemo(() => buildHealth(thisWeekSales, lastWeekSales, reviews),        [thisWeekSales, lastWeekSales, reviews])
  const focusStaffs  = useMemo(() => buildFocusStaffs(reviews),                                  [reviews])

  return (
    <div style={{ padding: '14px 20px 32px' }}>

      {/* グリーティング */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 3 }}>おはようございます</div>
          <div style={{ fontSize: 17, fontWeight: 400, color: text, fontFamily: zen }}>{salonName}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div onClick={() => setShowNotif(true)} style={{
            width: 34, height: 34, borderRadius: '50%',
            background: surface, border: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1C8 1 5 3 5 7V10L4 11V12H12V11L11 10V7C11 3 8 1 8 1Z" stroke={text} strokeWidth="1" fill="none"/>
              <path d="M6.5 12C6.5 12.8 7.2 13.5 8 13.5C8.8 13.5 9.5 12.8 9.5 12" stroke={text} strokeWidth="1" fill="none"/>
            </svg>
          </div>
          <div onClick={() => navigate('/settings')} style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--accent-dim)', border: '1px solid rgba(200,168,130,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: josefin, fontWeight: 100, fontSize: 14, color: gold, cursor: 'pointer',
            overflow: 'hidden',
          }}>
            {myAvatarUrl
              ? <img src={myAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (myInitial || 'S')}
          </div>
        </div>
      </div>

      {/* 店舗ヘルス */}
      <SectionLabel label="Health" sub={weekLabel} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {health.map(h => <HealthCard key={h.key} item={h} onClick={() => navigate(h.dest)} />)}
      </div>

      {/* 要注目スタッフ */}
      <SectionLabel label="Focus Staff" sub="今週のハイライト" />
      {focusStaffs.length === 0 ? (
        <EmptyBlock message="口コミが集まると、注目すべきスタッフをAIが自動で抽出します。" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {focusStaffs.map(s => <StaffFocusCard key={s.id} s={s} onClick={() => navigate('/reviews')} />)}
        </div>
      )}

      {/* 今週のインサイト */}
      <SectionLabel label="Weekly Insight" sub={stores.length > 1 && selectedStoreId != null ? (stores.find(s => s.id === selectedStoreId)?.name ?? '') : weekLabel} />
      {stores.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 10 }}>
          {stores.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStoreId(s.id)}
              style={{
                background: s.id === selectedStoreId ? 'var(--accent-dim)' : 'transparent',
                color: s.id === selectedStoreId ? gold : muted,
                border: `1px solid ${s.id === selectedStoreId ? 'var(--accent-border)' : border}`,
                borderRadius: 2, padding: '4px 10px',
                fontFamily: zen, fontWeight: 300, fontSize: 11,
                cursor: 'pointer',
              }}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      <WeeklyInsightBlock
        storeId={selectedStoreId}
        storeName={stores.find(s => s.id === selectedStoreId)?.name ?? ''}
        canGenerate={true}
      />

      {/* 通知パネル（簡易） */}
      {showNotif && (
        <div onClick={() => setShowNotif(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', background: 'var(--bg)',
            borderRadius: '16px 16px 0 0', padding: '24px 20px 36px',
            borderTop: `1px solid ${border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.18em', color: text }}>NOTIFICATIONS</span>
              <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: josefin, fontSize: 12, color: muted, letterSpacing: '0.1em' }}>CLOSE</button>
            </div>
            <div style={{ fontFamily: zen, fontWeight: 300, fontSize: 13, color: muted, lineHeight: 1.8 }}>
              新しい通知はありません
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
