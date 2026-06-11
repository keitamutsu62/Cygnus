import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, apiFetch } from '../lib/api'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = 'var(--accent)'
const muted   = 'var(--text-muted)'
const border  = 'var(--border)'
const goldBorder = 'var(--accent-border)'
const goldDim    = 'var(--accent-dim)'
const surface    = 'var(--surface)'
const alertC     = '#e07060'

type OrderItem = {
  material_id: number
  material_name: string
  jan_code: string | null
  quantity: number
  unit: string
  estimated_cost: number | null
}

type Order = {
  id: number
  store_id: number
  status: string
  is_next_month_invoice: boolean
  created_at: string
  dealer_name: string
  contact_method: string
  items: OrderItem[]
}

type SendResult = {
  method: string
  line_url: string
  pdf_url: string
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState<Set<number>>(new Set())
  const [lineResult, setLineResult] = useState<{ orderId: number; url: string } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch<Order[]>('/api/v1/orders/history')
      const pending = (Array.isArray(data) ? data : []).filter(o => o.status === 'pending')
      setOrders(pending)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSend(orderId: number) {
    setSending(prev => new Set(prev).add(orderId))
    try {
      const res = await api(`/api/v1/orders/${orderId}/send`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const result: SendResult = await res.json()

      if (result.method === 'LINE' && result.line_url) {
        setLineResult({ orderId, url: result.line_url })
      } else {
          setOrders(prev => prev.filter(o => o.id !== orderId))
      }
    } catch {
      alert('送信に失敗しました')
    } finally {
      setSending(prev => { const s = new Set(prev); s.delete(orderId); return s })
    }
  }

  function confirmLineSent(orderId: number) {
    setLineResult(null)
    setOrders(prev => prev.filter(o => o.id !== orderId))
  }

  // ディーラーごとにグループ化
  const groups: { dealerName: string; contactMethod: string; orders: Order[] }[] = []
  const seen = new Map<string, number>()
  for (const o of orders) {
    if (seen.has(o.dealer_name)) {
      groups[seen.get(o.dealer_name)!].orders.push(o)
    } else {
      seen.set(o.dealer_name, groups.length)
      groups.push({ dealerName: o.dealer_name, contactMethod: o.contact_method, orders: [o] })
    }
  }

  return (
    <>
      {/* ヘッダー */}
      <div style={{ padding: '14px 20px 0 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/inventory')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, display: 'flex' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <polyline points="13,4 7,10 13,16" stroke="#e8e4dc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <div style={{ fontSize: 11, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.25em', color: gold, marginBottom: 2 }}>ORDERS</div>
          <div style={{ fontSize: 17, fontWeight: 400, color: 'var(--text)', fontFamily: zen }}>発注リスト</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: muted, fontFamily: josefin, fontSize: 13 }}>読み込み中...</div>
        ) : orders.length === 0 ? (
          <div style={{ background: goldDim, border: `1px dashed ${goldBorder}`, borderRadius: 4, padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: muted, fontFamily: zen, lineHeight: 1.8, marginBottom: 16 }}>
              発注リストは空です。<br />
              在庫ページでアラートが出た商品を「リストに追加」してください。
            </div>
            <button
              onClick={() => navigate('/inventory')}
              style={{
                background: 'transparent', border: `1px solid ${goldBorder}`, borderRadius: 2,
                padding: '8px 20px', color: gold, fontFamily: josefin, fontWeight: 100,
                fontSize: 12, letterSpacing: '0.15em', cursor: 'pointer',
              }}
            >在庫ページへ</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groups.map(group => (
              <GroupCard
                key={group.dealerName}
                group={group}
                sending={group.orders.some(o => sending.has(o.id))}
                onSend={() => {
                  // グループ内の最初の pending order を送信
                  const order = group.orders[0]
                  if (order) handleSend(order.id)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* LINEモーダル */}
      {lineResult && (
        <LINEModal
          url={lineResult.url}
          onConfirm={() => confirmLineSent(lineResult.orderId)}
          onClose={() => setLineResult(null)}
        />
      )}
    </>
  )
}

function GroupCard({
  group, sending, onSend,
}: {
  group: { dealerName: string; contactMethod: string; orders: Order[] }
  sending: boolean
  onSend: () => void
}) {
  const allItems: OrderItem[] = group.orders.flatMap(o => o.items ?? [])
  const isLINE = group.contactMethod === 'LINE'
  const latestOrder = group.orders[0]

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 4 }}>
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
        {latestOrder?.is_next_month_invoice && (
          <div style={{ marginTop: 8, fontSize: 12, color: alertC, fontFamily: zen }}>⚠ 翌月伝票</div>
        )}
      </div>

      {/* 品目一覧 */}
      <div style={{ padding: '10px 16px' }}>
        <div style={{ fontSize: 11, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.15em', color: muted, marginBottom: 8 }}>ORDER ITEMS</div>
        {allItems.length === 0 ? (
          <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>品目なし</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {allItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: i < allItems.length - 1 ? `1px solid ${border}` : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: zen }}>{item.material_name}</div>
                  {item.jan_code && (
                    <div style={{ fontSize: 11, color: muted, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.05em', marginTop: 2 }}>
                      JAN: {item.jan_code}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 18, color: gold }}>{item.quantity}</span>
                  <span style={{ fontSize: 13, color: muted, fontFamily: zen }}>{item.unit}</span>
                  {item.estimated_cost != null && (
                    <span style={{ fontSize: 12, color: muted, fontFamily: josefin, marginLeft: 4 }}>¥{item.estimated_cost.toLocaleString('ja-JP')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 送信ボタン */}
      <div style={{ padding: '12px 16px 14px', borderTop: `1px solid ${border}` }}>
        <button
          onClick={onSend}
          disabled={sending}
          style={{
            width: '100%', padding: '13px 0',
            background: sending ? 'rgba(200,168,130,0.3)' : gold,
            border: 'none', borderRadius: 2,
            fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: sending ? muted : '#1a1816',
            cursor: sending ? 'default' : 'pointer',
          }}
        >
          {sending ? '送信中...' : isLINE ? 'LINE で送信する' : 'メールで送信する'}
        </button>
      </div>
    </div>
  )
}

function LINEModal({ url, onConfirm, onClose }: { url: string; onConfirm: () => void; onClose: () => void }) {
  return (
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
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%', padding: '13px 0', marginBottom: 10, boxSizing: 'border-box',
            background: '#00c35b', border: 'none', borderRadius: 2, textDecoration: 'none',
            fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.25em',
            textTransform: 'uppercase', color: '#fff', textAlign: 'center', cursor: 'pointer',
          }}
        >LINE で開く</a>

        <button
          onClick={onConfirm}
          style={{
            width: '100%', padding: '13px 0', marginBottom: 8,
            background: 'transparent', border: `1px solid ${goldBorder}`, borderRadius: 2,
            fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.15em',
            color: gold, cursor: 'pointer',
          }}
        >送信完了</button>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px 0',
            background: 'transparent', border: 'none',
            fontFamily: josefin, fontSize: 12, letterSpacing: '0.1em',
            color: muted, cursor: 'pointer',
          }}
        >キャンセル</button>
      </div>
    </div>
  )
}
