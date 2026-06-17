import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, apiFetch } from '../lib/api'
import { getClaims } from '../lib/auth'
import { businessDaysToClosing } from '../lib/businessDays'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const muted   = 'var(--text-muted)'
const border  = 'var(--border)'
const gold    = 'var(--accent)'
const alertC  = '#e07060'
const green   = '#6dba8e'
const blue    = '#6496dc'
const alertDim = 'rgba(224,112,96,0.1)'
const goldDim  = 'var(--accent-dim)'
const goldBorder = 'var(--accent-border)'
const surface  = 'var(--surface)'

// ─── BottomSheet CSS ──────────────────────────────────────────────────────────
const BS_CSS = `
.inv-filter-row::-webkit-scrollbar { display: none; }
.inv-bs-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: flex-end; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
.inv-bs-overlay.open { opacity: 1; pointer-events: auto; }
.inv-bs-panel {
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
.inv-bs-overlay.open .inv-bs-panel { transform: translateY(0); }
`
;(function injectStyles() {
  const existing = document.getElementById('inv-bs-styles')
  if (existing) existing.remove()
  const el = document.createElement('style')
  el.id = 'inv-bs-styles'
  el.textContent = BS_CSS
  document.head.appendChild(el)
})()

// ─── BottomSheet ─────────────────────────────────────────────────────────────
function BottomSheet({ onClose, children, noScroll }: {
  onClose: () => void
  children: (close: () => void) => React.ReactNode
  noScroll?: boolean
}) {
  const overlayRef    = useRef<HTMLDivElement>(null)
  const panelRef      = useRef<HTMLDivElement>(null)
  const onCloseRef    = useRef(onClose)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  onCloseRef.current = onClose

  function close() {
    const overlay = overlayRef.current
    const panel   = panelRef.current
    if (overlay) {
      overlay.style.transition    = 'none'
      overlay.style.opacity       = '1'
      overlay.style.pointerEvents = 'none'
      overlay.classList.remove('open')
    }
    if (panel) {
      panel.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
      panel.style.transform  = 'translateY(100%)'
    }
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      onCloseRef.current()
    }, 450)
  }

  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        overlayRef.current?.classList.add('open')
      })
      return () => cancelAnimationFrame(id2)
    })
    return () => {
      cancelAnimationFrame(id1)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  // 背景スクロール禁止
  useEffect(() => {
    const overlay = overlayRef.current
    const panel   = panelRef.current
    if (!overlay || !panel) return
    const stop = (e: TouchEvent) => { if (!panel.contains(e.target as Node)) e.preventDefault() }
    overlay.addEventListener('touchmove', stop, { passive: false })
    return () => overlay.removeEventListener('touchmove', stop)
  }, [])

  // スワイプで閉じる（ライブ移動 + scrollTop チェック）
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
    <div ref={overlayRef} className="inv-bs-overlay"
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div ref={panelRef} className="inv-bs-panel" style={noScroll ? { overflowY: 'hidden' } : undefined}>
        <div style={{ width: 40, height: 3, background: 'rgba(232,228,220,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
        {children(close)}
      </div>
    </div>,
    document.body
  )
}

// ─── 型 ──────────────────────────────────────────────────────────────────────
type InventoryItem = {
  id: number
  material_id: number
  name: string
  brand: string | null
  category: string
  size_amount: number | null
  size_unit: string | null
  stock_unit: string
  quantity: number
  threshold: number
  status: '要発注' | '注意' | '正常' | '過剰'
  bar_width: number
  jan_code: string | null
}
type Dealer = { id: number; name: string; contact_method: string; closing_day: number | null }
type Store  = { id: number; name: string }
type HistoryOrderItem = { material_id: number; material_name: string; quantity: number; unit: string; estimated_cost: number | null }
type HistoryOrder = {
  id: number; store_id: number; status: string; is_next_month_invoice: boolean
  created_at: string; dealer_name: string; contact_method: string
  items: HistoryOrderItem[]
}
type SendResult = { method: string; line_url: string; pdf_url: string }
type MaterialMenuAssoc = { menu_id: number; menu_name: string }
type Material = {
  id: number
  name: string
  brand: string | null
  category: string
  size_amount: number | null
  size_unit: string | null
  stock_unit: string
  jan_code: string | null
  menus: MaterialMenuAssoc[]
}
type AppMenu = { id: number; name: string; menu_type: string; is_active: boolean }

// ─── ユーティリティ ───────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  '要発注': alertC, '注意': gold, '正常': green, '過剰': blue,
}

const OrbitSVG = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ flexShrink: 0 }}>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke="var(--accent)" strokeWidth="6" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke="var(--accent)" strokeWidth="6" opacity="0.5"/>
  </svg>
)

