import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { apiFetch } from '../lib/api'
import type { Staff } from '../types'

const josefin    = "'Josefin Sans', sans-serif"
const zen        = "'Zen Kaku Gothic New', sans-serif"
const gold       = '#c8a882'
const goldDim    = 'rgba(200,168,130,0.12)'
const goldBorder = 'rgba(200,168,130,0.2)'
const muted      = 'rgba(232,228,220,0.55)'
const border     = 'rgba(232,228,220,0.08)'
const surface    = '#211f1d'
const txt        = '#e8e4dc'
const green      = '#6dba8e'
const alertColor = '#e07060'

const BASE_PRICE       = 9800
const PER_STAFF_PRICE  = 980

const OrbitSVG = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ flexShrink: 0 }}>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke={gold} strokeWidth="6" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="6" opacity="0.5"/>
  </svg>
)

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: muted, padding: '0 4px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
      <OrbitSVG size={10} /> {children}
    </div>
  )
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
      {children}
    </div>
  )
}

function Row({ label, value, onClick, last }: { label: string; value: React.ReactNode; onClick?: () => void; last?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: last ? 'none' : `1px solid ${border}`, cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ fontSize: 13, color: txt, fontFamily: zen }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 12, color: muted, fontFamily: zen, textAlign: 'right' as const }}>{value}</div>
        {onClick && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <polyline points="6,4 10,8 6,12" stroke={muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  )
}

// ─── 解約確認モーダル ──────────────────────────────────────────────────────────
function CancelModal({ onClose }: { onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 480, background: '#1a1816', borderTop: `1px solid ${goldBorder}`, borderRadius: '16px 16px 0 0', padding: '20px 20px 48px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 3, background: 'rgba(232,228,220,0.15)', borderRadius: 2, margin: '0 auto 24px' }}/>

        <div style={{ fontSize: 16, fontWeight: 400, color: txt, fontFamily: zen, marginBottom: 8 }}>解約の確認</div>
        <div style={{ fontSize: 13, color: muted, fontFamily: zen, lineHeight: 1.9, marginBottom: 20 }}>
          解約すると当月末でサービスの利用が終了します。<br/>
          在庫データ・売上データは30日間保持されます。
        </div>

        <div style={{ padding: '12px 14px', background: 'rgba(224,112,96,0.08)', border: '1px solid rgba(224,112,96,0.2)', borderRadius: 2, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: alertColor, lineHeight: 1.8, fontFamily: zen }}>
            解約後の再登録時、データは復元されません。
          </div>
        </div>

        <button
          onClick={() => { setConfirmed(true); setTimeout(onClose, 1500) }}
          disabled={confirmed}
          style={{ width: '100%', padding: 14, background: 'transparent', border: '1px solid rgba(224,112,96,0.4)', borderRadius: 2, fontFamily: zen, fontSize: 13, color: confirmed ? muted : alertColor, cursor: confirmed ? 'default' : 'pointer', marginBottom: 8 }}
        >
          {confirmed ? '解約申請を受け付けました' : '解約を申請する'}
        </button>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: 14, background: gold, border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 13, color: '#1a1816', cursor: 'pointer' }}
        >
          キャンセル（解約しない）
        </button>
      </div>
    </div>
  )
}

// ─── 支払い方法変更モーダル ────────────────────────────────────────────────────
function PaymentModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 480, background: '#1a1816', borderTop: `1px solid ${goldBorder}`, borderRadius: '16px 16px 0 0', padding: '20px 20px 48px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 3, background: 'rgba(232,228,220,0.15)', borderRadius: 2, margin: '0 auto 24px' }}/>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, color: txt, marginBottom: 20 }}>支払い方法の変更</div>

        <div style={{ padding: '14px 16px', background: surface, border: `1px solid ${border}`, borderRadius: 2, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 24, background: '#1a1f7a', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: josefin, fontWeight: 700, fontSize: 9, color: 'white', letterSpacing: '0.05em' }}>VISA</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: txt, fontFamily: zen }}>Visa **** 4242</div>
              <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>有効期限 12/28</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <polyline points="2.5,7 5.5,10.5 11.5,3.5" stroke={green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <button
          onClick={() => window.alert('カード変更はStripe Billing Portalと接続後に対応予定です')}
          style={{ width: '100%', padding: 14, background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: 2, fontFamily: zen, fontSize: 13, color: gold, cursor: 'pointer', marginBottom: 8 }}
        >
          新しいカードを追加する
        </button>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: 12, background: 'transparent', border: 'none', fontFamily: zen, fontSize: 12, color: muted, cursor: 'pointer' }}
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

