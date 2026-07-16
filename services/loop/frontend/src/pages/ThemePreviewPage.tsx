import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import SalesPage from './SalesPage'
import ReviewsPage from './ReviewsPage'

type PreviewWin = {
  __CYGNUS_PREVIEW?: boolean
  __CYGNUS_PREVIEW_MOCK_FN?: (path: string) => unknown | undefined
}

const today = new Date()
const iso = (d: Date) => d.toISOString().slice(0, 10)

function buildDailySales(days: number) {
  const out: Array<{ date: string; total_sales: number; tech_sales: number; retail_sales: number; client_count: number }> = []
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const base = 145000 + Math.round(Math.sin(i * 0.9) * 30000) + (i === 0 ? 0 : Math.round(Math.random() * 20000))
    out.push({
      date: iso(d),
      total_sales: base,
      tech_sales:  Math.round(base * 0.78),
      retail_sales: Math.round(base * 0.22),
      client_count: 12 + Math.round(Math.sin(i * 0.7) * 3),
    })
  }
  return out
}

const MOCK_STORES = [
  { id: 1, name: '表参道店' },
  { id: 2, name: '北千住店' },
]

const MOCK_STAFFS = [
  { id: 11, name: '田中 美咲', role: 'admin',   store_id: 1, avatar_initials: 'MT', avatar_url: null, is_active: true },
  { id: 12, name: '佐藤 れな', role: 'staff',   store_id: 1, avatar_initials: 'RS', avatar_url: null, is_active: true },
  { id: 13, name: '山本 あい', role: 'staff',   store_id: 1, avatar_initials: 'AY', avatar_url: null, is_active: true },
  { id: 14, name: '鈴木 花',   role: 'staff',   store_id: 2, avatar_initials: 'HS', avatar_url: null, is_active: true },
]

const MOCK_STAFF_SUMMARY = [
  { staff_id: 11, name: '田中 美咲', avatar_initials: 'MT', total_sales: 68000, client_count: 4 },
  { staff_id: 12, name: '佐藤 れな', avatar_initials: 'RS', total_sales: 42000, client_count: 3 },
  { staff_id: 13, name: '山本 あい', avatar_initials: 'AY', total_sales: 25000, client_count: 2 },
]

const MOCK_REVIEWS = [
  { id: 6, store_id: 1, staff_id: 11, staff_name: '田中 美咲', menu_id: 1, menu_name: 'カラー', rating_overall: 5, rating_finish: 5, rating_service: 5, comment: 'カラーの仕上がりがとても自然で嬉しかったです。また来ます！', created_at: `${iso(today)}T14:30:00Z` },
  { id: 5, store_id: 1, staff_id: 12, staff_name: '佐藤 れな', menu_id: 2, menu_name: 'カット', rating_overall: 4, rating_finish: 5, rating_service: 3, comment: '技術は高いと思いますが、もう少し会話が弾むといいな。', created_at: `${iso(today)}T11:20:00Z` },
  { id: 4, store_id: 1, staff_id: 11, staff_name: '田中 美咲', menu_id: 1, menu_name: 'カラー', rating_overall: 4, rating_finish: 5, rating_service: 4, comment: '待ち時間が少し長かったですが仕上がりには満足です。', created_at: `${iso(new Date(today.getTime() - 86400000))}T16:00:00Z` },
  { id: 3, store_id: 1, staff_id: 13, staff_name: '山本 あい', menu_id: 4, menu_name: 'トリートメント', rating_overall: 4, rating_finish: 4, rating_service: 5, comment: '笑顔が素敵でした。', created_at: `${iso(new Date(today.getTime() - 86400000))}T13:15:00Z` },
  { id: 2, store_id: 1, staff_id: 12, staff_name: '佐藤 れな', menu_id: 3, menu_name: 'パーマ', rating_overall: 5, rating_finish: 5, rating_service: 5, comment: '最高でした！', created_at: `${iso(new Date(today.getTime() - 86400000 * 2))}T10:30:00Z` },
  { id: 1, store_id: 1, staff_id: 11, staff_name: '田中 美咲', menu_id: 2, menu_name: 'カット', rating_overall: 5, rating_finish: 5, rating_service: 5, comment: 'カウンセリングが丁寧で安心できました。', created_at: `${iso(new Date(today.getTime() - 86400000 * 3))}T15:00:00Z` },
]

function loopMock(path: string): unknown | undefined {
  if (path === '/api/v1/stores') return MOCK_STORES
  if (path === '/api/v1/staffs') return MOCK_STAFFS
  if (path.startsWith('/api/v1/reviews')) return MOCK_REVIEWS
  if (path.startsWith('/api/v1/sales/store?')) return buildDailySales(8)
  if (path.startsWith('/api/v1/sales/store/staff?')) return MOCK_STAFF_SUMMARY
  if (path.startsWith('/api/v1/sales/staff/menus?')) return [
    { menu_id: 1, menu_name: 'カラー',       total_amount: 68000, count: 8 },
    { menu_id: 2, menu_name: 'カット',       total_amount: 44000, count: 12 },
    { menu_id: 3, menu_name: 'トリートメント', total_amount: 22000, count: 6 },
    { menu_id: 4, menu_name: 'パーマ',       total_amount: 18000, count: 3 },
  ]
  if (path.startsWith('/api/v1/sales/staff?')) return buildDailySales(8)
  return undefined
}

export default function ThemePreviewPage() {
  const { page, theme } = useParams<{ page: string; theme: string }>()
  // 子コンポーネントの apiFetch より前にmockを確定させる（useState初期化 = 初回 render 中）
  useState(() => {
    const w = window as unknown as PreviewWin
    w.__CYGNUS_PREVIEW = true
    w.__CYGNUS_PREVIEW_MOCK_FN = loopMock
    return null
  })
  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  if (page === 'sales') return <SalesPage />
  if (page === 'reviews') return <ReviewsPage />
  return <DashboardPage />
}