// ─── 発注モーダル ─────────────────────────────────────────────────────────────
function OrderModal({ item, storeId, dealers, onClose, onDone }: {
  item: InventoryItem; storeId: number; dealers: Dealer[]
  onClose: () => void; onDone: () => void
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
      setConfirmed(true)
      setTimeout(() => {
        closeRef.current?.()        // スライドダウンアニメーション開始
        setTimeout(onDone, 450)     // アニメーション完了後にアンマウント
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
            {/* フォーム */}
            <div style={{ opacity: confirmed ? 0 : 1, transition: 'opacity 0.25s ease', pointerEvents: confirmed ? 'none' : 'all' }}>
              {showWarn && (
                <div style={{ background: alertDim, border: `1px solid rgba(224,112,96,0.2)`, borderRadius: 2, padding: '10px 12px', marginBottom: 16, fontSize: 14, color: alertC, fontFamily: zen, lineHeight: 1.7 }}>
                  あと<strong style={{ margin: '0 4px' }}>{daysLeft}</strong>営業日で翌月伝票になります。
                </div>
              )}
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'rgba(200,168,130,0.7)', marginBottom: 6 }}>発注リストに追加</div>
              <div style={{ fontSize: 19, fontWeight: 400, color: 'var(--text)', fontFamily: zen, marginBottom: 18 }}>{item.name}</div>
              <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, padding: '14px 16px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ paddingBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: muted }}>発注数</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number" value={qty} min="1"
                        onChange={e => setQty(e.target.value)}
                        style={{
                          width: 80, padding: '4px 8px', textAlign: 'right' as const,
                          background: 'transparent', border: `1px solid rgba(232,228,220,0.15)`, borderRadius: 2,
                          color: 'var(--text)', fontFamily: josefin, fontSize: 16, outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: 14, color: muted }}>{item.stock_unit}</span>
                    </div>
                  </div>
                </div>
                <ModalRow label="仕入れ先">
                  <select
                    value={dealerId}
                    onChange={e => setDealerId(Number(e.target.value))}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: zen, fontSize: 16, textAlign: 'right' as const, maxWidth: 180 }}
                  >
                    {dealers.map(d => <option key={d.id} value={d.id} style={{ background: 'var(--bg)' }}>{d.name}</option>)}
                  </select>
                </ModalRow>
                <ModalRow label="送信方法">
                  <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 400 }}>
                    {dealer?.contact_method === 'LINE' ? 'LINE' : 'Email'}
                  </span>
                </ModalRow>
              </div>
              <button
                onClick={submit} disabled={loading || confirmed}
                style={{
                  width: '100%', padding: 15, marginBottom: 10,
                  background: (loading || confirmed) ? 'rgba(200,168,130,0.3)' : gold,
                  border: 'none', borderRadius: 2,
                  fontFamily: josefin, fontWeight: 100, fontSize: 14, letterSpacing: '0.25em',
                  textTransform: 'uppercase' as const,
                  color: (loading || confirmed) ? muted : '#1a1816',
                  cursor: (loading || confirmed) ? 'default' : 'pointer',
                }}
              >{(loading || confirmed) ? '追加中...' : 'リストに追加する'}</button>
              <button
                onClick={close}
                style={{
                  width: '100%', padding: 13,
                  background: 'transparent', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 2,
                  fontFamily: josefin, fontWeight: 100, fontSize: 14, letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const, color: 'rgba(232,228,220,0.4)', cursor: 'pointer',
                }}
              >キャンセル</button>
            </div>
            {/* 完了アニメーション */}
            {confirmed && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg)' }}>
                <style>{`
                  @keyframes inv-circlePop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
                  @keyframes inv-drawCheck{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
                  @keyframes inv-checkFade{0%{opacity:0}100%{opacity:1}}
                `}</style>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'transparent', border: `2px solid ${green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0, animation: 'inv-circlePop 0.35s ease both 0.2s' }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ display: 'block', overflow: 'visible' }}>
                    <polyline points="6,14 12,20 22,9" stroke={green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'inv-drawCheck 0.4s ease both 0.55s' }} />
                  </svg>
                </div>
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, letterSpacing: '0.12em', color: green, opacity: 0, animation: 'inv-checkFade 0.25s ease both 0.7s' }}>リスト追加完了</div>
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
      <span style={{ fontSize: 14, color: muted }}>{label}</span>
      {children}
    </div>
  )
}

// ─── 在庫数更新モーダル ────────────────────────────────────────────────────────
function EditModal({ item, onClose, onDone }: {
  item: InventoryItem; onClose: () => void; onDone: (newQty: number) => void
}) {
  const [qty, setQty] = useState('')

  async function submit(close: () => void) {
    const n = parseInt(qty)
    if (isNaN(n) || n < 0) return
    try {
      await api(`/api/v1/inventory/${item.id}/quantity`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: n }),
      })
      onDone(n)
      close()
    } catch {
      alert('更新に失敗しました')
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      {close => (
        <>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <OrbitSVG /> 在庫数を更新
          </div>
          <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)', fontFamily: zen, marginBottom: 16 }}>{item.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: muted, fontFamily: josefin }}>現在の在庫数</div>
            <input
              type="number" placeholder="例：12" min="0" value={qty}
              onChange={e => setQty(e.target.value)}
              style={{
                background: 'rgba(232,228,220,0.04)', border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2,
                padding: '13px 14px', fontSize: 16, color: 'var(--text)', fontFamily: zen, outline: 'none',
              }}
            />
          </div>
          <div style={{ fontSize: 13, color: muted, marginBottom: 16, lineHeight: 1.7, fontFamily: zen }}>
            入力した数値で在庫数が更新され、閾値に応じてステータスが自動的に変わります。
          </div>
          <button
            onClick={() => submit(close)}
            style={{ width: '100%', padding: 15, marginBottom: 10, background: gold, border: 'none', borderRadius: 2, fontFamily: josefin, fontWeight: 100, fontSize: 14, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: 'var(--on-accent)', cursor: 'pointer' }}
          >更新する</button>
          <button
            onClick={close}
            style={{ width: '100%', padding: 13, background: 'transparent', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 2, fontFamily: josefin, fontWeight: 100, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(232,228,220,0.4)', cursor: 'pointer' }}
          >キャンセル</button>
        </>
      )}
    </BottomSheet>
  )
}

// ─── 店舗選択モーダル ─────────────────────────────────────────────────────────
function StoreModal({ stores, ownStoreId, currentStoreId, onSelect, onClose }: {
  stores: Store[]; ownStoreId: number | null; currentStoreId: number | null
  onSelect: (id: number, isOwn: boolean) => void; onClose: () => void
}) {
  return (
    <BottomSheet onClose={onClose}>
      {close => (
        <>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <OrbitSVG /> 店舗を選択
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
            {stores.map(s => {
              const isOwn     = s.id === ownStoreId
              const isCurrent = s.id === currentStoreId
              return (
                <div
                  key={s.id}
                  onClick={() => { onSelect(s.id, isOwn); close() }}
                  style={{
                    padding: '14px 16px',
                    background: isCurrent ? goldDim : surface,
                    border: `1px solid ${isCurrent ? goldBorder : border}`,
                    borderRadius: 2, cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 400, color: isCurrent ? gold : '#e8e4dc', fontFamily: zen }}>{s.name}</span>
                  {isOwn && <span style={{ fontSize: 12, color: muted, fontFamily: josefin }}>自店舗</span>}
                </div>
              )
            })}
          </div>
          <button
            onClick={close}
            style={{ width: '100%', padding: 13, background: 'transparent', border: `1px solid rgba(232,228,220,0.1)`, borderRadius: 2, fontFamily: josefin, fontWeight: 100, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(232,228,220,0.4)', cursor: 'pointer' }}
          >キャンセル</button>
        </>
      )}
    </BottomSheet>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return createPortal(
    <div style={{
      position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
      background: surface, border: '1px solid rgba(109,186,142,0.3)', borderRadius: 4,
      padding: '12px 18px', minWidth: 260, textAlign: 'center', maxWidth: 'calc(100% - 40px)',
      opacity: visible ? 1 : 0, pointerEvents: 'none',
      transition: 'opacity 0.25s ease',
    }}>
      <div style={{ fontSize: 11, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: green, marginBottom: 4 }}>// 送信完了</div>
      <div style={{ fontSize: 15, color: 'var(--text)', fontFamily: zen }}>{message}</div>
    </div>,
    document.body
  )
}

// ─── 在庫カード ───────────────────────────────────────────────────────────────
function InvCard({ item, inList, sent, readOnly, onOrder, onEdit }: {
  item: InventoryItem; inList: boolean; sent: boolean; readOnly: boolean
  onOrder: () => void; onEdit: () => void
}) {
  const navigate = useNavigate()
  const color = STATUS_COLOR[item.status] ?? '#e8e4dc'
  const borderLeftColor: Record<string, string> = {
    '要発注': alertC, '注意': gold, '正常': green, '過剰': blue,
  }
  const badgeBg: Record<string, string> = {
    '要発注': 'rgba(224,112,96,0.1)',  '注意': 'rgba(200,168,130,0.1)',
    '正常':   'rgba(109,186,142,0.1)', '過剰': 'rgba(100,150,220,0.1)',
  }
  const badgeBorder: Record<string, string> = {
    '要発注': 'rgba(224,112,96,0.3)',  '注意': 'rgba(200,168,130,0.2)',
    '正常':   'rgba(109,186,142,0.3)', '過剰': 'rgba(100,150,220,0.3)',
  }

  const brandLabel = [item.brand, item.size_amount ? `${item.size_amount}${item.size_unit}` : null].filter(Boolean).join(' · ')

  const canOrder = !readOnly && !inList && !sent && (item.status === '要発注' || item.status === '注意')

  return (
    <div style={{
      background: surface, border: `1px solid ${border}`,
      borderLeft: `3px solid ${borderLeftColor[item.status] ?? border}`,
      borderRadius: 2, padding: '14px 16px', marginBottom: 8,
    }}>
      {/* 上段 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)', fontFamily: zen }}>{item.name}</div>
          {brandLabel && <div style={{ fontSize: 13, color: muted, marginTop: 2, fontFamily: zen }}>{brandLabel}</div>}
        </div>
        <div style={{
          fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
          padding: '3px 10px', borderRadius: 1, flexShrink: 0, marginLeft: 8,
          background: inList ? goldDim : sent ? 'rgba(160,160,160,0.12)' : badgeBg[item.status],
          color: inList ? gold : sent ? muted : color,
          border: `1px solid ${inList ? goldBorder : sent ? 'rgba(232,228,220,0.15)' : badgeBorder[item.status]}`,
          fontFamily: josefin,
        }}>{inList ? 'リスト中' : sent ? '送信済' : item.status}</div>
      </div>
      {/* バー */}
      <div style={{ height: 3, background: 'rgba(232,228,220,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${item.bar_width}%`, background: (inList || sent) ? muted : color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      {/* 下段 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 22, lineHeight: 1, color: (inList || sent) ? muted : color }}>{item.quantity}</span>
          <span style={{ fontSize: 14, color: muted }}>{item.stock_unit}</span>
          <span style={{ fontSize: 14, color: muted, margin: '0 4px' }}>/</span>
          <span style={{ fontSize: 14, color: muted }}>閾値 {item.threshold}{item.stock_unit}</span>
        </div>
        {item.status === '過剰' ? (
          <span style={{ fontSize: 13, color: muted, fontFamily: josefin, opacity: 0.5, letterSpacing: '0.1em' }}>過剰</span>
        ) : sent ? (
          <button
            onClick={onEdit}
            style={{
              padding: '6px 12px', border: `1px solid ${goldBorder}`, borderRadius: 1,
              background: 'transparent', color: gold,
              fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, cursor: 'pointer',
            }}
          >在庫数を更新する</button>
        ) : inList ? (
          <button
            onClick={() => navigate('/inventory', { state: { tab: 'orders' } })}
            style={{
              padding: '6px 12px', border: `1px solid ${goldBorder}`, borderRadius: 1,
              background: 'transparent', color: gold,
              fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, cursor: 'pointer',
            }}
          >発注リストを見る</button>
        ) : canOrder ? (
          <button
            onClick={onOrder}
            style={{
              padding: '6px 12px', border: `1px solid ${goldBorder}`, borderRadius: 1,
              background: 'transparent', color: gold,
              fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, cursor: 'pointer',
            }}
          >リストに追加</button>
        ) : null}
      </div>
    </div>
  )
}

// ─── 発注履歴ステータスバッジ ─────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending:   'リスト中', sent: '送信済', received: '入荷中', delivered: '納品済',
}
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:   { background: 'rgba(200,168,130,0.1)', border: '1px solid rgba(200,168,130,0.2)', color: '#c8a882' },
  sent:      { background: 'rgba(160,160,160,0.12)', border: '1px solid rgba(232,228,220,0.15)', color: muted },
  received:  { background: 'rgba(200,168,130,0.12)', border: `1px solid ${goldBorder}`,          color: gold },
  delivered: { background: 'rgba(109,186,142,0.12)', border: '1px solid rgba(109,186,142,0.3)',  color: green },
}

// ─── 材料マスタ ────────────────────────────────────────────────────────────────

function MasterField({
  placeholder, value, onChange, inputMode,
}: {
  placeholder: string; value: string; onChange: (v: string) => void
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <input
      type="text" inputMode={inputMode} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', boxSizing: 'border-box' as const,
        background: 'rgba(232,228,220,0.04)', border: `1px solid rgba(232,228,220,0.12)`,
        borderRadius: 2, padding: '10px 12px',
        fontSize: 16, color: 'var(--text)', fontFamily: zen, outline: 'none',
      }}
    />
  )
}

// ─── 材料追加/編集フォーム（BottomSheet） ─────────────────────────────────────
function MaterialFormSheet({
  initial, menus, existingCategories, onSave, onClose,
}: {
  initial?: Material
  menus: AppMenu[]
  existingCategories: string[]
  onSave: (data: {
    name: string; brand: string | null; category: string
    stock_unit: string; jan_code: string | null; threshold: number; menu_ids: number[]
  }) => Promise<void>
  onClose: () => void
}) {
  const [fname,      setFname]      = useState(initial?.name ?? '')
  const [fbrand,     setFbrand]     = useState(initial?.brand ?? '')
  const [fcat,       setFcat]       = useState(initial?.category ?? existingCategories[0] ?? '')
  const [funit,      setFunit]      = useState(initial?.stock_unit ?? '本')
  const [fjan,       setFjan]       = useState(initial?.jan_code ?? '')
  const [fthreshold, setFthreshold] = useState('10')
  const [menuIds,    setMenuIds]    = useState<Set<number>>(
    new Set(initial?.menus.map(m => m.menu_id) ?? [])
  )
  const [saving, setSaving] = useState(false)

  function toggleMenu(id: number) {
    setMenuIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function handleSave(): Promise<boolean> {
    if (!fname.trim()) return false
    setSaving(true)
    try {
      await onSave({
        name: fname.trim(),
        brand: fbrand.trim() || null,
        category: fcat,
        stock_unit: funit.trim() || '本',
        jan_code: fjan.trim() || null,
        threshold: Number(fthreshold) || 10,
        menu_ids: Array.from(menuIds),
      })
      return true
    } catch (e) {
      setSaving(false)
      alert(e instanceof Error ? e.message : '保存に失敗しました')
      return false
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      {close => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ヘッダー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <OrbitSVG size={10} />
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold }}>
              {initial ? '材料を編集' : '新規材料を追加'}
            </div>
          </div>

          {/* フォーム */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 6 }}>材料名</div>
              <MasterField placeholder="例：Milbon カラー 6NA" value={fname} onChange={setFname} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 6 }}>ブランド</div>
              <MasterField placeholder="例：Milbon" value={fbrand} onChange={setFbrand} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 6 }}>JANコード（バーコード検索用）</div>
              <MasterField placeholder="例：4901234567890" value={fjan} onChange={setFjan} inputMode="numeric" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 6 }}>カテゴリ</div>
              <input
                list="category-list"
                value={fcat}
                onChange={e => setFcat(e.target.value)}
                placeholder="例：カラー剤"
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  background: 'rgba(232,228,220,0.04)', border: `1px solid rgba(232,228,220,0.12)`,
                  borderRadius: 2, padding: '10px 12px',
                  fontSize: 16, color: 'var(--text)', fontFamily: zen, outline: 'none',
                }}
              />
              <datalist id="category-list">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 6 }}>在庫単位</div>
                <MasterField placeholder="例：本" value={funit} onChange={setFunit} />
              </div>
              {!initial && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 6 }}>発注基準数</div>
                  <MasterField placeholder="例：10" value={fthreshold} onChange={setFthreshold} inputMode="numeric" />
                </div>
              )}
            </div>

            {/* メニュー多選択 */}
            <div>
              <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 8 }}>使用するメニュー（複数選択可）</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {menus.filter(m => m.is_active && m.menu_type !== 'retail').map(m => {
                  const active = menuIds.has(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMenu(m.id)}
                      style={{
                        padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
                        border: `1px solid ${active ? goldBorder : border}`,
                        background: active ? goldDim : 'transparent',
                        color: active ? gold : muted,
                        fontFamily: zen, fontSize: 14,
                      }}
                    >{m.name}</button>
                  )
                })}
                {/* 物販メニューをまとめて1タグで表示 */}
                {(() => {
                  const retailIds = menus.filter(m => m.is_active && m.menu_type === 'retail').map(m => m.id)
                  if (retailIds.length === 0) return null
                  const active = retailIds.some(id => menuIds.has(id))
                  function toggleRetail() {
                    setMenuIds(prev => {
                      const s = new Set(prev)
                      if (active) { retailIds.forEach(id => s.delete(id)) }
                      else        { retailIds.forEach(id => s.add(id)) }
                      return s
                    })
                  }
                  return (
                    <button
                      onClick={toggleRetail}
                      style={{
                        padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
                        border: `1px solid ${active ? goldBorder : border}`,
                        background: active ? goldDim : 'transparent',
                        color: active ? gold : muted,
                        fontFamily: zen, fontSize: 14,
                      }}
                    >物販</button>
                  )
                })()}
              </div>
            </div>
          </div>

          <button
            onClick={async () => { const ok = await handleSave(); if (ok) close() }}
            disabled={saving || !fname.trim()}
            style={{
              padding: '13px 0', background: saving || !fname.trim() ? 'rgba(200,168,130,0.4)' : gold,
              border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 15, color: 'var(--on-accent)', cursor: 'pointer',
            }}
          >{saving ? '保存中...' : '保存する'}</button>
          <button onClick={close} style={{ background: 'transparent', border: 'none', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: josefin, letterSpacing: '0.1em', textAlign: 'center' }}>キャンセル</button>
        </div>
      )}
    </BottomSheet>
  )
}

