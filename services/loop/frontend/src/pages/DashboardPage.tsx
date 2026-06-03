import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { api, apiFetch } from '../lib/api'
import { getClaims, getSalonName } from '../lib/auth'
import { businessDaysToClosing } from '../lib/businessDays'
import type { DailySales, StaffSalesSummary } from '../types'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const muted   = 'rgba(232,228,220,0.55)'
const border  = 'rgba(232,228,220,0.08)'
const gold    = '#c8a882'
const alertC  = '#e07060'
const green   = '#6dba8e'
const alertDim = 'rgba(224,112,96,0.1)'
const goldDim  = 'rgba(200,168,130,0.1)'

const DAYS_JP = ['日', '月', '火', '水', '木', '金', '土']
function fmt(n: number) { return n.toLocaleString('ja-JP') }
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function jpDate(d: Date) {
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${DAYS_JP[d.getDay()]}）`
}
function dayLabel(i: number) {
  if (i === 0) return '本日'; if (i === 1) return '1日前'; return `${i}日前`
}


const OrbitSVG = () => (
  <svg width="12" height="12" viewBox="0 0 80 80" fill="none">
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke="#c8a882" strokeWidth="6" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke="#c8a882" strokeWidth="6" opacity="0.5"/>
  </svg>
)

// ─── BottomSheet CSS を <head> に一度だけ注入（Safari ポータル対応）────────
const BS_CSS = `
.bs-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: flex-end; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
.bs-overlay.open { opacity: 1; pointer-events: auto; }
.bs-panel {
  width: 100%; max-width: 480px; box-sizing: border-box;
  background: #1a1816;
  border-top: 1px solid rgba(200,168,130,0.3);
  border-radius: 16px 16px 0 0;
  padding: 24px 20px 40px;
  transform: translateY(100%);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  max-height: 85vh; min-height: 280px; overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  will-change: transform;
}
.bs-overlay.open .bs-panel { transform: translateY(0); }
`
;(function injectBsStyles() {
  const existing = document.getElementById('bs-styles')
  if (existing) existing.remove()
  const el = document.createElement('style')
  el.id = 'bs-styles'
  el.textContent = BS_CSS
  document.head.appendChild(el)
})()

function BottomSheet({ onClose, children }: {
  onClose: () => void
  children: (close: () => void) => React.ReactNode
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  function close() {
    const overlay = overlayRef.current
    const panel   = panelRef.current
    // overlay を固定（フェードさせない）、パネルだけ下にスライド
    if (overlay) {
      overlay.style.transition    = 'none'
      overlay.style.opacity       = '1'       // .open 除去後も不透明を維持
      overlay.style.pointerEvents = 'none'
      overlay.classList.remove('open')        // CSS の translateY(0) ルールを解除
    }
    if (panel) {
      panel.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
      panel.style.transform  = 'translateY(100%)'
    }
    setTimeout(() => onCloseRef.current(), 450)
  }

  // 入場: 2フレーム後に .open を付与 → CSS transition が走る
  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        overlayRef.current?.classList.add('open')
      })
      return () => cancelAnimationFrame(id2)
    })
    return () => cancelAnimationFrame(id1)
  }, [])

  // 背景スクロール禁止（オーバーレイ上のtouchmoveをパネル外でブロック）
  useEffect(() => {
    const overlay = overlayRef.current
    const panel   = panelRef.current
    if (!overlay || !panel) return
    const stop = (e: TouchEvent) => { if (!panel.contains(e.target as Node)) e.preventDefault() }
    overlay.addEventListener('touchmove', stop, { passive: false })
    return () => overlay.removeEventListener('touchmove', stop)
  }, [])

  // スワイプで閉じる
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    let sy = 0, isDragging = false

    const onStart = (e: TouchEvent) => { sy = e.touches[0].clientY; isDragging = true }
    const onMove  = (e: TouchEvent) => {
      if (!isDragging) return
      const dy = e.touches[0].clientY - sy
      if (dy > 0 && el.scrollTop === 0) {
        e.preventDefault()
        el.style.transition = 'none'
        el.style.transform  = `translateY(${dy}px)`
      }
    }
    const onEnd = (e: TouchEvent) => {
      isDragging = false
      const dy = e.changedTouches[0].clientY - sy
      if (dy > 80 && el.scrollTop === 0) {
        const overlay = overlayRef.current
        if (overlay) {
          overlay.style.transition    = 'none'
          overlay.style.opacity       = '1'
          overlay.style.pointerEvents = 'none'
          overlay.classList.remove('open')
        }
        el.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform  = 'translateY(100%)'
        setTimeout(() => onCloseRef.current(), 450)
      } else {
        el.style.transition = 'transform 0.35s ease'
        el.style.transform  = 'translateY(0)'
        setTimeout(() => { el.style.transition = ''; el.style.transform = '' }, 350)
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [])

  return createPortal(
    <div ref={overlayRef} className="bs-overlay"
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div ref={panelRef} className="bs-panel">
        <div style={{ width: 40, height: 3, background: 'rgba(232,228,220,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
        {children(close)}
      </div>
    </div>,
    document.body
  )
}

// ─── 通知パネル ────────────────────────────────────────────────
type NotifItem = { id: number; borderColor: string; meta: string; title: string; sub: string }
function NotifPanel({ items, onClose }: { items: NotifItem[]; onClose: () => void }) {
  return (
    <BottomSheet onClose={onClose}>
      {close => (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
            <OrbitSVG />
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold }}>通知</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map(n => (
              <div key={n.id} style={{
                background: '#211f1d', border: `1px solid ${border}`,
                borderLeft: `3px solid ${n.borderColor}`, borderRadius: 2, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11, color: muted, fontFamily: josefin, marginBottom: 4 }}>{n.meta}</div>
                <div style={{ fontSize: 14, fontWeight: 400, color: '#e8e4dc', fontFamily: zen }}>{n.title}</div>
                <div style={{ fontSize: 12, color: muted, fontFamily: josefin, fontWeight: 100, marginTop: 3 }}>{n.sub}</div>
              </div>
            ))}
          </div>
          <button
            onClick={close}
            style={{
              width: '100%', padding: 13, marginTop: 16,
              background: 'transparent', border: '1px solid rgba(232,228,220,0.1)', borderRadius: 2,
              fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.15em',
              textTransform: 'uppercase' as const, color: 'rgba(232,228,220,0.4)', cursor: 'pointer',
            }}
          >閉じる</button>
        </>
      )}
    </BottomSheet>
  )
}

// ─── 発注確認モーダル ────────────────────────────────────────────
type InvAlert = { id: number; name: string; brand: string | null; quantity: number; threshold: number; stock_unit: string; status: string; material_id: number }
type Dealer   = { id: number; name: string; contact_method: string; closing_day: number | null }

function OrderModal({ item, storeId, dealers, onClose, onDone }: {
  item: InvAlert; storeId: number; dealers: Dealer[]; onClose: () => void; onDone: (dealerName: string, qty: string) => void
}) {
  const [dealerId,      setDealerId]      = useState(() => dealers[0]?.id ?? 0)
  const [qty,           setQty]           = useState(String(item.threshold))
  const [loading,       setLoading]       = useState(false)
  const [confirmed,     setConfirmed]     = useState(false)
  const [closedWeekday, setClosedWeekday] = useState<number | null>(null)
  const closeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    apiFetch<{ closed_weekday: number | null }>(`/api/v1/stores/${storeId}/hours`)
      .then(d => setClosedWeekday(d.closed_weekday ?? null))
      .catch(() => {})
  }, [storeId])

  const dealer   = dealers.find(d => d.id === dealerId)
  const closingDay = dealer?.closing_day ?? 20
  const daysLeft = businessDaysToClosing(closingDay, closedWeekday)
  const showWarn = daysLeft <= 5

  async function submit() {
    if (!dealerId || !qty || Number(qty) <= 0) return
    setLoading(true)
    try {
      const res = await api('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          store_id: storeId, dealer_id: dealerId,
          is_next_month_invoice: false,
          items: [{ material_id: item.material_id, quantity: Number(qty), unit: item.stock_unit }],
        }),
      })
      if (!res.ok) throw new Error()
      // 成功時は loading をリセットしない（ボタンが「発注を送信する」に戻るのを防ぐ）
      setConfirmed(true)
      setTimeout(() => {
        onDone(dealer?.name ?? '', qty)
        closeRef.current?.()
      }, 2000)
    } catch {
      alert('発注に失敗しました')
      setLoading(false)
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      {close => {
        closeRef.current = close
        return (
          <div style={{ position: 'relative', width: '100%' }}>

            {/* ─ フォーム（confirmed 時はフェードアウト） ─ */}
            <div style={{
              opacity: confirmed ? 0 : 1,
              transition: 'opacity 0.25s ease',
              pointerEvents: confirmed ? 'none' : 'all',
            }}>
              {showWarn && (
                <div style={{ background: alertDim, border: `1px solid rgba(224,112,96,0.2)`, borderRadius: 2, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: alertC, fontFamily: zen, lineHeight: 1.7 }}>
                  あと<strong style={{ margin: '0 4px' }}>{daysLeft}</strong>営業日で翌月伝票になります。このまま発注しますか？
                </div>
              )}
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'rgba(200,168,130,0.7)', marginBottom: 6 }}>発注確認</div>
              <div style={{ fontSize: 19, fontWeight: 400, color: '#e8e4dc', fontFamily: zen, marginBottom: 18 }}>{item.name}</div>
              <div style={{ background: '#211f1d', border: `1px solid ${border}`, borderRadius: 2, padding: '14px 16px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ paddingBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: muted }}>発注数</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number" value={qty} min="1"
                        onChange={e => setQty(e.target.value)}
                        style={{
                          width: 80, padding: '4px 8px', textAlign: 'right' as const,
                          background: 'transparent', border: `1px solid rgba(232,228,220,0.15)`, borderRadius: 2,
                          color: '#e8e4dc', fontFamily: josefin, fontSize: 16, outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: 12, color: muted }}>{item.stock_unit}</span>
                    </div>
                  </div>
                </div>
                <ModalRow label="仕入れ先">
                  <select
                    value={dealerId}
                    onChange={e => setDealerId(Number(e.target.value))}
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      color: '#e8e4dc', fontFamily: zen, fontSize: 16, textAlign: 'right' as const,
                      maxWidth: 180,
                    }}
                  >
                    {dealers.map(d => <option key={d.id} value={d.id} style={{ background: '#1a1816' }}>{d.name}</option>)}
                  </select>
                </ModalRow>
                <ModalRow label="送信方法"><span style={{ fontSize: 14, color: '#e8e4dc', fontWeight: 400 }}>LINE</span></ModalRow>
              </div>
              <button
                onClick={submit}
                disabled={loading || confirmed}
                style={{
                  width: '100%', padding: 15, marginBottom: 10,
                  background: (loading || confirmed) ? 'rgba(200,168,130,0.3)' : gold,
                  border: 'none', borderRadius: 2,
                  fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.25em',
                  textTransform: 'uppercase' as const,
                  color: (loading || confirmed) ? muted : '#1a1816',
                  cursor: (loading || confirmed) ? 'default' : 'pointer',
                }}
              >{(loading || confirmed) ? '送信中...' : '発注を送信する'}</button>
              <button
                onClick={close}
                style={{
                  width: '100%', padding: 13,
                  background: 'transparent', border: '1px solid rgba(232,228,220,0.1)', borderRadius: 2,
                  fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const, color: 'rgba(232,228,220,0.4)', cursor: 'pointer',
                }}
              >キャンセル</button>
            </div>

            {/* ─ 完了アニメーション（confirmed=true のときだけマウント） ─ */}
            {confirmed && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 16,
                background: '#1a1816',
              }}>
                {/* 丸: マウント直後からポップイン */}
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'transparent',
                  border: `2px solid ${green}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  opacity: 0,
                  animation: 'circlePop 0.35s ease both 0.2s',
                }}>
                  {/* チェックマーク: 先端から手書き風に描画 */}
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
                    style={{ display: 'block', background: 'transparent', overflow: 'visible' }}
                  >
                    <polyline
                      points="6,14 12,20 22,9"
                      stroke={green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{
                        strokeDasharray: 24,
                        strokeDashoffset: 24,
                        animation: 'drawCheck 0.4s ease both 0.55s',
                      }}
                    />
                  </svg>
                </div>
                <div style={{
                  fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.12em',
                  color: green, textAlign: 'center' as const,
                  opacity: 0,
                  animation: 'checkFade 0.25s ease both 0.7s',
                }}>送信完了</div>
              </div>
            )}

          </div>
        )
      }}
    </BottomSheet>
  )
}

function ModalRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${border}` }}>
      <span style={{ fontSize: 12, color: muted }}>{label}</span>
      {children}
    </div>
  )
}

function SectionTitle({ label, sub, link, onLink }: {
  label: string; sub: string; link: string; onLink: () => void
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: josefin, fontWeight: 200, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#e8e4dc' }}>
        <OrbitSVG />{label}
        <span style={{ fontSize: 11, color: muted, fontWeight: 300, letterSpacing: '0.05em', textTransform: 'none' as const }}>{sub}</span>
      </div>
      <div style={{ fontSize: 12, color: gold, opacity: 0.8, cursor: 'pointer' }} onClick={onLink}>{link}</div>
    </div>
  )
}

// ─── メインページ ──────────────────────────────────────────────
type DayEntry = { date: Date; dateStr: string; data: DailySales | null }

export default function DashboardPage() {
  const salonName = getSalonName()
  const claims    = getClaims()
  const isManager = claims?.role === 'owner' || claims?.role === 'admin'
  const storeId   = claims?.store_id
  const navigate  = useNavigate()

  // 今日 + 前週同曜日 = 8日分（index 0=今日 … index 7=前週同曜日）
  const days = useMemo<DayEntry[]>(() => Array.from({ length: 8 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return { date: d, dateStr: toDateStr(d), data: null }
  }), [])

  const [salesDays,   setSalesDays]   = useState<DayEntry[]>(days)
  const [dayOffset,   setDayOffset]   = useState(0)
  const [staffList,   setStaffList]   = useState<StaffSalesSummary[]>([])
  const [invAlerts,   setInvAlerts]   = useState<InvAlert[]>([])
  const [dealers,     setDealers]     = useState<Dealer[]>([])
  const [orderTarget, setOrderTarget] = useState<InvAlert | null>(null)
  const [sentOrders,  setSentOrders]  = useState<{ name: string; qty: string; dealer: string }[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('dashboard_sent_orders') ?? '[]') } catch { return [] }
  })
  const [showNotif,   setShowNotif]   = useState(false)

  const cardRef      = useRef<HTMLDivElement>(null)
  const dayOffsetRef = useRef(0)

  function goToDay(n: number) { dayOffsetRef.current = n; setDayOffset(n) }

  useEffect(() => {
    if (!storeId) return
    apiFetch<DailySales[]>(`/api/v1/sales/store?store_id=${storeId}&from=${days[7].dateStr}&to=${days[0].dateStr}`)
      .then(list => {
        const map = new Map((Array.isArray(list) ? list : []).map(d => [d.date.slice(0, 10), d]))
        setSalesDays(days.map(d => ({ ...d, data: map.get(d.dateStr) ?? null })))
      }).catch(() => {})

    apiFetch<InvAlert[]>(`/api/v1/inventory?store_id=${storeId}`)
      .then(d => {
        const sentNames = new Set<string>(
          JSON.parse(sessionStorage.getItem('dashboard_sent_orders') ?? '[]').map((o: { name: string }) => o.name)
        )
        setInvAlerts(
          (Array.isArray(d) ? d : [])
            .filter(i => (i.status === '要発注' || i.status === '注意') && !sentNames.has(i.name))
            .slice(0, 3)
        )
      }).catch(() => {})

    apiFetch<Dealer[]>('/api/v1/dealers')
      .then(d => setDealers(Array.isArray(d) ? d : []))
      .catch(() => {})

    if (isManager) {
      apiFetch<StaffSalesSummary[]>(`/api/v1/sales/store/staff?store_id=${storeId}&date=${days[0].dateStr}`)
        .then(d => setStaffList(Array.isArray(d) ? d : []))
        .catch(() => {})
    }
  }, [storeId])

  // 売上カードスワイプ
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    let sx = 0, sy = 0, swiping = false

    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = false
      card.style.transition = 'none'
    }
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - sx
      const dy = e.touches[0].clientY - sy
      if (!swiping && Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 10) swiping = true
      if (swiping) { e.preventDefault(); card.style.transform = `translateX(${dx * 0.4}px)` }
    }
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx
      if (!swiping) return; swiping = false
      if (Math.abs(dx) > 40) {
        const dir = dx < 0 ? 1 : -1
        const next = dayOffsetRef.current + dir
        if (next >= 0 && next < 8) {
          card.style.transition = 'transform 0.2s ease, opacity 0.2s ease'
          card.style.transform  = dx < 0 ? 'translateX(-100%)' : 'translateX(100%)'
          card.style.opacity    = '0'
          setTimeout(() => {
            goToDay(next)
            card.style.transition = 'none'
            card.style.transform  = dx < 0 ? 'translateX(100%)' : 'translateX(-100%)'
            card.style.opacity    = '0'
            requestAnimationFrame(() => requestAnimationFrame(() => {
              card.style.transition = 'transform 0.25s ease, opacity 0.2s ease'
              card.style.transform  = 'translateX(0)'
              card.style.opacity    = '1'
            }))
          }, 200)
          return
        }
      }
      card.style.transition = 'transform 0.3s ease'
      card.style.transform  = 'translateX(0)'
    }
    card.addEventListener('touchstart', onStart, { passive: true })
    card.addEventListener('touchmove',  onMove,  { passive: false })
    card.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      card.removeEventListener('touchstart', onStart)
      card.removeEventListener('touchmove',  onMove)
      card.removeEventListener('touchend',   onEnd)
    }
  }, [])

  const cur       = salesDays[dayOffset]
  const data      = cur?.data
  const unitPrice = data && data.client_count > 0 ? Math.round(data.total_sales / data.client_count) : 0

  // 通知リスト（在庫アラートを実データから生成）
  const notifItems = [
    ...invAlerts.map(a => ({
      id: a.id,
      borderColor: a.status === '要発注' ? alertC : gold,
      meta: `在庫アラート · たった今`,
      title: `${a.name} が閾値を下回っています`,
      sub: `残り ${a.quantity}${a.stock_unit} / 閾値 ${a.threshold}${a.stock_unit}`,
    })),
    { id: -1, borderColor: green,  meta: '日次レポート · 昨日', title: '昨日の売上サマリ', sub: salesDays[1]?.data ? `¥${fmt(salesDays[1].data.total_sales)} · ${salesDays[1].data.client_count}名来店` : 'データなし' },
  ]

  return (
    <AppLayout>
      <style>{`
        @keyframes circlePop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        @keyframes checkFade{0%{opacity:0}100%{opacity:1}}
        @keyframes drawCheck{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
      `}</style>

      <div style={{ padding: '14px 20px 32px' }}>

        {/* グリーティング + アイコン */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: muted, fontFamily: zen, marginBottom: 4 }}>おはようございます</div>
            <div style={{ fontSize: 17, fontWeight: 400, color: '#e8e4dc', fontFamily: zen }}>{salonName}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div onClick={() => setShowNotif(true)} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: '#211f1d', border: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1C8 1 5 3 5 7V10L4 11V12H12V11L11 10V7C11 3 8 1 8 1Z" stroke="#e8e4dc" strokeWidth="1" fill="none"/>
                <path d="M6.5 12C6.5 12.8 7.2 13.5 8 13.5C8.8 13.5 9.5 12.8 9.5 12" stroke="#e8e4dc" strokeWidth="1" fill="none"/>
              </svg>
              {invAlerts.length > 0 && (
                <div style={{
                  position: 'absolute', top: 7, right: 7,
                  width: 7, height: 7, borderRadius: '50%',
                  background: alertC, border: '1.5px solid #1a1816',
                }} />
              )}
            </div>
            <div
              onClick={() => navigate('/settings', { state: { sub: 'profile' } })}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: goldDim, border: '1px solid rgba(200,168,130,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: josefin, fontWeight: 100, fontSize: 12, color: gold, cursor: 'pointer',
              }}
            >
              {(claims as any)?.avatar_initials ?? (claims?.role === 'owner' ? 'OW' : '??')}
            </div>
          </div>
        </div>

        {/* 日付ストリップ */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 1, background: border }} />
            <div style={{ fontSize: 12, color: muted, whiteSpace: 'nowrap', letterSpacing: '0.04em', fontFamily: josefin, fontWeight: 100 }}>
              {cur && jpDate(cur.date)} · {dayLabel(dayOffset)}
            </div>
            <div style={{ flex: 1, height: 1, background: border }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 12 }}>
            {salesDays.map((_, i) => (
              <div key={i} onClick={() => goToDay(i)} style={{
                width: i === dayOffset ? 16 : 6, height: 6, borderRadius: 3,
                background: i === dayOffset ? gold : 'rgba(200,168,130,0.25)',
                transition: 'all 0.3s ease', cursor: 'pointer',
              }} />
            ))}
          </div>
        </div>

        {/* ─── 売上カード ─── */}
        <div
          ref={cardRef}
          style={{
            background: '#211f1d', border: `1px solid ${border}`, borderRadius: 2,
            padding: '16px 20px', marginBottom: 4,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #c8a882, transparent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', fontFamily: josefin, fontWeight: 100, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              <OrbitSVG />
              {dayOffset === 0 ? "TODAY'S SALES" : `${cur?.date.getMonth()+1}月${cur?.date.getDate()}日の売上`}
            </div>
            <div style={{ fontSize: 12, color: muted, fontFamily: zen }}>
              {data ? `${data.client_count}名来店` : '—'}
            </div>
          </div>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 40, color: '#e8e4dc', lineHeight: 1, marginBottom: 12, letterSpacing: '0.02em' }}>
            {data
              ? <><span style={{ fontSize: 16, color: muted, marginRight: 2 }}>¥</span>{fmt(data.total_sales)}</>
              : <span style={{ fontSize: 28, color: muted }}>—</span>
            }
          </div>
          <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: `1px solid ${border}` }}>
            {[
              { label: '客単価',   value: data ? `¥${fmt(unitPrice)}`         : '—' },
              { label: '技術売上', value: data ? `¥${fmt(data.tech_sales)}`   : '—' },
              { label: '物販',     value: data ? `¥${fmt(data.retail_sales)}` : '—' },
            ].map((kpi, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 10, color: muted, letterSpacing: '0.1em', fontFamily: josefin }}>{kpi.label}</div>
                <div style={{ fontSize: 15, color: '#e8e4dc', fontFamily: josefin, fontWeight: 100 }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── 在庫アラート ─── */}
        {invAlerts.length > 0 && (
          <>
            <SectionTitle label="在庫アラート" sub="· 要発注 上位3件" link="すべて見る →" onLink={() => navigate('/inventory')} />
            {invAlerts.map(item => {
              const crit = item.status === '要発注'
              const sent = sentOrders.some(o => o.name === item.name)
              return (
                <div key={item.id} style={{
                  background: '#211f1d',
                  border: `1px solid ${border}`,
                  borderLeft: `3px solid ${crit ? alertC : gold}`,
                  borderRadius: 2, padding: '14px 16px', marginBottom: 10,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 400, color: '#e8e4dc', fontFamily: zen, marginBottom: 3 }}>{item.name}</div>
                      {item.brand && <div style={{ fontSize: 12, color: muted, fontFamily: josefin, fontWeight: 100 }}>{item.brand}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 22, color: crit ? alertC : gold, lineHeight: 1 }}>
                        {item.quantity}<span style={{ fontSize: 11, marginLeft: 2 }}>{item.stock_unit}</span>
                      </div>
                      <div style={{
                        fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                        padding: '2px 8px', borderRadius: 1,
                        background: crit ? alertDim : goldDim,
                        color: crit ? alertC : gold,
                        border: `1px solid ${crit ? 'rgba(224,112,96,0.25)' : 'rgba(200,168,130,0.2)'}`,
                      }}>{item.status}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: muted, fontFamily: josefin, fontWeight: 100 }}>
                      閾値 {item.threshold}{item.stock_unit}
                    </div>
                    {sent ? (
                      <div style={{
                        padding: '6px 14px', borderRadius: 2,
                        background: 'rgba(109,186,142,0.1)', border: '1px solid rgba(109,186,142,0.25)',
                        fontSize: 10, letterSpacing: '0.1em', color: green, fontFamily: josefin,
                      }}>送信済</div>
                    ) : (
                      <button
                        onClick={() => setOrderTarget(item)}
                        style={{
                          padding: '6px 14px',
                          background: crit ? gold : goldDim,
                          border: crit ? 'none' : '1px solid rgba(200,168,130,0.3)',
                          borderRadius: 2,
                          fontFamily: josefin, fontWeight: 100, fontSize: 10,
                          letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                          color: crit ? '#1a1816' : gold, cursor: 'pointer', flexShrink: 0,
                          WebkitAppearance: 'none' as any,
                        }}
                      >発注する</button>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* ─── 発注状況 ─── */}
        <>
          <SectionTitle
            label="発注状況" sub="· 本日" link="履歴を見る →"
            onLink={() => navigate('/inventory', { state: { tab: 'history' } })}
          />
          {sentOrders.length === 0 ? (
            <div style={{ fontSize: 12, color: muted, fontFamily: zen, padding: '4px 0 8px', lineHeight: 1.7 }}>本日分の発注はありません</div>
          ) : sentOrders.map((o, i) => (
            <div key={i} style={{
              background: '#211f1d', border: `1px solid ${border}`, borderRadius: 2,
              padding: '14px 16px', marginBottom: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 400, color: '#e8e4dc', fontFamily: zen, marginBottom: 3 }}>{o.name} × {o.qty}</div>
                <div style={{ fontSize: 12, color: muted, fontFamily: josefin, fontWeight: 100 }}>{o.dealer} · LINE送信済み</div>
              </div>
              <div style={{
                fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                padding: '3px 10px', borderRadius: 1, whiteSpace: 'nowrap' as const,
                background: 'rgba(109,186,142,0.1)', color: green,
                border: '1px solid rgba(109,186,142,0.25)',
              }}>送信済</div>
            </div>
          ))}
        </>

        {/* ─── スタッフ売上 ─── */}
        {isManager && staffList.length > 0 && (
          <>
            <SectionTitle label="スタッフ売上" sub="· 本日" link="詳細 →" onLink={() => navigate('/sales', { state: { tab: 'staff' } })} />
            {staffList.map(s => (
              <div key={s.staff_id}
                onClick={() => navigate('/sales', { state: { tab: 'staff', staffId: s.staff_id } })}
                style={{
                  background: '#211f1d', border: `1px solid ${border}`, borderRadius: 2,
                  padding: '12px 16px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer',
                }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#2a2826', border: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: muted, fontFamily: josefin, flexShrink: 0,
                }}>
                  {s.avatar_initials ?? s.name.slice(0, 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 400, color: '#e8e4dc', fontFamily: zen, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: muted, fontFamily: josefin, fontWeight: 100 }}>
                    {s.client_count > 0 ? `スタイリスト · ${s.client_count}名担当` : 'スタイリスト · 本日未来店'}
                  </div>
                </div>
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 17, color: '#e8e4dc', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: muted, marginRight: 1 }}>¥</span>{fmt(s.total_sales)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ─── 発注確認モーダル ─── */}
      {orderTarget && storeId && (
        <OrderModal
          item={orderTarget}
          storeId={storeId}
          dealers={dealers}
          onClose={() => setOrderTarget(null)}
          onDone={(dealerName, qtyStr) => {
            const target = orderTarget
            setInvAlerts(prev => prev.filter(a => a.id !== target.id))
            setSentOrders(prev => {
              const next = [{ name: target.name, qty: qtyStr, dealer: dealerName }, ...prev]
              sessionStorage.setItem('dashboard_sent_orders', JSON.stringify(next))
              return next
            })
          }}
        />
      )}

      {/* ─── 通知パネル ─── */}
      {showNotif && (
        <NotifPanel items={notifItems} onClose={() => setShowNotif(false)} />
      )}

    </AppLayout>
  )
}
