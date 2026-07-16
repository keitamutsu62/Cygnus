import { useParams } from 'react-router-dom'
import HomePage from './HomePage'
import ArchivePage from './ArchivePage'
import TimelinePage from './TimelinePage'
import ProfilePage from './ProfilePage'

type PreviewWin = { __CYGNUS_PREVIEW_MOCKS?: Record<string, unknown> }

const today = new Date()
const iso = (d: Date) => d.toISOString().slice(0, 10)

// 1x1 透明 PNG（作品カード枠だけ表示させるためのプレースホルダー）
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130"><rect width="100" height="130" fill="%23c8a882" opacity="0.35"/><text x="50" y="70" text-anchor="middle" fill="white" font-family="sans-serif" font-size="10" opacity="0.8">SAMPLE</text></svg>'
).replace(/%23/g, '#')

// `/preview` 配下でのみモックを有効化する。
// これがないと PreviewPage の import だけでモックが全画面に漏れて実データが返らなくなる。
if (window.location.pathname.startsWith('/preview')) {
;(window as unknown as PreviewWin).__CYGNUS_PREVIEW_MOCKS = {
  '/api/v1/studio/memos': [
    { id: 3, memo_date: iso(today), text: 'カラーの明度合わせがスムーズにできた。次回もこの配合で確認。', created_at: today.toISOString() },
    { id: 2, memo_date: iso(new Date(today.getTime() - 86400000)),     text: '接客中の会話展開で好評。技術説明を2回入れた。' },
    { id: 1, memo_date: iso(new Date(today.getTime() - 86400000 * 3)), text: 'ブロー時のトップふんわり感を意識。仕上がりに満足いただけた。' },
  ],
  '/api/v1/studio/stats/monthly': {
    total_sales: 462000,
    treatment_count: 28,
    repeat_rate: 68,
    new_clients: 5,
    sales_diff_pct: 12,
    nomination_rate: 58,
  },
  '/api/v1/studio/treatments/recent': [
    { id: 4, menu_name: 'カット + カラー', price: 15400, performed_at: iso(today),                                performed_time: '14:00', notes: null, client_name: null },
    { id: 3, menu_name: 'カット',           price: 5500,  performed_at: iso(new Date(today.getTime() - 86400000)),  performed_time: '11:30', notes: null, client_name: null },
    { id: 2, menu_name: 'カラー',           price: 9900,  performed_at: iso(new Date(today.getTime() - 86400000 * 2)), performed_time: '16:00', notes: null, client_name: null },
    { id: 1, menu_name: 'トリートメント',   price: 4400,  performed_at: iso(new Date(today.getTime() - 86400000 * 3)), performed_time: '10:00', notes: null, client_name: null },
  ],
  '/api/v1/studio/works': [
    { id: 4, cygnus_account_id: 1, menu_id: 1, title: '透け感のあるベージュ',    image_url: PLACEHOLDER_IMG, tags: JSON.stringify(['カラー']), is_published: true, created_at: today.toISOString() },
    { id: 3, cygnus_account_id: 1, menu_id: 2, title: 'ミニマルボブ',            image_url: PLACEHOLDER_IMG, tags: JSON.stringify(['カット']), is_published: true, created_at: today.toISOString() },
    { id: 2, cygnus_account_id: 1, menu_id: 1, title: 'ハイライトグレージュ',    image_url: PLACEHOLDER_IMG, tags: JSON.stringify(['カラー']), is_published: true, created_at: today.toISOString() },
    { id: 1, cygnus_account_id: 1, menu_id: 3, title: 'ゆるふわパーマ',          image_url: PLACEHOLDER_IMG, tags: JSON.stringify(['パーマ']), is_published: true, created_at: today.toISOString() },
  ],
  '/api/v1/studio/menus': [
    { id: 1, name: 'カラー',        price: 9900,  duration_minutes: 90, menu_type: 'treatment' },
    { id: 2, name: 'カット',        price: 5500,  duration_minutes: 60, menu_type: 'treatment' },
    { id: 3, name: 'パーマ',        price: 11000, duration_minutes: 90, menu_type: 'treatment' },
    { id: 4, name: 'トリートメント', price: 4400,  duration_minutes: 30, menu_type: 'treatment' },
  ],
  '/api/v1/studio/careers': [
    { id: 2, salon_name: 'HAIR SALON Cygnus 表参道店', role: 'スタイリスト', start_year: 2024, start_month: 4, end_year: null, end_month: null, is_current: true },
    { id: 1, salon_name: 'Salon HANA',                 role: 'アシスタント', start_year: 2021, start_month: 4, end_year: 2024, end_month: 3, is_current: false },
  ],
  '/api/v1/studio/memberships': [
    { salon_name: 'HAIR SALON Cygnus 表参道店', role: 'スタイリスト', is_active: true,  joined_at: '2024-04-01', left_at: null },
  ],
  '/api/v1/studio/treatments/count': { count: 328 },
  '/api/v1/studio/profile': {
    cygnus_account_id: 1,
    avatar_url: undefined,
    bio: 'ヘアデザインを通じて、その人らしさを引き出すことを大切にしています。',
    specialties: JSON.stringify(['カラー', 'カット', 'ハイライト']),
    instagram_url: 'https://instagram.com/example',
    is_published: true,
    shimei_charge: 2000,
  },
}
}

export default function PreviewPage() {
  const { page } = useParams<{ page: string }>()
  if (page === 'archive')  return <ArchivePage />
  if (page === 'timeline') return <TimelinePage />
  if (page === 'profile')  return <ProfilePage />
  return <HomePage />
}
