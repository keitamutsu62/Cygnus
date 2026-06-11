import { useEffect, useState } from 'react'
import { adminFetch } from '../lib/api'

const gold    = '#c8a882'
const muted   = 'rgba(232,228,220,0.55)'
const border  = 'rgba(232,228,220,0.08)'
const green   = '#6dba8e'
const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"

const JPY_RATE      = 155
const CLAUDE_MONTHLY = 100  // Claude Max $100/月
const PROJECT_START  = new Date('2026-05-01')

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
  cumulative_amount?: string
  project_start?: string
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

  // Claude累計月数（プロジェクト開始月から今月まで）
  function claudeMonthsElapsed(): number {
    const y = now.getFullYear() - PROJECT_START.getFullYear()
    const m = now.getMonth() - PROJECT_START.getMonth()
    return Math.max(1, y * 12 + m + 1)
  }

  // AWS累計（ドメイン代含む）
  const awsCumulativeUSD = cost?.status === 'ok' && cost.cumulative_amount
    ? parseFloat(cost.cumulative_amount)
    : null

  // Claude累計
  const claudeMonths      = claudeMonthsElapsed()
  const claudeCumulativeUSD = CLAUDE_MONTHLY * claudeMonths

  // 総累計
  const totalCumulativeUSD = awsCumulativeUSD !== null
    ? awsCumulativeUSD + claudeCumulativeUSD
    : null

  // 当月AWS
  const monthlyUSD = cost?.status === 'ok' && cost.amount
    ? parseFloat(cost.amount)
    : null
  const monthLabel = cost?.period_start
    ? `${parseInt(cost.period_start.split('-')[1])}月 AWS実績`
    : `${now.getMonth() + 1}月 AWS実績`

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

      {/* コストセクション */}
      <div style={{ marginTop: 20, padding: '20px 24px', background: '#211f1d', border: `1px solid ${border}`, borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.15em', marginBottom: 16 }}>
          PROJECT COST / プロジェクト累計コスト
        </div>

        {/* 累計合計（大きく表示） */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 6 }}>
            累計合計（AWS + Claude Max）
          </div>
          <div style={{ fontSize: 36, fontFamily: josefin, fontWeight: 100, color: '#e8e4dc', lineHeight: 1 }}>
            {totalCumulativeUSD !== null
              ? `¥${fmt(Math.round(totalCumulativeUSD * JPY_RATE))}`
              : '—'}
          </div>
          {totalCumulativeUSD !== null && (
            <div style={{ fontSize: 12, color: muted, fontFamily: josefin, marginTop: 5 }}>
              ${totalCumulativeUSD.toFixed(2)} × ¥{JPY_RATE}
            </div>
          )}
        </div>

        {/* 内訳行 */}
        <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* AWS累計 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#e8e4dc', fontFamily: zen }}>AWS累計</div>
              <div style={{ fontSize: 11, color: muted, fontFamily: josefin, marginTop: 2 }}>
                {cost?.project_start ?? '2026-05-01'} 〜 今日
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontFamily: josefin, color: '#e8e4dc' }}>
                {awsCumulativeUSD !== null ? `¥${fmt(Math.round(awsCumulativeUSD * JPY_RATE))}` : '—'}
              </div>
              {awsCumulativeUSD !== null && (
                <div style={{ fontSize: 11, color: muted, fontFamily: josefin }}>${awsCumulativeUSD.toFixed(2)}</div>
              )}
            </div>
          </div>

          {/* Claude累計 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#e8e4dc', fontFamily: zen }}>Claude Max累計</div>
              <div style={{ fontSize: 11, color: muted, fontFamily: josefin, marginTop: 2 }}>
                $100/月 × {claudeMonths}ヶ月
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontFamily: josefin, color: '#e8e4dc' }}>
                ¥{fmt(Math.round(claudeCumulativeUSD * JPY_RATE))}
              </div>
              <div style={{ fontSize: 11, color: muted, fontFamily: josefin }}>${claudeCumulativeUSD}</div>
            </div>
          </div>
        </div>

        {/* 当月AWS + ECS状態 */}
        <div style={{ marginTop: 16, borderTop: `1px solid ${border}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 4 }}>{monthLabel}</div>
            <div style={{ fontSize: 20, fontFamily: josefin, fontWeight: 100, color: '#e8e4dc' }}>
              {monthlyUSD !== null ? `¥${fmt(Math.round(monthlyUSD * JPY_RATE))}` : '—'}
            </div>
            {monthlyUSD !== null && (
              <div style={{ fontSize: 11, color: muted, fontFamily: josefin, marginTop: 3 }}>${monthlyUSD.toFixed(2)}</div>
            )}
          </div>
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
          <div style={{ marginTop: 14, borderTop: `1px solid ${border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.12em', marginBottom: 10 }}>
              AWS BREAKDOWN / 当月内訳
            </div>
            {cost.breakdown
              .filter(b => parseFloat(b.amount) > 0.001)
              .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
              .map(b => {
                const jpy = Math.round(parseFloat(b.amount) * JPY_RATE)
                const label = SERVICE_LABELS[b.service] ?? b.service
                return (
                  <div key={b.service} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
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

        <div style={{ marginTop: 14, fontSize: 11, color: muted, fontFamily: josefin, opacity: 0.6, lineHeight: 1.8 }}>
          ※ 為替レート ¥{JPY_RATE}/$ 固定。Claude費用は手動設定値。<br />
          ※ AWSコストは請求反映に1〜2日の遅延があります。
        </div>
      </div>
    </div>
  )
}
