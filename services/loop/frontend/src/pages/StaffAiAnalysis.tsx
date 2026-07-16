import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = 'var(--accent)'
const text    = 'var(--text)'
const muted   = 'var(--text-muted)'
const border  = 'var(--border)'
const surface = 'var(--surface)'
const green   = '#6dba8e'
const softRed = '#e07060'

const OrbitSVG = () => (
  <svg width="12" height="12" viewBox="0 0 80 80" fill="none">
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)" stroke={gold} strokeWidth="6" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="6" opacity="0.5"/>
  </svg>
)

type Metrics = {
  review_count: number
  accounting_count: number
  finish_star5_rate: number | null
  service_star5_rate: number | null
  star_low_count: number
  nomination_ratio: number | null
  response_rate: number | null
}
type CommentElement = { element: string; count: number; category: string }
type Narratives = { strength: string; change: string | null; room: string | null; mirror: string }
type Observation = { key: string; label: string; evidence: string; tone: 'positive' | 'neutral' | 'attention' | string }

type Analysis = {
  id: number
  staff_id: number
  metrics: Metrics
  comment_elements: CommentElement[]
  narratives: Narratives
  observations: Observation[]
  previous_metrics?: Metrics | null
  previous_generated_at?: string | null
  review_count: number
  generated_at: string
}

function categoryColor(cat: string): string {
  switch (cat) {
    case 'skill':    return green
    case 'service':  return gold
    case 'result':   return '#dbb98b'
    case 'negative': return softRed
    default:         return muted
  }
}

function pct(v: number | null): string {
  if (v == null) return '—'
  return `${Math.round(v * 100)}%`
}