// ─── 材料詳細シート（BottomSheet） ────────────────────────────────────────────
function MaterialDetailSheet({
  material, onClose, onEdit, onDelete, retailMenuIds,
}: {
  material: Material
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  retailMenuIds: Set<number>
}) {
  const tagStyle: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 2,
    border: `1px solid ${goldBorder}`, background: goldDim,
    color: gold, fontFamily: zen, fontSize: 14,
  }
  const menus         = material.menus ?? []
  const treatmentTags = menus.filter(m => !retailMenuIds.has(m.menu_id))
  const hasRetail     = menus.some(m => retailMenuIds.has(m.menu_id))

  return (
    <BottomSheet onClose={onClose}>
      {close => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* ヘッダー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <OrbitSVG size={10} />
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold }}>材料詳細</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 400, color: 'var(--text)', fontFamily: zen, marginBottom: 18 }}>{material.name}</div>

          {/* 詳細情報 */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, marginBottom: 16 }}>
            {material.brand && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                <div style={{ fontSize: 14, color: muted, fontFamily: zen }}>ブランド</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: zen }}>{material.brand}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px' }}>
              <div style={{ fontSize: 14, color: muted, fontFamily: zen }}>カテゴリ</div>
              <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: zen }}>{material.category}</div>
            </div>
          </div>

          {/* 使用メニュー（物販は "物販" タグに集約） */}
          {(treatmentTags.length > 0 || hasRetail) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: muted, fontFamily: zen, marginBottom: 10 }}>使用するメニュー</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {treatmentTags.map(m => (
                  <div key={m.menu_id} style={tagStyle}>{m.menu_name}</div>
                ))}
                {hasRetail && <div style={tagStyle}>物販</div>}
              </div>
            </div>
          )}

          <button
            onClick={() => { onEdit(); close() }}
            style={{ padding: '13px 0', background: gold, border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 15, color: 'var(--on-accent)', cursor: 'pointer', marginBottom: 8 }}
          >編集する</button>
          <button
            onClick={() => { close(); setTimeout(onDelete, 450) }}
            style={{ padding: '13px 0', background: 'transparent', border: '1px solid rgba(224,112,96,0.3)', borderRadius: 2, fontFamily: zen, fontSize: 15, color: '#e07060', cursor: 'pointer' }}
          >削除する</button>
        </div>
      )}
    </BottomSheet>
  )
}

