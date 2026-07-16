import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import ReviewImportSheet from './ReviewImportSheet'
import StaffAiAnalysis from './StaffAiAnalysis'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = 'var(--accent)'
const text    = 'var(--text)'
const muted   = 'var(--text-muted)'
const border  = 'var(--border)'
const surface = 'var(--surface)'

const OrbitSVG = () => (
  <svg width="12" height="12" viewBox="0 0 80 80" fill="none">
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)" stroke={gold} strokeWidth="6" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="6" opacity="0.5"/>
  </svg>
)

type Review = {
  id: number
  store_id: number | null
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

type StaffSummary = {
  id: number
  name: string
  count: number
  overall: number
  finish: number
  service: number
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1,2,3,4,5].map(n => (
        <svg key={n} viewBox="0 0 24 24" width={size} height={size}
          fill={n <= Math.round(value) ? '#F59E0B' : 'none'}
          stroke={n <= Math.round(value) ? '#F59E0B' : 'rgba(232,228,220,0.2)'}
          strokeWidth="1.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ))}
    </div>
  )
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

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      background: surface, border: `1px solid ${border}`, borderRadius: 4,
      padding: '32px 20px', textAlign: 'center' as const,
    }}>
      <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 13, color: muted, margin: 0, lineHeight: 1.7 }}>
        {message}
      </p>
    </div>
  )
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [filter, setFilter]         = useState<number | 'all'>('all')
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importToast, setImportToast] = useState<string | null>(null)

  function loadReviews() {
    apiFetch<Review[] | null>('/api/v1/reviews?limit=200')
      .then(list => setReviews(Array.isArray(list) ? list : []))
      .catch(() => { setReviews([]); setError('口コミの読み込みに失敗しました') })
  }

  useEffect(() => { loadReviews() }, [])

  const staffSummaries = useMemo<StaffSummary[]>(() => {
    if (!reviews) return []
    const map = new Map<number, { name: string; overall: number[]; finish: number[]; service: number[] }>()
    for (const r of reviews) {
      if (r.staff_id == null || r.staff_name == null) continue
      if (!map.has(r.staff_id)) {
        map.set(r.staff_id, { name: r.staff_name, overall: [], finish: [], service: [] })
      }
      const s = map.get(r.staff_id)!
      s.overall.push(r.rating_overall)
      s.finish.push(r.rating_finish)
      s.service.push(r.rating_service)
    }
    return Array.from(map.entries()).map(([id, s]) => ({
      id,
      name: s.name,
      count: s.overall.length,
      overall: avg(s.overall),
      finish:  avg(s.finish),
      service: avg(s.service),
    })).sort((a, b) => b.count - a.count)
  }, [reviews])

  const staff = selectedStaff != null ? staffSummaries.find(s => s.id === selectedStaff) : null
  const staffReviews = staff ? (reviews ?? []).filter(r => r.staff_id === staff.id) : []

  if (reviews === null) {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center' as const }}>
        <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', color: muted }}>LOADING…</span>
      </div>
    )
  }

  if (staff) {
    return (
      <div style={{ padding: '14px 20px 32px' }}>
        <button
          onClick={() => setSelectedStaff(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.12em',
            color: muted, marginBottom: 14,
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          スタッフ一覧に戻る
        </button>

        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 4, padding: '18px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-dim)', border: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: josefin, fontWeight: 100, fontSize: 20, color: gold,
          }}>{staff.name.slice(0, 1)}</div>
          <div>
            <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 16, color: text, marginBottom: 2 }}>{staff.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Stars value={staff.overall} size={13} />
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 13, color: text }}>{staff.overall}</span>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted }}>· {staff.count}件</span>
            </div>
          </div>
        </div>

        <SectionLabel label="Scores" />
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 4, padding: '14px 16px', marginBottom: 6 }}>
          {[
            { label: '総合',    value: staff.overall },
            { label: '仕上がり', value: staff.finish },
            { label: '接客',    value: staff.service },
          ].map((item, i) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 2 ? 12 : 0 }}>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, width: 60, flexShrink: 0 }}>{item.label}</span>
              <div style={{ flex: 1, height: 3, background: 'rgba(232,228,220,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(item.value / 5) * 100}%`, background: gold, borderRadius: 2 }} />
              </div>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 13, color: text, width: 32, textAlign: 'right' as const }}>{item.value}</span>
            </div>
          ))}
        </div>

        <StaffAiAnalysis staffId={staff.id} reviewCount={staffReviews.length} />

        <SectionLabel label="Comments" sub={`${staffReviews.length}件`} />
        {staffReviews.length === 0 ? (
          <EmptyState message="まだ口コミが集まっていません。" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
            {staffReviews.map(r => (
              <div key={r.id} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 4, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <Stars value={r.rating_overall} />
                  {r.menu_name && (
                    <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 11, color: gold, background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: 2 }}>{r.menu_name}</span>
                  )}
                  <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, letterSpacing: '0.05em', marginLeft: 'auto' as const }}>{fmtDate(r.created_at)}</span>
                </div>
                {r.comment && (
                  <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 13, color: text, margin: 0, lineHeight: 1.65 }}>{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const allOverall = reviews.length > 0 ? avg(reviews.map(r => r.rating_overall)) : 0
  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.staff_id === filter)

  if (reviews.length === 0) {
    return (
      <div style={{ padding: '14px 20px 32px' }}>
        <SectionLabel label="Reviews" />
        <EmptyState message={error ?? '口コミがまだ集まっていません。VOICEフォームを店頭に設置するか、Google 口コミを取り込んでスタートしましょう。'} />
        <button onClick={() => setShowImport(true)} style={{
          marginTop: 12, width: '100%', padding: 13,
          background: gold, border: 'none', borderRadius: 4,
          fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em',
          color: 'var(--on-accent)', textTransform: 'uppercase' as const, cursor: 'pointer',
        }}>Google 口コミを取り込む</button>
        {importToast && <div style={{ marginTop: 12, fontFamily: zen, fontSize: 12, color: gold, textAlign: 'center' as const }}>{importToast}</div>}
        {showImport && (
          <ReviewImportSheet
            onClose={() => setShowImport(false)}
            onSaved={(n) => { setShowImport(false); setImportToast(`${n} 件を取り込みました`); setTimeout(() => setImportToast(null), 3000); loadReviews() }}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 20px 32px' }}>
      {/* header KPI */}
      <div style={{
        background: surface, border: `1px solid ${border}`, borderRadius: 4,
        padding: '18px 18px', marginBottom: 18,
      }}>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.18em', color: muted, textTransform: 'uppercase' as const, marginBottom: 10 }}>
          口コミ全体
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 32, color: text, lineHeight: 1 }}>{allOverall}</div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: muted, letterSpacing: '0.15em', marginTop: 4 }}>AVG</div>
          </div>
          <div style={{ height: 28, width: 1, background: border }} />
          <div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 32, color: text, lineHeight: 1 }}>{reviews.length}</div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: muted, letterSpacing: '0.15em', marginTop: 4 }}>COUNT</div>
          </div>
          <button onClick={() => setShowImport(true)} style={{
            marginLeft: 'auto' as const, padding: '8px 12px',
            background: 'transparent', border: `1px solid ${gold}`, borderRadius: 3,
            fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.12em',
            color: gold, textTransform: 'uppercase' as const, cursor: 'pointer',
          }}>+ Import</button>
        </div>
        {importToast && <div style={{ marginTop: 10, fontFamily: zen, fontSize: 12, color: gold }}>{importToast}</div>}
      </div>

      {showImport && (
        <ReviewImportSheet
          onClose={() => setShowImport(false)}
          onSaved={(n) => { setShowImport(false); setImportToast(`${n} 件を取り込みました`); setTimeout(() => setImportToast(null), 3000); loadReviews() }}
        />
      )}

      {/* staff cards */}
      {staffSummaries.length > 0 && (
        <>
          <SectionLabel label="Staff" sub="タップで詳細" />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 8 }}>
            {staffSummaries.map(s => (
              <div key={s.id} onClick={() => setSelectedStaff(s.id)} style={{
                background: surface, border: `1px solid ${border}`, borderRadius: 4,
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-dim)', border: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: josefin, fontWeight: 100, fontSize: 14, color: gold,
                }}>{s.name.slice(0, 1)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 14, color: text, marginBottom: 2 }}>{s.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stars value={s.overall} />
                    <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted }}>{s.overall} · {s.count}件</span>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={muted} strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionLabel label="Recent" sub="最新の口コミ" />
      {staffSummaries.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 4 }}>
          <button onClick={() => setFilter('all')} style={{
            padding: '6px 12px', flexShrink: 0,
            background: filter === 'all' ? gold : 'transparent',
            border: `1px solid ${filter === 'all' ? gold : border}`,
            borderRadius: 2,
            fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.1em',
            color: filter === 'all' ? 'var(--on-accent)' : muted, cursor: 'pointer',
            whiteSpace: 'nowrap' as const,
          }}>全員</button>
          {staffSummaries.map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)} style={{
              padding: '6px 12px', flexShrink: 0,
              background: filter === s.id ? gold : 'transparent',
              border: `1px solid ${filter === s.id ? gold : border}`,
              borderRadius: 2,
              fontFamily: zen, fontWeight: 300, fontSize: 12,
              color: filter === s.id ? 'var(--on-accent)' : muted, cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
            }}>{s.name}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
        {filtered.map(r => (
          <div key={r.id} style={{
            background: surface, border: `1px solid ${border}`, borderLeft: `3px solid ${gold}`,
            borderRadius: 4, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {r.staff_name && <span style={{ fontFamily: zen, fontWeight: 400, fontSize: 13, color: text }}>{r.staff_name}</span>}
                <Stars value={r.rating_overall} />
                {r.menu_name && <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 11, color: gold, background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: 2 }}>{r.menu_name}</span>}
              </div>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: muted, letterSpacing: '0.05em' }}>{fmtDate(r.created_at)}</span>
            </div>
            {r.comment && (
              <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 13, color: text, margin: 0, lineHeight: 1.65 }}>{r.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
