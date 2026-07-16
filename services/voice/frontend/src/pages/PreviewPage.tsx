import { useEffect, useState } from 'react'
import { useParams, Routes, Route } from 'react-router-dom'
import SurveyPage from './SurveyPage'
import ThankYouPage from './ThankYouPage'
import AdminLayout from './admin/AdminLayout'
import DashboardPage from './admin/DashboardPage'
import StaffsPage from './admin/StaffsPage'
import StaffDetailPage from './admin/StaffDetailPage'
import ResponsesPage from './admin/ResponsesPage'

const MOCK_STAFFS = [
  { id: 1, name: '田中 美咲', role: 'スタイリスト', photo: null, overall: 4.8, count: 32 },
  { id: 2, name: '佐藤 れな', role: 'スタイリスト', photo: null, overall: 4.5, count: 28 },
  { id: 3, name: '山本 あい', role: 'アシスタント', photo: null, overall: 4.3, count: 21 },
  { id: 4, name: '鈴木 花',   role: 'アシスタント', photo: null, overall: 4.1, count: 15 },
]

const MOCK_MENUS = [
  { id: 1, name: 'カット' },
  { id: 2, name: 'カラー' },
  { id: 3, name: 'パーマ' },
  { id: 4, name: 'トリートメント' },
]

function installFetchMock() {
  const orig = window.fetch
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (/\/api\/v1\/public\/stores\/[^/]+\/staffs/.test(url)) {
      return new Response(JSON.stringify(MOCK_STAFFS.map(s => ({ id: s.id, name: s.name }))), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (/\/api\/v1\/public\/stores\/[^/]+\/menus/.test(url)) {
      return new Response(JSON.stringify(MOCK_MENUS), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (/\/api\/v1\/public\/stores\/[^/]+\/reviews/.test(url)) {
      return new Response(JSON.stringify({ id: 999 }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    return orig(input, init)
  }
  return () => { window.fetch = orig }
}

function installLocalStorageMock() {
  localStorage.setItem('cygnus_salon_name', 'HAIR SALON Cygnus 表参道店')
  localStorage.setItem('cygnus_staffs', JSON.stringify(MOCK_STAFFS))
  localStorage.setItem('cygnus_google_review_url', 'https://g.page/r/CxxxxxxxxxxxxxxxE/review')
}

function useVoicePreviewBoot() {
  // 子コンポーネントの render/useEffect より前に、localStorage と fetch mock を確定させる
  useState(() => {
    installLocalStorageMock()
    installFetchMock()
    return null
  })
}

// ── survey (顧客フォーム) ─────────────────────────────
function SurveyPreview() {
  useVoicePreviewBoot()
  return <SurveyPage previewStoreId="1" />
}

// ── thanks ────────────────────────────────────────
function ThanksPreview() {
  useVoicePreviewBoot()
  useEffect(() => {
    sessionStorage.setItem('cygnus_review_draft', 'カラーの仕上がりがとても自然で嬉しかったです。また来ます！')
  }, [])
  return <ThankYouPage />
}

// ── admin (dashboard) ────────────────────────────
function AdminPreview() {
  useVoicePreviewBoot()
  return <AdminLayout />
}

export default function PreviewPage() {
  const { section } = useParams<{ section: string }>()

  if (section === 'survey') return <SurveyPreview />
  if (section === 'thanks') return <ThanksPreview />
  if (section === 'admin') {
    return (
      <Routes>
        <Route element={<AdminPreview />}>
          <Route index element={<DashboardPage />} />
          <Route path="staffs" element={<StaffsPage />} />
          <Route path="staffs/:id" element={<StaffDetailPage />} />
          <Route path="responses" element={<ResponsesPage />} />
        </Route>
      </Routes>
    )
  }
  return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
    <h2>Preview index</h2>
    <ul>
      <li><a href="/preview/survey">Survey (顧客フォーム)</a></li>
      <li><a href="/preview/thanks">Thanks (送信完了)</a></li>
      <li><a href="/preview/admin">Admin Dashboard</a></li>
      <li><a href="/preview/admin/staffs">Admin Staffs</a></li>
      <li><a href="/preview/admin/staffs/1">Admin Staff Detail</a></li>
      <li><a href="/preview/admin/responses">Admin Responses</a></li>
    </ul>
  </div>
}
