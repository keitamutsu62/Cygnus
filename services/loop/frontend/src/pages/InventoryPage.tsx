import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { api } from '../lib/api'

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
}

const STATUS_COLOR: Record<string, string> = {
  '要発注': '#e07060',
  '注意':   '#c8a882',
  '正常':   '#6dba8e',
  '過剰':   '#6496dc',
}

const FILTERS = ['すべて', '要発注', '注意', '正常', '過剰'] as const

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filter, setFilter] = useState<typeof FILTERS[number]>('すべて')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/v1/inventory')
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(it => {
    if (filter !== 'すべて' && it.status !== filter) return false
    if (search && !it.name.toLowerCase().includes(search.toLowerCase()) &&
        !(it.brand ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const josefin = "'Josefin Sans', sans-serif"
  const zen     = "'Zen Kaku Gothic New', sans-serif"
  const muted   = 'rgba(232,228,220,0.55)'
  const border  = 'rgba(232,228,220,0.1)'

  return (
    <AppLayout>
      {/* タイトル */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 19, fontWeight: 400, color: '#e8e4dc', fontFamily: zen }}>在庫管理</div>
      </div>

      {/* フィルタ */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px', overflowX: 'auto', flexShrink: 0 }}>
        {FILTERS.map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flexShrink: 0,
                padding: '5px 14px',
                borderRadius: 2,
                border: active ? 'none' : `1px solid ${border}`,
                background: active ? '#c8a882' : 'transparent',
                color: active ? '#1a1816' : muted,
                fontFamily: josefin,
                fontWeight: active ? 200 : 100,
                fontSize: 11,
                letterSpacing: '0.12em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >{f}</button>
          )
        })}
      </div>

      {/* 検索 */}
      <div style={{ padding: '0 20px 12px', position: 'relative' }}>
        <input
          type="search"
          placeholder="材料名・ブランドで検索"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          style={{
            width: '100%',
            background: 'rgba(232,228,220,0.04)',
            border: `1px solid ${border}`,
            borderRadius: 2,
            padding: '10px 14px',
            fontSize: 14,
            color: '#e8e4dc',
            fontFamily: zen,
            fontWeight: 300,
            outline: 'none',
          }}
        />
      </div>

      {/* リスト */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 13, fontFamily: josefin }}>
            Loading...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 13, fontFamily: josefin }}>
            該当する材料がありません
          </div>
        )}
        {filtered.map(item => (
          <InventoryCard key={item.id} item={item} />
        ))}
      </div>
    </AppLayout>
  )
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const color  = STATUS_COLOR[item.status] ?? '#e8e4dc'
  const josefin = "'Josefin Sans', sans-serif"
  const zen    = "'Zen Kaku Gothic New', sans-serif"
  const muted  = 'rgba(232,228,220,0.55)'

  const brandLabel = [item.brand, item.size_amount ? `${item.size_amount}${item.size_unit}` : null]
    .filter(Boolean).join(' · ')

  const borderColor: Record<string, string> = {
    '要発注': '#e07060',
    '注意':   '#c8a882',
    '正常':   '#6dba8e',
    '過剰':   '#6496dc',
  }

  return (
    <div style={{
      background: '#211f1d',
      borderRadius: 2,
      borderLeft: `3px solid ${borderColor[item.status] ?? '#e8e4dc'}`,
      padding: '14px 16px',
    }}>
      {/* 上段：名前 + バッジ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 400, color: '#e8e4dc', fontFamily: zen }}>{item.name}</div>
          {brandLabel && (
            <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily: zen }}>{brandLabel}</div>
          )}
        </div>
        <div style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          padding: '3px 8px',
          borderRadius: 1,
          background: `${color}18`,
          color,
          fontFamily: josefin,
          fontWeight: 100,
          flexShrink: 0,
          marginLeft: 8,
        }}>{item.status}</div>
      </div>

      {/* バー */}
      <div style={{ height: 3, background: 'rgba(232,228,220,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${item.bar_width}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>

      {/* 下段：在庫数 + ボタン */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 22, lineHeight: 1, color }}>{item.quantity}</span>
          <span style={{ fontSize: 12, color: muted }}>{item.stock_unit}</span>
          <span style={{ fontSize: 12, color: muted, margin: '0 4px' }}>/</span>
          <span style={{ fontSize: 12, color: muted }}>閾値 {item.threshold}{item.stock_unit}</span>
        </div>

        {item.status === '要発注' || item.status === '注意' ? (
          <button style={{
            padding: '6px 14px',
            border: `1px solid ${color}`,
            borderRadius: 2,
            background: 'transparent',
            color,
            fontFamily: josefin,
            fontWeight: 100,
            fontSize: 11,
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}>発注する</button>
        ) : item.status === '過剰' ? (
          <span style={{ fontSize: 11, color: muted, fontFamily: josefin, opacity: 0.5 }}>過剰</span>
        ) : (
          <button style={{
            padding: '6px 14px',
            border: `1px solid rgba(232,228,220,0.12)`,
            borderRadius: 2,
            background: 'transparent',
            color: muted,
            fontFamily: josefin,
            fontWeight: 100,
            fontSize: 11,
            letterSpacing: '0.1em',
            cursor: 'default',
            opacity: 0.6,
          }}>発注済</button>
        )}
      </div>
    </div>
  )
}
