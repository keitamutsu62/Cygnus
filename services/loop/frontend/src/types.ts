export type StaffRole = 'owner' | 'admin' | 'staff'

export type AuthClaims = {
  staff_id: number
  salon_id: number
  store_id?: number
  salon_name?: string
  role: StaffRole
  cygnus_account_id?: number
  avatar_initials?: string
  exp: number
}

export type Staff = {
  id: number
  salon_id: number
  store_id: number | null
  name: string
  email: string
  role: StaffRole
  is_active: boolean
  avatar_initials: string | null
  shimei_charge: number | null
  created_at: string
}

export type Store = {
  id: number
  salon_id: number
  name: string
}

export type DailySales = {
  id: number
  store_id: number
  date: string
  total_sales: number
  client_count: number
  tech_sales: number
  retail_sales: number
}

export type StaffDailySales = {
  id: number
  staff_id: number
  store_id: number
  date: string
  total_sales: number
  client_count: number
  unit_price: number
  retail_sales: number
}

export type Menu = {
  id: number
  salon_id: number
  name: string
  menu_type: 'treatment' | 'retail'
  price: number
  duration_minutes: number | null
  is_active: boolean
}

export type StaffSalesSummary = {
  staff_id: number
  name: string
  avatar_initials: string | null
  total_sales: number
  client_count: number
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: 'オーナー',
  admin: '店長',
  staff: 'スタッフ',
}

export function canManageStaff(role: StaffRole): boolean {
  return role === 'owner' || role === 'admin'
}
