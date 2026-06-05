export type StudioClaims = {
  cygnus_account_id: number
  cygnus_id: string
  display_name: string
  exp: number
}

export type Profile = {
  id?: number
  cygnus_account_id: number
  avatar_url?: string
  bio?: string
  specialties?: string // JSON array string
  instagram_url?: string
  is_published: boolean
  shimei_charge: number
}

export type Work = {
  id: number
  cygnus_account_id: number
  menu_id?: number
  title?: string
  description?: string
  image_url: string
  tags?: string // JSON array string
  is_published: boolean
  created_at: string
}