// ─── 材料マスタ画面（フルページ） ────────────────────────────────────────────
function MaterialMasterScreen({ onBack, onChanged }: { onBack: () => void; onChanged: () => void }) {
  const [materials,  setMaterials]  = useState<Material[]>([])
  const [menus,      setMenus]      = useState<AppMenu[]>([])
  const [loading,    setLoading]    = useState(true)
  const [detailItem, setDetailItem] = useState<Material | null>(null)
  const [editItem,   setEditItem]   = useState<Material | null>(null)
  const [addOpen,    setAddOpen]    = useState(false)
  const pendingEditRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retailMenuIds  = new Set(menus.filter(m => m.menu_type === 'retail').map(m => m.id))

  async function load() {
    setLoading(true)
    const [matsResult, msResult] = await Promise.allSettled([
      apiFetch<Material[]>('/api/v1/materials'),
      apiFetch<AppMenu[]>('/api/v1/menus'),
    ])
    if (matsResult.status === 'fulfilled') setMaterials(Array.isArray(matsResult.value) ? matsResult.value : [])
    if (msResult.status === 'fulfilled')  setMenus(Array.isArray(msResult.value) ? msResult.value : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleSave(data: {
    name: string; brand: string | null; category: string
    stock_unit: string; jan_code: string | null; threshold: number; menu_ids: number[]
  }) {
    const res = await api('/api/v1/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('保存に失敗しました')
    await load()
    onChanged()
  }

  async function handleUpdate(data: {
    name: string; brand: string | null; category: string
    stock_unit: string; jan_code: string | null; threshold: number; menu_ids: number[]
  }) {
    if (!editItem) return
    const res = await api(`/api/v1/materials/${editItem.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('更新に失敗しました')
    // PATCHが成功したら即座に一覧のカテゴリを更新（load()の結果を待たずに反映）
    setMaterials(prev => prev.map(m =>
      m.id === editItem.id
        ? { ...m, name: data.name, brand: data.brand, category: data.category, stock_unit: data.stock_unit, jan_code: data.jan_code }
        : m
    ))
    await load()
    onChanged()
  }

  async function handleDelete(id: number) {
    const res = await api(`/api/v1/materials/${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('削除に失敗しました'); return }
    setDetailItem(null)
    await load()
    onChanged()
  }

  const allCats = Array.from(new Set(materials.map(m => m.category)))

  return (
    <>
      {/* トップバー */}
      <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,228,220,0.6)', padding: 4, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <polyline points="13,4 7,10 13,16" stroke="#e8e4dc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ fontSize: 16, fontWeight: 400, color: 'var(--text)', fontFamily: zen }}>メニュー × 材料マスタ</div>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: gold, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.1em' }}
        >+ 材料追加</button>
      </div>

      {/* リスト */}
      <div style={{ padding: '16px 20px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 14, fontFamily: josefin }}>Loading...</div>
        ) : materials.length === 0 ? (
          <div style={{ background: goldDim, border: `1px dashed ${goldBorder}`, borderRadius: 2, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: muted, fontFamily: zen, marginBottom: 10, lineHeight: 1.7 }}>材料が登録されていません</div>
            <button onClick={() => setAddOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: gold }}>+ 材料を追加する</button>
          </div>
        ) : (
          <>
            {allCats.map(cat => {
              const catItems = materials.filter(m => m.category === cat)
              if (catItems.length === 0) return null
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 0 8px' }}>
                    <OrbitSVG size={10} />
                    <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.15em', color: muted }}>{cat}</span>
                  </div>
                  <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2 }}>
                    {catItems.map((m, i) => {
                      const treatmentNames = (m.menus ?? []).filter(x => !retailMenuIds.has(x.menu_id)).map(x => x.menu_name)
                      const hasRetailLink  = (m.menus ?? []).some(x => retailMenuIds.has(x.menu_id))
                      const menuParts      = [...treatmentNames, ...(hasRetailLink ? ['物販'] : [])]
                      const menuLabel      = menuParts.length > 0 ? menuParts.join('、') : null
                      const sub = [m.brand, menuLabel].filter(Boolean).join(' · ')
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (pendingEditRef.current) { clearTimeout(pendingEditRef.current); pendingEditRef.current = null }
                            setEditItem(null); setDetailItem(m)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer',
                            borderBottom: i < catItems.length - 1 ? `1px solid ${border}` : 'none',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                            <div style={{ fontSize: 15, color: 'var(--text)', fontFamily: zen, marginBottom: sub ? 3 : 0 }}>{m.name}</div>
                            {sub && <div style={{ fontSize: 13, color: muted, fontFamily: zen, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{sub}</div>}
                          </div>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                            <polyline points="6,4 10,8 6,12" stroke="#e8e4dc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

          </>
        )}
      </div>

      {/* 詳細シート */}
      {detailItem && (
        <MaterialDetailSheet
          key={detailItem.id}
          material={detailItem}
          retailMenuIds={retailMenuIds}
          onClose={() => setDetailItem(null)}
          onEdit={() => {
            const item = detailItem
            if (pendingEditRef.current) clearTimeout(pendingEditRef.current)
            pendingEditRef.current = setTimeout(() => {
              pendingEditRef.current = null
              setEditItem(item)
            }, 450)
          }}
          onDelete={() => { handleDelete(detailItem.id) }}
        />
      )}

      {/* 編集フォーム */}
      {editItem && (
        <MaterialFormSheet
          key={editItem.id}
          initial={editItem}
          menus={menus}
          existingCategories={allCats}
          onSave={handleUpdate}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* 追加フォーム */}
      {addOpen && (
        <MaterialFormSheet
          menus={menus}
          existingCategories={allCats}
          onSave={handleSave}
          onClose={() => setAddOpen(false)}
        />
      )}
    </>
  )
}

function MicButton({ onResult }: { onResult: (text: string) => void }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)

  function toggle() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('このブラウザは音声入力に対応していません'); return }
    if (listening) { recRef.current?.stop(); return }
    const rec = new SR()
    recRef.current = rec
    rec.lang = 'ja-JP'
    rec.interimResults = false
    rec.continuous = false
    rec.onstart  = () => setListening(true)
    rec.onend    = () => setListening(false)
    rec.onerror  = () => setListening(false)
    rec.onresult = (e: any) => onResult(e.results[0][0].transcript)
    rec.start()
  }

  return (
    <button
      onClick={toggle}
      style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: listening ? 1 : 0.35 }}>
        <rect x="4" y="1" width="6" height="8" rx="3" stroke={listening ? alertC : '#e8e4dc'} strokeWidth="1.2"/>
        <path d="M2 7C2 9.8 4.2 12 7 12C9.8 12 12 9.8 12 7" stroke={listening ? alertC : '#e8e4dc'} strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="7" y2="14" stroke={listening ? alertC : '#e8e4dc'} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

// ─── バーコードスキャナー ──────────────────────────────────────────────────────
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar']

function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef    = useRef<number>(0)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'unsupported' | 'denied'>('starting')

  useEffect(() => {
    if (!('BarcodeDetector' in window)) { setStatus('unsupported'); return }

    // getSupportedFormats でフィルタして存在するフォーマットのみ渡す（デバイス差異を吸収）
    ;(window as any).BarcodeDetector.getSupportedFormats()
      .then((supported: string[]) => {
        const formats = BARCODE_FORMATS.filter(f => supported.includes(f))
        const detector = new (window as any).BarcodeDetector({ formats: formats.length ? formats : BARCODE_FORMATS })

        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
          .then(stream => {
            streamRef.current = stream
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
            setStatus('scanning')

            async function scan() {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                const found = await detector.detect(videoRef.current).catch(() => [] as { rawValue: string }[])
                if (found.length > 0) { onScan(found[0].rawValue); return }
              }
              rafRef.current = requestAnimationFrame(scan)
            }
            rafRef.current = requestAnimationFrame(scan)
          })
          .catch(() => setStatus('denied'))
      })
      .catch(() => setStatus('unsupported'))

    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    img.onload = async () => {
      if (!('BarcodeDetector' in window)) {
        URL.revokeObjectURL(img.src)
        alert('このブラウザはバーコード認識に対応していません')
        return
      }
      const detector = new (window as any).BarcodeDetector({ formats: BARCODE_FORMATS })
      const found = await detector.detect(img).catch(() => [] as { rawValue: string }[])
      URL.revokeObjectURL(img.src)
      if (found.length > 0) onScan(found[0].rawValue)
      else alert('バーコードを認識できませんでした')
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      {close => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'rgba(200,168,130,0.7)', textAlign: 'center' }}>// Barcode Scanner</div>

          {/* カメラビュー — バーコード向け横長 */}
          <div style={{
            width: '100%', height: 220,
            border: `1px solid ${goldBorder}`, borderRadius: 4,
            position: 'relative', background: '#0a0a0a', overflow: 'hidden',
          }}>
            {/* ビデオ（ベースレイヤー） */}
            {status === 'scanning' && (
              <video
                ref={videoRef} playsInline muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            {/* 左右暗幕：バーコード中央帯を強調 */}
            {status === 'scanning' && (
              <>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '6%', height: '100%', background: 'rgba(0,0,0,0.45)' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: '6%', height: '100%', background: 'rgba(0,0,0,0.45)' }} />
              </>
            )}

            {/* コーナーマーカー */}
            {(['tl','tr','bl','br'] as const).map(c => (
              <div key={c} style={{
                position: 'absolute',
                top:    c.startsWith('t') ? 10 : undefined,
                bottom: c.startsWith('b') ? 10 : undefined,
                left:   c.endsWith('l')   ? 10 : undefined,
                right:  c.endsWith('r')   ? 10 : undefined,
                width: 20, height: 20,
                borderTop:    c.startsWith('t') ? `2px solid ${gold}` : undefined,
                borderBottom: c.startsWith('b') ? `2px solid ${gold}` : undefined,
                borderLeft:   c.endsWith('l')   ? `2px solid ${gold}` : undefined,
                borderRight:  c.endsWith('r')   ? `2px solid ${gold}` : undefined,
              }} />
            ))}

            {/* 中央スキャンライン */}
            {status === 'scanning' && (
              <div style={{
                position: 'absolute', top: '50%', left: '8%', right: '8%', height: 1,
                background: `linear-gradient(90deg, transparent 0%, ${gold} 30%, ${gold} 70%, transparent 100%)`,
                transform: 'translateY(-50%)', opacity: 0.7,
              }} />
            )}

            {/* ステータスメッセージ */}
            {status === 'starting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14, color: 'rgba(232,228,220,0.3)', fontFamily: josefin, fontWeight: 100, letterSpacing: '0.1em' }}>起動中...</span>
              </div>
            )}
            {status === 'denied' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
                <span style={{ fontSize: 14, color: muted, fontFamily: zen, textAlign: 'center', lineHeight: 1.8 }}>カメラへのアクセスが<br/>拒否されました</span>
              </div>
            )}
            {status === 'unsupported' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
                <span style={{ fontSize: 14, color: muted, fontFamily: zen, textAlign: 'center', lineHeight: 1.8 }}>カメラスキャン未対応<br/>写真から読み取れます</span>
              </div>
            )}
          </div>

          {status === 'scanning' && (
            <div style={{ fontSize: 14, color: muted, fontFamily: zen, textAlign: 'center', lineHeight: 1.8 }}>
              バーコードを横向きにフレームへ合わせてください
            </div>
          )}

          {/* BarcodeDetector 未対応 / カメラ拒否時のフォールバック */}
          {(status === 'unsupported' || status === 'denied') && (
            <label style={{
              display: 'block', padding: '13px 0', background: gold, borderRadius: 2,
              fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.2em',
              textTransform: 'uppercase' as const, color: 'var(--on-accent)', cursor: 'pointer', textAlign: 'center',
            }}>
              写真から読み取る
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          )}

          <button
            onClick={close}
            style={{ background: 'transparent', border: 'none', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: josefin, letterSpacing: '0.1em', textAlign: 'center' }}
          >キャンセル</button>
        </div>
      )}
    </BottomSheet>
  )
}

