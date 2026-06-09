import { useEffect, useState } from 'react'
import { adminFetch } from '../lib/api'

const gold    = '#c8a882'
const muted   = 'rgba(232,228,220,0.55)'
const border  = 'rgba(232,228,220,0.08)'
const green   = '#6dba8e'
const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"

const JPY_RATE = 147

type Stats = {
  salon_count:      number
  staff_count:      number
  active_sub_count: number
  monthly_sales:    number
}

type ServiceItem = { service: string; amount: string }

type AWSCost = {
  status: 'ok' | 'unavailable'
  amount?: string
  unit?:   string
  period_start?: string
  period_end?:   string
  breakdown?: ServiceItem[]
  reason?: string
}

const SERVICE_LABELS: Record<string, string> = {
  'Amazon Elastic Container Service': 'ECS',
  'Amazon Relational Database Service': 'RDS',
  'Amazon CloudFront': 'CloudFront',
  'Amazon Route 53': 'Route 53',
  'Amazon Simple Storage Service': 'S3',
  'AWS Key Management Service': 'KMS',
  'Amazon EC2-Other': 'EC2 (other)',
  'Amazon Elastic Compute Cloud - Compute': 'EC2',
  'Amazon Virtual Private Cloud': 'VPC',
  'AWS Secrets Manager': 'Secrets Manager',
  'Amazon EC2 Container Registry (ECR)': 'ECR',
}

function fmt(n: number) {
  return n.toLocaleString('ja-JP')
}

function StatCard({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) {
  return (
    <div style={{ background: '#211f1d', border: `1px solid ${border}`, borderRadius: 8, padding: '20px 24px' }}>
      <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.15em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 28, fontFamily: josefin, fontWeight: 100, color: '#e8e4dc' }}>{value}</span>
        {unit && <span style={{ fontSize: 14, color: muted, fontFamily: zen }}>{unit}</span>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [cost, setCost]       = useState<AWSCost | null>(null)
  const [statsErr, setStatsErr] = useState('')

  useEffect(() => {
    adminFetch<Stats>('/admin/v1/stats')
      .then(setStats)
      .catch(() => setStatsErr('データ取得に失敗しました'))

    adminFetch<AWSCost>('/admin/v1/aws-cost')
      .then(setCost)
      .catch(() => setCost({ status: 'unavailable', reason: 'fetch error' }))
  }, [])

  const now = new Date()
  const dateLabel = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  // コスト表示値を計算
  function costDisplay(): { label: string; value: string; sub?: string } {
    if (!cost) return { label: '取得中...', value: '—' }
    if (cost.status !== 'ok' || !cost.amount) {
      return { label: 'データ準備中', value: '—' }
    }
    const usd = parseFloat(cost.amount)
    const jpy = Math.round(usd * JPY_RATE)
    const m = cost.period_start ? parseInt(cost.period_start.split('-')[1]) : now.getMonth() + 1
    return {
      label: `${m}月 実績`,
      value: `¥${fmt(jpy)}`,
      sub: `$${usd.toFixed(2)}`,
    }
  }

  const cd = costDisplay()

  return (
    <div style={{ padding: '24px 20px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.15em' }}>
          {dateLabel}
        </div>
        <div style={{ fontSize: 20, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.2em', color: gold, marginTop: 4 }}>
          OVERVIEW
        </div>
      </div>

      {statsErr && (
        <div style={{ padding: '12px 16px', background: 'rgba(224,112,96,0.1)', border: '1px solid rgba(224,112,96,0.3)', borderRadius: 6, fontSize: 14, color: '#e07060', fontFamily: zen, marginBottom: 20 }}>
          {statsErr}
        </div>
      )}

      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatCard label="SALONS / サロン数"      value={fmt(stats.salon_count)}      unit="件" />
          <StatCard label="STAFFS / スタッフ数"    value={fmt(stats.staff_count)}      unit="人" />
          <StatCard label="ACTIVE SUBS / 契約中"   value={fmt(stats.active_sub_count)} unit="件" />
          <StatCard label="MONTHLY SALES / 今月売上" value={`¥${fmt(stats.monthly_sales)}`} />
        </div>
      ) : !statsErr ? (
        <div style={{ color: muted, fontFamily: zen, fontSize: 14 }}>読み込み中...</div>
      ) : null}

      {/* AWS コストセクション */}
      <div style={{ marginTop: 20, padding: '20px 24px', background: '#211f1d', border: `1px solid ${border}`, borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.15em', marginBottom: 16 }}>
          AWS COST / AWSコスト
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 4 }}>{cd.label}</div>
            <div style={{ fontSize: 32, fontFamily: josefin, fontWeight: 100, color: '#e8e4dc', lineHeight: 1 }}>
              {cd.value}
            </div>
            {cd.sub && (
              <div style={{ fontSize: 12, color: muted, fontFamily: josefin, marginTop: 4 }}>{cd.sub} × ¥{JPY_RATE}</div>
            )}
          </div>

          {/* ECS稼働状況 */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 6 }}>ECS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: green }} />
              <span style={{ fontSize: 12, color: green, fontFamily: josefin, letterSpacing: '0.1em' }}>RUNNING</span>
            </div>
            <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginTop: 4 }}>loop-backend</div>
          </div>
        </div>

        {/* サービス別内訳 */}
        {cost?.status === 'ok' && cost.breakdown && cost.breakdown.length > 0 && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.12em', marginBottom: 10 }}>
              BREAKDOWN / 内訳
            </div>
            {cost.breakdown
              .filter(b => parseFloat(b.amount) > 0.001)
              .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
              .map(b => {
                const jpy = Math.round(parseFloat(b.amount) * JPY_RATE)
                const label = SERVICE_LABELS[b.service] ?? b.service
                return (
                  <div key={b.service} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                    <span style={{ fontSize: 12, color: muted, fontFamily: zen }}>{label}</span>
                    <span style={{ fontSize: 12, color: '#e8e4dc', fontFamily: josefin }}>¥{fmt(jpy)}</span>
                  </div>
                )
              })}
          </div>
        )}

        {cost?.status === 'unavailable' && (
          <div style={{ marginTop: 12, fontSize: 12, color: muted, fontFamily: zen }}>
            ※ Cost Explorer のデータ準備中（初回有効化後24時間）
          </div>
        )}
      </div>
    </div>
  )
}