// ─── メインページ ──────────────────────────────────────────────────────────────
export default function PlanPage() {
  const navigate = useNavigate()
  const [staffCount,    setStaffCount]    = useState(5)
  const [contractCount, setContractCount] = useState(5)
  const [cancelOpen,    setCancelOpen]    = useState(false)
  const [paymentOpen,   setPaymentOpen]   = useState(false)
  const [changed,       setChanged]       = useState(false)

  useEffect(() => {
    apiFetch<Staff[]>('/api/v1/staffs')
      .then(list => {
        const n = Array.isArray(list) ? list.filter(s => s.is_active).length : 5
        setStaffCount(n)
        setContractCount(n)
      })
      .catch(() => {})
  }, [])

  const total       = BASE_PRICE + PER_STAFF_PRICE * contractCount
  const currentTotal = BASE_PRICE + PER_STAFF_PRICE * staffCount

  function changeContract(delta: number) {
    setContractCount(c => {
      const next = c + delta
      if (next < staffCount) return c
      return Math.max(1, next)
    })
    setChanged(true)
  }

  function applyChange() {
    setStaffCount(contractCount)
    setChanged(false)
    window.alert(`契約スタッフ数を ${contractCount}名 に変更しました`)
  }

  // 次回請求日（今月末 + 1日）
  const now      = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 21)
  const nextBilling = `${nextMonth.getFullYear()}年${nextMonth.getMonth() + 1}月${nextMonth.getDate()}日`

  return (
    <>
    <AppLayout>
      {/* ヘッダー */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <polyline points="13,4 7,10 13,16" stroke={txt} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ fontSize: 17, fontWeight: 400, color: txt, fontFamily: zen }}>プラン・契約管理</div>
      </div>

      <div style={{ padding: '16px 20px 80px' }}>

        {/* Current Plan */}
        <GroupLabel>Current Plan</GroupLabel>
        <div style={{ background: surface, border: `1px solid ${goldBorder}`, borderRadius: 2, padding: 20, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${gold}, transparent)` }}/>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold, marginBottom: 6 }}>スタンダードプラン</div>
              <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>初月無料期間中</div>
            </div>
            <div style={{ background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: 2, padding: '4px 10px' }}>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 9, letterSpacing: '0.12em', color: gold }}>無料</div>
            </div>
          </div>

          {/* 料金内訳 */}
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
              <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>基本料金</div>
              <div style={{ fontSize: 13, color: txt, fontFamily: zen }}>¥{BASE_PRICE.toLocaleString()} / 月</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
              <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>スタッフ料金</div>
              <div style={{ fontSize: 13, color: txt, fontFamily: zen }}>¥{PER_STAFF_PRICE.toLocaleString()} × {staffCount}名 = ¥{(PER_STAFF_PRICE * staffCount).toLocaleString()} / 月</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ fontSize: 14, fontWeight: 400, color: txt, fontFamily: zen }}>合計</div>
              <div>
                <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 22, color: txt }}>¥{currentTotal.toLocaleString()}</span>
                <span style={{ fontSize: 12, color: muted, fontFamily: zen }}> / 月</span>
              </div>
            </div>
          </div>

          {/* 自動更新案内 */}
          <div style={{ background: 'rgba(200,168,130,0.06)', border: `1px solid ${goldBorder}`, borderRadius: 2, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: muted, fontFamily: zen, lineHeight: 1.8 }}>
              <span style={{ color: gold }}>●</span>　初月無料期間終了後、自動的に有料プランへ移行されます。<br/>
              解約しない限り毎月自動で更新されます。
            </div>
          </div>
        </div>

        {/* Next Billing */}
        <GroupLabel>Next Billing</GroupLabel>
        <SettingGroup>
          <Row label="次回請求日" value={nextBilling} />
          <Row label="請求金額" value={`¥${currentTotal.toLocaleString()}（税込）`} />
          <Row
            label="支払い方法"
            value="Visa **** 4242"
            onClick={() => setPaymentOpen(true)}
            last
          />
        </SettingGroup>

        {/* Plan Settings */}
        <GroupLabel>Plan Settings</GroupLabel>
        <SettingGroup>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}` }}>
            <div>
              <div style={{ fontSize: 13, color: txt, fontFamily: zen, marginBottom: 2 }}>契約スタッフ数</div>
              <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>有効スタッフ {staffCount}名（最小値）</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => changeContract(-1)}
                disabled={contractCount <= staffCount}
                style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${border}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: contractCount <= staffCount ? 'default' : 'pointer', color: contractCount <= staffCount ? 'rgba(232,228,220,0.2)' : muted, fontSize: 18, lineHeight: 1, flexShrink: 0 }}
              >
                −
              </button>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 20, color: txt, minWidth: 24, textAlign: 'center' as const }}>
                {contractCount}
              </div>
              <button
                onClick={() => changeContract(1)}
                style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${goldBorder}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: gold, fontSize: 18, lineHeight: 1, flexShrink: 0 }}
              >
                +
              </button>
            </div>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: muted, fontFamily: zen }}>変更後の月額</div>
              <div>
                <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 20, color: changed ? gold : txt }}>¥{total.toLocaleString()}</span>
                <span style={{ fontSize: 11, color: muted, fontFamily: zen }}> / 月</span>
              </div>
            </div>
            <button
              onClick={applyChange}
              disabled={!changed}
              style={{ width: '100%', padding: 12, background: changed ? gold : 'rgba(200,168,130,0.3)', border: 'none', borderRadius: 2, fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: changed ? '#1a1816' : 'rgba(26,24,22,0.5)', cursor: changed ? 'pointer' : 'default' }}
            >
              プランを変更する
            </button>
          </div>
        </SettingGroup>

        {/* Billing History */}
        <GroupLabel>Billing History</GroupLabel>
        <SettingGroup>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${border}` }}>
            <div>
              <div style={{ fontSize: 13, color: txt, fontFamily: zen, marginBottom: 2 }}>
                {now.getFullYear()}年{now.getMonth() + 1}月
              </div>
              <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>初月無料</div>
            </div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, color: green }}>¥0</div>
          </div>
          <div style={{ padding: '12px 16px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>請求履歴はここに表示されます</div>
          </div>
        </SettingGroup>

        {/* 解約 */}
        <div style={{ textAlign: 'center' as const, padding: '8px 0 16px' }}>
          <button
            onClick={() => setCancelOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(232,228,220,0.25)', textDecoration: 'underline', fontFamily: zen }}
          >
            解約する
          </button>
        </div>

      </div>
    </AppLayout>

    {cancelOpen  && <CancelModal  onClose={() => setCancelOpen(false)}  />}
    {paymentOpen && <PaymentModal onClose={() => setPaymentOpen(false)} />}
    </>
  )
}