export default function StaffAiAnalysis({ staffId, reviewCount }: { staffId: number; reviewCount: number }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api(`/api/v1/staffs/${staffId}/analysis`)
      .then(async res => {
        if (res.status === 204) setAnalysis(null)
        else if (res.ok) setAnalysis(await res.json())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [staffId])

  async function generate() {
    setError(null)
    setGenerating(true)
    try {
      const res = await api(`/api/v1/staffs/${staffId}/analysis`, { method: 'POST' })
      if (!res.ok) {
        if (res.status === 500) {
          const body = await res.text().catch(() => '')
          if (body.includes('not enough reviews')) throw new Error('口コミがまだ少ないため分析できません（3件以上必要）')
        }
        throw new Error(`HTTP ${res.status}`)
      }
      setAnalysis(await res.json() as Analysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const canGenerate = reviewCount >= 3
  const isStale = analysis != null && analysis.review_count < reviewCount

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '24px 0 12px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <OrbitSVG />
          <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: text }}>Insight</span>
          {analysis && (
            <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 11, color: muted }}>· {analysis.review_count}件の口コミから観測</span>
          )}
        </div>
        {analysis && canGenerate && (
          <button
            onClick={generate}
            disabled={generating}
            style={{
              background: 'transparent', border: `1px solid ${gold}`, borderRadius: 3,
              padding: '4px 10px', fontFamily: josefin, fontWeight: 100, fontSize: 10,
              letterSpacing: '0.12em', color: gold, cursor: generating ? 'default' : 'pointer',
              textTransform: 'uppercase' as const, opacity: generating ? 0.5 : 1,
            }}
          >{generating ? 'Analyzing…' : '再観測'}</button>
        )}
      </div>

      {loading && (
        <div style={{ background: surface, border: `1px dashed ${border}`, borderRadius: 4, padding: '20px 18px', textAlign: 'center' as const }}>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.2em', color: muted }}>LOADING…</span>
        </div>
      )}

      {!loading && !analysis && (
        <div style={{ background: surface, border: `1px dashed ${border}`, borderRadius: 4, padding: '20px 18px', textAlign: 'center' as const }}>
          <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted, lineHeight: 1.7, margin: '0 0 12px' }}>
            {canGenerate
              ? '集まった口コミから観測値を整理します。（この画面は「観測値」を出すもので、指図・改善指示は含みません）'
              : '観測には最低3件の口コミが必要です（現在 ' + reviewCount + ' 件）。'}
          </p>
          {canGenerate && (
            <button
              onClick={generate}
              disabled={generating}
              style={{
                padding: '9px 22px', background: gold, border: 'none', borderRadius: 4,
                fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em',
                color: 'var(--on-accent)', cursor: generating ? 'default' : 'pointer',
                textTransform: 'uppercase' as const, opacity: generating ? 0.6 : 1,
              }}
            >{generating ? 'Analyzing…' : '観測を実行'}</button>
          )}
          {error && <div style={{ marginTop: 10, fontFamily: zen, fontSize: 12, color: softRed }}>{error}</div>}
        </div>
      )}

      {!loading && analysis && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>

          {/* ─ 強み（narratives.strength） ─ */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderLeft: `3px solid ${green}`, borderRadius: 4, padding: '14px 16px' }}>
            <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.18em', color: green, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>STRENGTH</span>
              <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 10, color: muted, letterSpacing: '0.05em', textTransform: 'none' as const }}>· 今の強み</span>
            </div>
            <p style={{ fontFamily: zen, fontWeight: 400, fontSize: 13, color: text, lineHeight: 1.65, margin: 0 }}>{analysis.narratives.strength}</p>
          </div>

          {/* ─ 変化（narratives.change・前回比） ─ */}
          {analysis.previous_generated_at && (
            <div style={{
              background: surface, border: `1px solid ${border}`,
              borderLeft: `3px solid ${analysis.narratives.change ? gold : border}`,
              borderRadius: 4, padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' as const }}>
                <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.18em', color: analysis.narratives.change ? gold : muted }}>CHANGE</span>
                <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 10, color: muted }}>
                  · 前回からの変化 · {new Date(analysis.previous_generated_at).toLocaleDateString('ja-JP')} から
                </span>
              </div>
              <p style={{ fontFamily: zen, fontWeight: 400, fontSize: 13, color: analysis.narratives.change ? text : muted, lineHeight: 1.65, margin: 0 }}>
                {analysis.narratives.change ?? '新しいインサイトはありません。'}
              </p>
            </div>
          )}

          {/* ─ 観測数値 ─ */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.18em', color: muted, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>OBSERVED VALUES</span>
              <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 10, letterSpacing: '0.05em', textTransform: 'none' as const }}>· 観測された数値</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MetricCell label="仕上がり★5率" value={pct(analysis.metrics.finish_star5_rate)} />
              <MetricCell label="接客★5率" value={pct(analysis.metrics.service_star5_rate)} />
              <MetricCell label="口コミ件数" value={String(analysis.metrics.review_count) + '件'} />
              <MetricCell label="★1〜2件数" value={String(analysis.metrics.star_low_count) + '件'} alert={analysis.metrics.star_low_count > 0} />
              {analysis.metrics.nomination_ratio != null && <MetricCell label="指名比率" value={pct(analysis.metrics.nomination_ratio)} />}
              {analysis.metrics.response_rate != null    && <MetricCell label="回答率" value={pct(analysis.metrics.response_rate)} />}
            </div>
          </div>

          {/* ─ お客様の声で多い要素 ─ */}
          {analysis.comment_elements.length > 0 && (
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 4, padding: '12px 14px' }}>
              <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.18em', color: muted, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>VOICE ELEMENTS</span>
                <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 10, letterSpacing: '0.05em', textTransform: 'none' as const }}>· お客様の声に多い要素</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                {analysis.comment_elements.slice(0, 8).map((el, i) => {
                  const c = categoryColor(el.category)
                  const maxCount = analysis.comment_elements[0].count || 1
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: text, lineHeight: 1.4 }}>{el.element}</span>
                        <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: c, flexShrink: 0 }}>{el.count}件</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(el.count / maxCount) * 100}%`, background: c, borderRadius: 2 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─ 突き合わせ観測（会計×口コミ） ─ */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.18em', color: muted, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>OBSERVATIONS</span>
              <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 10, letterSpacing: '0.05em', textTransform: 'none' as const }}>· 会計×口コミの突き合わせ</span>
            </div>
            {analysis.observations && analysis.observations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {analysis.observations.map((o, i) => {
                  const c = o.tone === 'positive' ? green : o.tone === 'attention' ? softRed : gold
                  return (
                    <div key={i} style={{ borderLeft: `3px solid ${c}`, paddingLeft: 10 }}>
                      <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 13, color: text, lineHeight: 1.55 }}>{o.label}</div>
                      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, marginTop: 3, letterSpacing: '0.02em' }}>{o.evidence}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted, lineHeight: 1.7, margin: 0 }}>
                会計データと口コミデータが揃うと、メニューごとの偏りや強みが観測されます。今はまだ蓄積中です。
              </p>
            )}
          </div>

          {/* ─ 余地（room） ─ */}
          {analysis.narratives.room && (
            <div style={{ background: surface, border: `1px solid ${border}`, borderLeft: `3px solid ${gold}`, borderRadius: 4, padding: '14px 16px' }}>
              <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.18em', color: gold, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>ROOM</span>
                <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 10, color: muted, letterSpacing: '0.05em', textTransform: 'none' as const }}>· 伸びしろの余地</span>
              </div>
              <p style={{ fontFamily: zen, fontWeight: 400, fontSize: 13, color: text, lineHeight: 1.65, margin: 0 }}>{analysis.narratives.room}</p>
            </div>
          )}

          {/* ─ 変化が映る鏡（mirror） ─ */}
          <div style={{ background: 'var(--accent-dim)', border: `1px dashed var(--accent-border)`, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.18em', color: gold, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>MIRROR</span>
              <span style={{ fontFamily: zen, fontWeight: 300, fontSize: 10, color: muted, letterSpacing: '0.05em', textTransform: 'none' as const }}>· 次に変化が見えるところ</span>
            </div>
            <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted, lineHeight: 1.65, margin: 0 }}>💡 {analysis.narratives.mirror}</p>
          </div>

          {isStale && (
            <div style={{ background: 'rgba(200,168,130,0.08)', border: `1px solid var(--accent-border)`, borderRadius: 4, padding: '8px 12px', fontFamily: zen, fontSize: 11, color: gold, lineHeight: 1.5 }}>
              新しい口コミが追加されています。再観測で最新化できます。
            </div>
          )}

          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: muted, letterSpacing: '0.05em', textAlign: 'right' as const, marginTop: 2 }}>
            観測日時: {new Date(analysis.generated_at).toLocaleString('ja-JP')}
          </div>
        </div>
      )}

      {error && analysis && (
        <div style={{ marginTop: 8, fontFamily: zen, fontSize: 12, color: softRed }}>{error}</div>
      )}
    </>
  )
}

function MetricCell({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 20, color: alert ? softRed : text, lineHeight: 1 }}>{value}</div>
    </div>
  )
}