// ─── メインページ ─────────────────────────────────────────────────────────────
const FILTERS = ['すべて', '要発注', '注意', '正常', '過剰', 'リスト中', '送信済'] as const

export default function InventoryPage() {
  const claims      = getClaims()
  const isManager   = claims?.role === 'owner' || claims?.role === 'admin'
  const ownStoreId  = claims?.store_id ?? null
  const loc         = useLocation()

  const [items,          setItems]          = useState<InventoryItem[]>([])
  const [stores,         setStores]         = useState<Store[]>([])
  const [dealers,        setDealers]        = useState<Dealer[]>([])
  const [history,        setHistory]        = useState<HistoryOrder[]>([])
  const [historyLoaded,  setHistoryLoaded]  = useState(false)

  const [currentStoreId, setCurrentStoreId] = useState<number | null>(ownStoreId)
  const [isOwnStore,     setIsOwnStore]      = useState(true)
  const [loading,        setLoading]         = useState(true)

  const locState = loc.state as { tab?: string } | null
  const [mainTab,        setMainTab]         = useState<'stock' | 'orders' | 'history'>(
    locState?.tab === 'history' ? 'history' : locState?.tab === 'orders' ? 'orders' : 'stock'
  )
  const [filter,         setFilter]          = useState<string>('すべて')
  const [search,         setSearch]          = useState('')

  const [storeModalOpen, setStoreModalOpen]  = useState(false)
  const [orderItem,      setOrderItem]       = useState<InventoryItem | null>(null)
  const [editItem,       setEditItem]        = useState<InventoryItem | null>(null)

  const [listIds,        setListIds]         = useState<Set<number>>(new Set())
  const [sentIds,        setSentIds]         = useState<Set<number>>(new Set())
  const [receivedOrderIds, setReceivedOrderIds] = useState<Set<number>>(new Set())

  const [pendingOrders,        setPendingOrders]        = useState<HistoryOrder[]>([])
  const [pendingOrdersLoading, setPendingOrdersLoading] = useState(false)
  const [sendingOrderIds,      setSendingOrderIds]      = useState<Set<number>>(new Set())
  const [updatingItems,        setUpdatingItems]        = useState<Set<string>>(new Set())
  const [lineResult,           setLineResult]           = useState<{ orderIds: number[]; url: string } | null>(null)

  const [toastMsg,       setToastMsg]        = useState('')
  const [toastVisible,   setToastVisible]    = useState(false)
  const [scannerOpen,    setScannerOpen]     = useState(false)
  const [view,           setView]            = useState<'main' | 'master'>('main')
  const [editOrderId,    setEditOrderId]     = useState<number | null>(null)

  function showToast(msg: string) {
    setToastMsg(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  function reloadInventory() {
    if (!currentStoreId) return
    setLoading(true)
    apiFetch<InventoryItem[]>(`/api/v1/inventory?store_id=${currentStoreId}`)
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  // 初期データ読み込み
  useEffect(() => {
    apiFetch<Store[]>('/api/v1/stores').then(data => {
      setStores(data)
      if (!ownStoreId && data.length > 0) {
        setCurrentStoreId(data[0].id)
      }
    }).catch(() => showToast('店舗情報の読み込みに失敗しました'))
    apiFetch<Dealer[]>('/api/v1/dealers').then(setDealers).catch(() => showToast('ディーラー情報の読み込みに失敗しました'))
  }, [])

  // 在庫読み込み（店舗変更時）+ 発注済み品目の sentIds 初期化
  useEffect(() => {
    if (!currentStoreId) return
    setLoading(true)
    apiFetch<InventoryItem[]>(`/api/v1/inventory?store_id=${currentStoreId}`)
      .then(data => { setItems(Array.isArray(data) ? data : []) })
      .catch(() => { setItems([]); showToast('在庫データの読み込みに失敗しました') })
      .finally(() => setLoading(false))

    // pending → listIds（リスト中）、sent → sentIds（送信済）として初期表示
    apiFetch<HistoryOrder[]>('/api/v1/orders/history')
      .then(data => {
        const list = Array.isArray(data) ? data : []
        const lIds = new Set<number>()
        const sIds = new Set<number>()
        list.forEach(order => {
          if (order.status === 'pending') {
            ;(order.items ?? []).forEach(it => lIds.add(Number(it.material_id)))
          } else if (order.status === 'sent') {
            ;(order.items ?? []).forEach(it => sIds.add(Number(it.material_id)))
          }
        })
        setListIds(lIds)
        setSentIds(sIds)
        setHistory(list)
        setHistoryLoaded(true)
      })
      .catch(() => { setListIds(new Set()); setSentIds(new Set()) })
  }, [currentStoreId])

  // 発注履歴タブ読み込み
  useEffect(() => {
    if (mainTab !== 'history' || historyLoaded) return
    apiFetch<HistoryOrder[]>('/api/v1/orders/history')
      .then(data => { setHistory(Array.isArray(data) ? data : []); setHistoryLoaded(true) })
      .catch(() => { setHistory([]); setHistoryLoaded(true) })
  }, [mainTab, historyLoaded])

  // 発注リストタブ読み込み（タブ切替のたびに最新を取得）
  useEffect(() => {
    if (mainTab !== 'orders') return
    setPendingOrdersLoading(true)
    apiFetch<HistoryOrder[]>('/api/v1/orders/history')
      .then(data => {
        const list = Array.isArray(data) ? data : []
        const pending = list.filter(o => o.status === 'pending')
        setPendingOrders(pending)
        const lIds = new Set<number>()
        pending.forEach(o => (o.items ?? []).forEach(it => lIds.add(Number(it.material_id))))
        setListIds(lIds)
      })
      .catch(() => setPendingOrders([]))
      .finally(() => setPendingOrdersLoading(false))
  }, [mainTab])

  async function handleSendAll(groupOrders: HistoryOrder[]) {
    if (groupOrders.length === 0) return
    const ids = groupOrders.map(o => o.id)
    ids.forEach(id => setSendingOrderIds(prev => new Set(prev).add(id)))
    try {
      const res = await api('/api/v1/orders/send-group', {
        method: 'POST',
        body: JSON.stringify({ order_ids: ids }),
      })
      if (!res.ok) throw new Error()
      const result: SendResult = await res.json()
      if (result.method === 'LINE' && result.line_url) {
        setLineResult({ orderIds: ids, url: result.line_url })
      } else {
        ids.forEach(id => removeSentOrder(id))
        showToast('発注書を送信しました')
      }
    } catch {
      showToast('送信に失敗しました')
    } finally {
      ids.forEach(id => setSendingOrderIds(prev => { const s = new Set(prev); s.delete(id); return s }))
    }
  }

  function removeSentOrder(orderId: number) {
    const order = pendingOrders.find(o => o.id === orderId)
    if (order) {
      const matIds = (order.items ?? []).map(it => Number(it.material_id))
      setListIds(prev => { const s = new Set(prev); matIds.forEach(id => s.delete(id)); return s })
      setSentIds(prev => { const s = new Set(prev); matIds.forEach(id => s.add(id)); return s })
    }
    setPendingOrders(prev => prev.filter(o => o.id !== orderId))
  }

  function confirmLineSent() {
    if (!lineResult) return
    lineResult.orderIds.forEach(id => removeSentOrder(id))
    setLineResult(null)
    showToast('発注書を送信しました')
  }

  async function handleQtyChange(orderId: number, materialId: number, delta: number) {
    const order = pendingOrders.find(o => o.id === orderId)
    const item = order?.items.find(it => it.material_id === materialId)
    if (!item) return
    const newQty = item.quantity + delta
    if (newQty < 1) return

    setPendingOrders(prev => prev.map(o =>
      o.id !== orderId ? o : {
        ...o, items: o.items.map(it => it.material_id !== materialId ? it : { ...it, quantity: newQty })
      }
    ))
    const key = `${orderId}-${materialId}`
    setUpdatingItems(prev => new Set(prev).add(key))
    try {
      const res = await api(`/api/v1/orders/${orderId}/items/${materialId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setPendingOrders(prev => prev.map(o =>
        o.id !== orderId ? o : {
          ...o, items: o.items.map(it => it.material_id !== materialId ? it : { ...it, quantity: item.quantity })
        }
      ))
      showToast('数量の変更に失敗しました')
    } finally {
      setUpdatingItems(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  async function handleItemDelete(orderId: number, materialId: number) {
    try {
      const res = await api(`/api/v1/orders/${orderId}/items/${materialId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      const result: { order_deleted: boolean } = await res.json()
      if (result.order_deleted) {
        const order = pendingOrders.find(o => o.id === orderId)
        if (order) {
          const matIds = (order.items ?? []).map(it => Number(it.material_id))
          setListIds(prev => { const s = new Set(prev); matIds.forEach(id => s.delete(id)); return s })
        }
        setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      } else {
        const updated = pendingOrders.map(o =>
          o.id !== orderId ? o : { ...o, items: o.items.filter(it => it.material_id !== materialId) }
        )
        setPendingOrders(updated)
        const stillInList = updated.some(o => o.items.some(it => Number(it.material_id) === materialId))
        if (!stillInList) setListIds(prev => { const s = new Set(prev); s.delete(materialId); return s })
      }
    } catch {
      showToast('削除に失敗しました')
    }
  }

  const displayItems = items.filter(it => {
    const matId  = Number(it.material_id)
    const inList = listIds.has(matId)
    // カードに表示されるバッジと完全一致でフィルタリング（ダッシュボードと同じロジック）
    const badge  = inList ? 'リスト中'
                 : sentIds.has(matId) ? '送信済'
                 : it.status
    if (filter !== 'すべて' && badge !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!it.name.toLowerCase().includes(q) &&
          !(it.brand ?? '').toLowerCase().includes(q) &&
          (it.jan_code ?? '') !== search) return false
    }
    return true
  })

  // カテゴリ別グループ化
  const categories = Array.from(new Set(displayItems.map(i => i.category)))
  const currentStoreName = stores.find(s => s.id === currentStoreId)?.name ?? ''

  // 発注履歴グループ（月別）
  // 発注リストタブ用: ディーラーごとグループ
  const pendingGroups: { dealerName: string; contactMethod: string; orders: HistoryOrder[] }[] = []
  const pendingGroupSeen = new Map<string, number>()
  for (const o of pendingOrders) {
    if (pendingGroupSeen.has(o.dealer_name)) {
      pendingGroups[pendingGroupSeen.get(o.dealer_name)!].orders.push(o)
    } else {
      pendingGroupSeen.set(o.dealer_name, pendingGroups.length)
      pendingGroups.push({ dealerName: o.dealer_name, contactMethod: o.contact_method, orders: [o] })
    }
  }

  // 発注履歴タブ用: pending を除外して月別グループ
  const historyByMonth: { label: string; orders: HistoryOrder[] }[] = (() => {
    const map = new Map<string, HistoryOrder[]>()
    history
      .filter(o => o.status !== 'pending' && (!currentStoreId || o.store_id === currentStoreId))
      .forEach(o => {
        const d = new Date(o.created_at)
        const key = `${d.getFullYear()}年${d.getMonth() + 1}月`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(o)
      })
    return Array.from(map.entries()).map(([label, orders]) => ({ label, orders }))
  })()

  if (view === 'master') {
    return (
      <MaterialMasterScreen
        onBack={() => setView('main')}
        onChanged={reloadInventory}
      />
    )
  }

  return (
    <>
      {/* ヘッダー */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 19, fontWeight: 400, color: 'var(--text)', fontFamily: zen }}>在庫管理</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 店舗切替ボタン（manager のみ） */}
          {isManager && stores.length > 1 && (
            <div
              onClick={() => setStoreModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', background: surface,
                border: `1px solid ${border}`, borderRadius: 2, cursor: 'pointer',
              }}
            >
              <OrbitSVG size={10} />
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 13, color: gold }}>{currentStoreName}</span>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <polyline points="2,4 6,8 10,4" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* 他店舗閲覧バナー */}
      {!isOwnStore && (
        <div style={{ margin: '8px 20px 0', padding: '8px 14px', background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: 2 }}>
          <div style={{ fontSize: 13, color: muted, display: 'flex', alignItems: 'flex-start', gap: 6, fontFamily: zen, lineHeight: 1.6 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="6" cy="6" r="5" stroke={gold} strokeWidth="1"/>
              <line x1="6" y1="4" x2="6" y2="6.5" stroke={gold} strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="6" cy="8.5" r="0.6" fill={gold}/>
            </svg>
            <span>他店舗の在庫は<span style={{ color: gold }}>閲覧のみ</span>です。発注・編集は各店舗で行ってください。</span>
          </div>
        </div>
      )}

      {/* メインタブ（在庫状況 / 発注リスト / 発注履歴） */}
      <div style={{ display: 'flex', margin: '10px 20px 0', background: surface, border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden' }}>
        {([
          { key: 'stock',   label: '在庫状況' },
          { key: 'orders',  label: '発注リスト' },
          { key: 'history', label: '発注履歴' },
        ] as const).map(({ key, label }) => {
          const active = mainTab === key
          return (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              style={{
                flex: 1, padding: 10, border: 'none',
                background: active ? goldDim : 'transparent',
                ...(active ? { border: `1px solid ${goldBorder}` } : {}),
                color: active ? gold : muted,
                fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.12em',
                textTransform: 'uppercase' as const, cursor: 'pointer',
              }}
            >{label}</button>
          )
        })}
      </div>

      {/* 在庫状況タブ */}
      {mainTab === 'stock' && (
        <>
          {/* フィルタ */}
          <div className="inv-filter-row" style={{ padding: '10px 20px 0', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
            {FILTERS.map(f => {
              const active = filter === f
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flexShrink: 0, padding: '5px 14px', borderRadius: 2,
                    border: active ? 'none' : `1px solid ${border}`,
                    background: active ? gold : 'transparent',
                    color: active ? '#1a1816' : f === '送信済' ? 'rgba(232,228,220,0.4)' : muted,
                    fontFamily: josefin, fontWeight: active ? 200 : 100,
                    fontSize: 13, letterSpacing: '0.12em', cursor: 'pointer', whiteSpace: 'nowrap' as const,
                  }}
                >{f}</button>
              )
            })}
          </div>

          {/* 検索バー */}
          <div style={{ padding: '10px 20px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(232,228,220,0.04)', border: `1px solid ${border}`, borderRadius: 2, padding: '0 12px', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                <circle cx="7" cy="7" r="5" stroke="#e8e4dc" strokeWidth="1.2"/>
                <line x1="11" y1="11" x2="14" y2="14" stroke="#e8e4dc" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <input
                type="text" placeholder="材料名で検索"
                value={search} onChange={e => setSearch(e.target.value)}
                autoCapitalize="none" autoCorrect="off"
                style={{
                  flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
                  padding: '10px 0', fontSize: 16, color: 'var(--text)', fontFamily: zen, fontWeight: 300,
                  WebkitAppearance: 'none',
                } as React.CSSProperties}
              />
              <MicButton onResult={setSearch} />
              <button
                onClick={() => setScannerOpen(true)}
                style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.35 }}>
                  <rect x="1" y="3" width="2" height="10" fill="#e8e4dc"/>
                  <rect x="4" y="3" width="1" height="10" fill="#e8e4dc"/>
                  <rect x="6" y="3" width="2" height="10" fill="#e8e4dc"/>
                  <rect x="9" y="3" width="1" height="10" fill="#e8e4dc"/>
                  <rect x="11" y="3" width="1" height="10" fill="#e8e4dc"/>
                  <rect x="13" y="3" width="2" height="10" fill="#e8e4dc"/>
                </svg>
              </button>
            </div>
          </div>

          {/* 在庫リスト */}
          <div style={{ padding: '0 20px 40px' }}>
            {/* Master リンク */}
            <div onClick={() => setView('master')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 4px', padding: '12px 16px', background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: 2, cursor: 'pointer' }}>
              <div>
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: gold, opacity: 0.7, marginBottom: 3 }}>// Master</div>
                <div style={{ fontSize: 15, color: gold }}>メニュー × 材料マスタを編集</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polyline points="6,4 10,8 6,12" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {loading && <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 14, fontFamily: josefin }}>Loading...</div>}
            {!loading && displayItems.length === 0 && (
              <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 14, fontFamily: josefin }}>該当する材料がありません</div>
            )}

            {!loading && categories.map(cat => {
              const catItems = displayItems.filter(i => i.category === cat)
              if (catItems.length === 0) return null
              return (
                <div key={cat}>
                  {/* カテゴリラベル */}
                  <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--text)', padding: '16px 0 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <OrbitSVG size={12} /> {cat}
                  </div>
                  {catItems.map(item => (
                    <InvCard
                      key={item.id}
                      item={item}
                      inList={listIds.has(Number(item.material_id))}
                      sent={sentIds.has(Number(item.material_id)) && !listIds.has(Number(item.material_id))}
                      readOnly={!isOwnStore}
                      onOrder={() => setOrderItem(item)}
                      onEdit={() => setEditItem(item)}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 発注リストタブ */}
      {mainTab === 'orders' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 80px' }}>
          {pendingOrdersLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: muted, fontFamily: josefin, fontSize: 13 }}>読み込み中...</div>
          ) : pendingGroups.length === 0 ? (
            <div style={{ background: goldDim, border: `1px dashed ${goldBorder}`, borderRadius: 4, padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: muted, fontFamily: zen, lineHeight: 1.8, marginBottom: 16 }}>
                発注リストは空です。<br />
                在庫アラートが出た商品を「リストに追加」してください。
              </div>
              <button
                onClick={() => setMainTab('stock')}
                style={{
                  background: 'transparent', border: `1px solid ${goldBorder}`, borderRadius: 2,
                  padding: '8px 20px', color: gold, fontFamily: josefin, fontWeight: 100,
                  fontSize: 12, letterSpacing: '0.15em', cursor: 'pointer',
                }}
              >在庫状況を見る</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pendingGroups.map(group => {
                const flatItems = group.orders.flatMap(o => (o.items ?? []).map(it => ({ orderId: o.id, item: it })))
                const isLINE = group.contactMethod === 'LINE'
                const firstOrder = group.orders[0]
                const isSending = group.orders.some(o => sendingOrderIds.has(o.id))
                return (
                  <div key={group.dealerName} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 4 }}>
                    {/* ディーラー名 */}
                    <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 11, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.18em', color: gold, marginBottom: 4 }}>DEALER</div>
                          <div style={{ fontSize: 16, color: 'var(--text)', fontFamily: zen, fontWeight: 400 }}>{group.dealerName}</div>
                        </div>
                        <div style={{
                          fontSize: 11, letterSpacing: '0.12em', fontFamily: josefin,
                          padding: '4px 10px', borderRadius: 1,
                          background: isLINE ? 'rgba(0,195,91,0.1)' : 'rgba(100,150,220,0.1)',
                          border: `1px solid ${isLINE ? 'rgba(0,195,91,0.3)' : 'rgba(100,150,220,0.3)'}`,
                          color: isLINE ? '#4dba7f' : '#6496dc',
                        }}>{isLINE ? 'LINE' : 'Email'}</div>
                      </div>
                      {firstOrder?.is_next_month_invoice && (
                        <div style={{ marginTop: 8, fontSize: 12, color: alertC, fontFamily: zen }}>⚠ 翌月伝票</div>
                      )}
                    </div>
                    {/* 品目一覧 */}
                    <div style={{ padding: '10px 16px' }}>
                      <div style={{ fontSize: 11, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.15em', color: muted, marginBottom: 8 }}>ORDER ITEMS</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {flatItems.map(({ orderId, item }, i) => {
                          const itemKey = `${orderId}-${item.material_id}`
                          const isUpdating = updatingItems.has(itemKey)
                          return (
                            <div
                              key={itemKey}
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 0',
                                borderBottom: i < flatItems.length - 1 ? `1px solid ${border}` : 'none',
                                opacity: isUpdating ? 0.5 : 1,
                              }}
                            >
                              {/* 品名 */}
                              <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: zen, flex: 1, minWidth: 0, paddingRight: 8 }}>{item.material_name}</div>
                              {/* 数量コントロール */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <button
                                  onClick={() => handleQtyChange(orderId, item.material_id, -1)}
                                  disabled={isUpdating || item.quantity <= 1}
                                  style={{
                                    width: 28, height: 28, borderRadius: 2, border: `1px solid ${border}`,
                                    background: 'transparent', color: item.quantity <= 1 ? 'rgba(232,228,220,0.2)' : muted,
                                    fontFamily: josefin, fontSize: 16, lineHeight: 1, cursor: item.quantity <= 1 ? 'default' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                >−</button>
                                <div style={{ minWidth: 32, textAlign: 'center' }}>
                                  <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 18, color: gold }}>{item.quantity}</span>
                                  <span style={{ fontSize: 12, color: muted, fontFamily: zen, marginLeft: 3 }}>{item.unit}</span>
                                </div>
                                <button
                                  onClick={() => handleQtyChange(orderId, item.material_id, 1)}
                                  disabled={isUpdating}
                                  style={{
                                    width: 28, height: 28, borderRadius: 2, border: `1px solid ${border}`,
                                    background: 'transparent', color: muted,
                                    fontFamily: josefin, fontSize: 16, lineHeight: 1, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                >＋</button>
                                {/* 削除ボタン */}
                                <button
                                  onClick={() => handleItemDelete(orderId, item.material_id)}
                                  style={{
                                    width: 28, height: 28, borderRadius: 2, border: `1px solid rgba(224,112,96,0.2)`,
                                    background: 'transparent', color: 'rgba(224,112,96,0.5)',
                                    fontSize: 14, lineHeight: 1, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4,
                                  }}
                                >×</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {/* 送信ボタン */}
                    <div style={{ padding: '12px 16px 14px', borderTop: `1px solid ${border}` }}>
                      <button
                        onClick={() => handleSendAll(group.orders)}
                        disabled={isSending}
                        style={{
                          width: '100%', padding: '13px 0',
                          background: isSending ? 'rgba(200,168,130,0.3)' : gold,
                          border: 'none', borderRadius: 2,
                          fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.25em',
                          textTransform: 'uppercase' as const,
                          color: isSending ? muted : '#1a1816',
                          cursor: isSending ? 'default' : 'pointer',
                        }}
                      >{isSending ? '送信中...' : isLINE ? 'LINE で送信する' : 'メールで送信する'}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {/* LINE モーダル */}
          {lineResult && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 400,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}>
              <div style={{
                width: '100%', maxWidth: 480, background: 'var(--bg)',
                borderTop: `1px solid ${goldBorder}`, borderRadius: '16px 16px 0 0',
                padding: '24px 20px 40px',
              }}>
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.25em', color: gold, marginBottom: 12 }}>LINE 発注</div>
                <div style={{ fontSize: 15, color: 'var(--text)', fontFamily: zen, lineHeight: 1.8, marginBottom: 20 }}>
                  下のボタンをタップするとLINEが開き、発注書のURLが貼り付けられます。<br />
                  送信後、「送信完了」を押してステータスを更新してください。
                </div>
                <a
                  href={lineResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block', width: '100%', padding: '13px 0', marginBottom: 10, boxSizing: 'border-box' as const,
                    background: '#00c35b', border: 'none', borderRadius: 2, textDecoration: 'none',
                    fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.25em',
                    textTransform: 'uppercase' as const, color: '#fff', textAlign: 'center' as const, cursor: 'pointer',
                  }}
                >LINE で開く</a>
                <button
                  onClick={() => confirmLineSent()}
                  style={{
                    width: '100%', padding: '13px 0', marginBottom: 8,
                    background: 'transparent', border: `1px solid ${goldBorder}`, borderRadius: 2,
                    fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.15em',
                    color: gold, cursor: 'pointer',
                  }}
                >送信完了</button>
                <button
                  onClick={() => setLineResult(null)}
                  style={{
                    width: '100%', padding: '11px 0',
                    background: 'transparent', border: 'none',
                    fontFamily: josefin, fontSize: 12, letterSpacing: '0.1em',
                    color: muted, cursor: 'pointer',
                  }}
                >キャンセル</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 発注履歴タブ */}
      {mainTab === 'history' && (
        <div style={{ padding: '8px 20px 40px' }}>
          {!historyLoaded && <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 14, fontFamily: josefin }}>Loading...</div>}
          {historyLoaded && historyByMonth.length === 0 && (
            <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 14, fontFamily: josefin }}>発注履歴がありません</div>
          )}
          {historyByMonth.map(({ label, orders }) => (
            <div key={label} style={{ marginBottom: 4 }}>
              {/* 月ヘッダー */}
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: muted, padding: '8px 0 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <OrbitSVG size={10} /> {label}
              </div>
              {orders.map(o => {
                const d = new Date(o.created_at)
                const dateStr = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
                const firstItem = o.items?.[0]
                const productLabel = firstItem
                  ? `${firstItem.material_name} × ${firstItem.quantity}${firstItem.unit}`
                  : '—'
                const costLabel = firstItem?.estimated_cost ? `目安 ¥${firstItem.estimated_cost.toLocaleString('ja-JP')}` : ''
                const st = STATUS_STYLE[o.status] ?? STATUS_STYLE.pending
                const stLabel = STATUS_LABEL[o.status] ?? '送信済'

                return (
                  <div
                    key={o.id}
                    style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, padding: '14px 16px', marginBottom: 8 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)', fontFamily: zen, marginBottom: 3 }}>{productLabel}</div>
                        <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>
                          {o.dealer_name} · {o.contact_method === 'LINE' ? 'LINE' : 'メール'}
                        </div>
                      </div>
                      <div style={{
                        fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                        padding: '3px 10px', borderRadius: 1, whiteSpace: 'nowrap' as const, flexShrink: 0, marginLeft: 8,
                        ...st,
                      }}>{stLabel}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${border}` }}>
                      <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>
                        {dateStr}{costLabel ? ` · ${costLabel}` : ''}
                      </div>
                      {o.status === 'sent' && !receivedOrderIds.has(o.id) && (
                        <button
                          style={{
                            padding: '6px 14px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 2,
                            fontSize: 12, color: muted, cursor: 'pointer', fontFamily: josefin, letterSpacing: '0.08em',
                          }}
                          onClick={() => {
                            const inv = items.find(i => firstItem && Number(i.material_id) === firstItem.material_id)
                            if (inv) {
                              setEditItem(inv)
                              setEditOrderId(o.id)
                            } else {
                              const oid = o.id
                              setReceivedOrderIds(prev => { const s = new Set(prev); s.add(oid); return s })
                              setHistory(prev => prev.map(h => h.id === oid ? { ...h, status: 'delivered' } : h))
                              api(`/api/v1/orders/${oid}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'delivered' }) }).catch(() => {})
                              showToast('発注ステータスを更新しました')
                            }
                          }}
                        >在庫数を更新する</button>
                      )}
                      {o.status === 'received' && (
                        <button
                          style={{
                            padding: '6px 14px', background: 'transparent', border: `1px solid ${goldBorder}`, borderRadius: 2,
                            fontSize: 12, color: gold, cursor: 'pointer', fontFamily: josefin, letterSpacing: '0.08em',
                          }}
                          onClick={() => {
                            const oid = o.id
                            setHistory(prev => prev.map(h => h.id === oid ? { ...h, status: 'delivered' } : h))
                            api(`/api/v1/orders/${oid}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'delivered' }) }).catch(() => {})
                            showToast('納品済にしました')
                          }}
                        >納品済にする</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* モーダル群 */}
      {storeModalOpen && (
        <StoreModal
          stores={stores}
          ownStoreId={ownStoreId}
          currentStoreId={currentStoreId}
          onSelect={(id, isOwn) => { setCurrentStoreId(id); setIsOwnStore(isOwn) }}
          onClose={() => setStoreModalOpen(false)}
        />
      )}
      {orderItem && (
        <OrderModal
          item={orderItem}
          storeId={currentStoreId!}
          dealers={dealers}
          onClose={() => setOrderItem(null)}
          onDone={() => {
            setListIds(prev => new Set(prev).add(Number(orderItem.material_id)))
            setHistoryLoaded(false)
            setOrderItem(null)
            showToast(`${orderItem.name} を発注リストに追加しました`)
          }}
        />
      )}
      {editItem && (
        <EditModal
          item={editItem}
          onClose={() => { setEditItem(null); setEditOrderId(null) }}
          onDone={newQty => {
            setItems(prev => prev.map(i => {
              if (i.id !== editItem.id) return i
              const thr = i.threshold
              const status: InventoryItem['status'] =
                newQty <= thr / 2 ? '要発注' : newQty <= thr ? '注意' : newQty > thr * 2 ? '過剰' : '正常'
              const barW = Math.min(100, Math.round((newQty / (thr * 2)) * 100))
              return { ...i, quantity: newQty, status, bar_width: barW }
            }))

            // この材料に紐づく sent 注文をすべて received に更新（DBも更新）
            const matId = editItem.material_id
            const sentOrders = history.filter(o =>
              o.status === 'sent' &&
              (o.items ?? []).some(it => Number(it.material_id) === matId)
            )
            if (sentOrders.length > 0) {
              setSentIds(prev => { const s = new Set(prev); s.delete(matId); return s })
              setHistory(prev => prev.map(o =>
                sentOrders.some(so => so.id === o.id) ? { ...o, status: 'delivered' } : o
              ))
              sentOrders.forEach(o => {
                api(`/api/v1/orders/${o.id}/status`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: 'delivered' }),
                }).catch(() => {})
              })
            }

            if (editOrderId !== null) {
              const oid = editOrderId
              setReceivedOrderIds(prev => { const s = new Set(prev); s.add(oid); return s })
              setHistory(prev => prev.map(o => o.id === oid ? { ...o, status: 'delivered' } : o))
              const alreadyPatched = sentOrders.some(o => o.id === oid)
              if (!alreadyPatched) {
                api(`/api/v1/orders/${oid}/status`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: 'delivered' }),
                }).catch(() => {})
              }
              setEditOrderId(null)
            }

            setEditItem(null)
            showToast('在庫数を更新しました')
          }}
        />
      )}
      {scannerOpen && (
        <BarcodeScanner
          onScan={code => { setSearch(code); setScannerOpen(false) }}
          onClose={() => setScannerOpen(false)}
        />
      )}
      <Toast message={toastMsg} visible={toastVisible} />
    </>
  )
}
