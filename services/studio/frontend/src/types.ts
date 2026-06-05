export type StudioClaims = {
  cygnus_account_id: number
  exp: number
}

export type Profile = {
  id?: number
  cygnus_account_id: number
  bio?: string
  specialties?: string // JSON array string
  instagram_url?: string
  is_published: boolean
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
