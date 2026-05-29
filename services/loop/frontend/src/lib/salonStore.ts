import { atom } from 'jotai'
import { apiFetch } from './api'

export const salonNameAtom = atom<string>('—')

export async function fetchSalonName(set: (v: string) => void) {
  try {
    const stores = await apiFetch<{ salon_id: number }[]>('/api/v1/stores')
    if (!stores || stores.length === 0) return
    const salonId = stores[0].salon_id
    const res = await apiFetch<{ id: number; name: string }[]>(
      `/api/v1/stores`
    )
    // サロン名は別エンドポイントがないので staffs から取得
    const staffs = await apiFetch<{ salon_id: number }[]>('/api/v1/staffs')
    if (staffs && staffs.length > 0) {
      // staffs からは salon_id しか取れないのでとりあえずスキップ
    }
    void res; void salonId
  } catch { /* ignore */ }
}
