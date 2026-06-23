import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SurveyPage from './pages/SurveyPage'
import ThankYouPage from './pages/ThankYouPage'
import AdminLayout from './pages/admin/AdminLayout'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import StaffsPage from './pages/admin/StaffsPage'
import ResponsesPage from './pages/admin/ResponsesPage'
import SettingsPage from './pages/admin/SettingsPage'
import StaffDetailPage from './pages/admin/StaffDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SurveyPage />} />
        <Route path="/thanks" element={<ThankYouPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="staffs" element={<StaffsPage />} />
          <Route path="staffs/:id" element={<StaffDetailPage />} />
          <Route path="responses" element={<ResponsesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
