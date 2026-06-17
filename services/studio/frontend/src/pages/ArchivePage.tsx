import { useState, useEffect, useRef } from 'react'
import { apiFetch, api } from '../lib/api'
import type { Work } from '../types'
import BottomSheet, { useBottomSheetDismiss } from '../components/BottomSheet'

type Menu = { id: number; name: string; price: number; duration_minutes: number | null; menu_type: string }

const S = {
  bg: 'var(--bg)', surface: 'var(--surface-2)', gold: 'var(--accent)', text: 'var(--text)',
  muted: 'var(--text-muted)', border: 'var(--border)',
  goldBorder: 'rgba(200,168,130,0.2)', goldDim: 'rgba(200,168,130,0.1)',
  josefin: "'Josefin Sans', sans-serif", zen: "'Zen Kaku Gothic New', sans-serif",
}

const TAG_OPTIONS = ['カラー', 'カット', 'パーマ', '縮毛矯正', 'トリートメント']
const GENRES = ['すべて', ...TAG_OPTIONS]

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  try { return (JSON.parse(raw) as string[]).filter(t => TAG_OPTIONS.includes(t)) } catch { return [] }
}

export default function ArchivePage() {
  const [works, setWorks] = useState<Work[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [filter, setFilter] = useState('すべて')
  const [selected, setSelected] = useState<Work | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    apiFetch<Work[] | null>('/api/v1/studio/works').then(data => setWorks(data ?? [])).catch(() => {})
    apiFetch<Menu[] | null>('/api/v1/studio/menus').then(data => setMenus(data ?? [])).catch(() => {})
  }, [])

  const filtered = filter === 'すべて' ? works : works.filter(w => parseTags(w.tags).includes(filter))

  async function handleDelete(id: number) {
    await api(`/api/v1/studio/works/${id}`, { method: 'DELETE' })
    setWorks(ws => ws.filter(w => w.id !== id))
    setSelected(null)
  }

  async function handleTogglePublish(w: Work) {
    const updated = { ...w, is_published: !w.is_published }
    await api(`/api/v1/studio/works/${w.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ image_url: w.image_url, is_published: updated.is_published, tags: w.tags }),
    })
    setWorks(ws => ws.map(x => x.id === w.id ? updated : x))
    setSelected(updated)
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.7, fontFamily: S.zen }}>
          作品はRESERVEのスタイリストページに公開されます。
        </div>
        {works.length > 0 && (
          <div style={{ fontSize: 10, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.1em', flexShrink: 0, marginLeft: 12 }}>
            {works.length} works
          </div>
        )}
      </div>

      {/* フィルター */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', overflowX: 'auto' }}>
        {GENRES.map(g => (
          <div key={g} onClick={() => setFilter(g)} style={{
            padding: '7px 14px', border: `1px solid ${filter === g ? S.goldBorder : S.border}`,
            borderRadius: 2, fontSize: 11, letterSpacing: '0.08em', whiteSpace: 'nowrap',
            color: filter === g ? S.gold : S.muted, background: filter === g ? S.goldDim : 'transparent',
            cursor: 'pointer', fontFamily: S.josefin, flexShrink: 0,
          }}>{g}</div>
        ))}
      </div>

      {/* グリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, padding: '0 2px' }}>
        <div onClick={() => setShowAdd(true)} style={{
          aspectRatio: '1', background: 'transparent',
          border: `1px dashed ${S.goldBorder}`, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 6, cursor: 'pointer',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="10" y1="3" x2="10" y2="17" stroke={S.gold} strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
            <line x1="3" y1="10" x2="17" y2="10" stroke={S.gold} strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
          </svg>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', fontFamily: S.josefin, color: 'rgba(200,168,130,0.5)' }}>ADD</span>
        </div>

        {filtered.map(w => (
          <div key={w.id} onClick={() => setSelected(w)} style={{
            aspectRatio: '1', background: S.surface, position: 'relative',
            overflow: 'hidden', cursor: 'pointer',
          }}>
            <img src={w.image_url} alt={w.title ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {(() => {
              const t = parseTags(w.tags)[0]
              return t ? (
                <div style={{
                  position: 'absolute', bottom: 6, left: 6,
                  fontSize: 9, fontFamily: S.josefin, letterSpacing: '0.08em',
                  background: 'rgba(26,24,22,0.8)', color: S.gold, padding: '2px 6px', borderRadius: 1,
                }}>{t}</div>
              ) : null
            })()}
            <div style={{
              position: 'absolute', top: 4, right: 4,
              fontSize: 8, fontFamily: S.josefin, letterSpacing: '0.08em',
              background: 'rgba(26,24,22,0.85)',
              color: w.is_published ? S.gold : S.muted,
              padding: '2px 5px', borderRadius: 1,
            }}>{w.is_published ? '公開中' : '非公開'}</div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{
            gridColumn: '1/-1', padding: '40px 20px', textAlign: 'center',
            color: S.muted, fontSize: 12, fontFamily: S.zen,
          }}>まだ作品がありません</div>
        )}
      </div>

      {selected && (
        <BottomSheet onClose={() => setSelected(null)} maxHeight="90vh">
          <WorkDetail
            work={selected}
            menus={menus}
            onDelete={handleDelete}
            onTogglePublish={handleTogglePublish}
          />
        </BottomSheet>
      )}

      {showAdd && (
        <BottomSheet onClose={() => setShowAdd(false)} maxHeight="95vh">
          <AddWork menus={menus} onAdded={w => { setWorks(ws => [w, ...ws]); setShowAdd(false) }} />
        </BottomSheet>
      )}
    </div>
  )
}

function WorkDetail({ work, menus, onDelete, onTogglePublish }: {
  work: Work
  menus: Menu[]
  onDelete: (id: number) => void
  onTogglePublish: (w: Work) => void
}) {
  const dismiss = useBottomSheetDismiss()
  const tags = parseTags(work.tags)
  const menuName = work.menu_id ? menus.find(m => m.id === work.menu_id)?.name : undefined

  return (
    <>
      <img src={work.image_url} alt="" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 2, marginBottom: 16 }} />
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {tags.map(t => (
            <div key={t} style={{ fontSize: 10, fontFamily: S.josefin, letterSpacing: '0.12em', color: S.gold, background: S.goldDim, border: `1px solid ${S.goldBorder}`, padding: '4px 10px', borderRadius: 2 }}>{t}</div>
          ))}
        </div>
      )}
      {work.description && <div style={{ fontSize: 13, color: S.text, lineHeight: 1.7, marginBottom: 14, fontFamily: S.zen }}>{work.description}</div>}
      <div style={{ fontSize: 10, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.1em', marginBottom: 20 }}>
        {new Date(work.created_at).toLocaleDateString('ja-JP')}
      </div>

      {menuName && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', marginBottom: 4, borderBottom: `1px solid ${S.border}` }}>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, fontFamily: S.josefin }}>対応メニュー</div>
          <div style={{ fontSize: 13, color: S.text, fontFamily: S.zen }}>{menuName}</div>
        </div>
      )}

      <div onClick={() => onTogglePublish(work)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: 'var(--surface-2)', border: `1px solid ${S.border}`,
        borderRadius: 2, marginBottom: 16, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 11, color: S.muted, fontFamily: S.zen }}>RESERVEに公開する</span>
        <div style={{ width: 36, height: 20, background: work.is_published ? S.gold : 'var(--bg)', border: `1px solid ${work.is_published ? S.gold : S.border}`, borderRadius: 20, position: 'relative', transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 2, left: work.is_published ? 18 : 2, width: 14, height: 14, background: work.is_published ? 'var(--bg)' : S.muted, borderRadius: '50%', transition: 'left 0.2s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={dismiss} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.muted, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: S.josefin }}>閉じる</button>
        <button onClick={() => onDelete(work.id)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid rgba(220,80,80,0.3)', borderRadius: 2, color: 'rgba(220,80,80,0.7)', fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: S.josefin }}>削除</button>
      </div>
    </>
  )
}

function AddWork({ menus, onAdded }: { menus: Menu[]; onAdded: (w: Work) => void }) {
  const dismiss = useBottomSheetDismiss()
  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [menuId, setMenuId] = useState<number | null>(null)
  const [isPublished, setIsPublished] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const original = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        const MAX = 1080
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        setImageUrl(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = original
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!imageUrl) { setError('画像を選択してください'); return }
    setLoading(true)
    try {
      const res = await api('/api/v1/studio/works', {
        method: 'POST',
        body: JSON.stringify({
          image_url: imageUrl,
          description: description || undefined,
          tags: tags.length > 0 ? JSON.stringify(tags) : undefined,
          is_published: isPublished,
          menu_id: menuId || undefined,
        }),
      })
      if (!res.ok) { setError('投稿に失敗しました'); return }
      const work = await res.json() as Work
      onAdded(work)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold, marginBottom: 16, fontFamily: S.josefin }}>作品を追加</div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
      <div onClick={() => fileRef.current?.click()} style={{
        width: '100%', background: S.surface,
        border: `1px dashed ${imageUrl ? S.goldBorder : S.border}`,
        borderRadius: 2, marginBottom: 14, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        ...(imageUrl ? {} : { aspectRatio: '4/3' }),
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        ) : (
          <div style={{ textAlign: 'center', color: S.muted }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ marginBottom: 8 }}>
              <rect x="2" y="6" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <div style={{ fontSize: 11, fontFamily: S.zen }}>タップして写真を選択</div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, marginBottom: 8 }}>ジャンル</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['カラー', 'カット', 'パーマ', '縮毛矯正', 'トリートメント'].map(g => (
            <div key={g} onClick={() => setTags(prev => prev.includes(g) ? prev.filter(t => t !== g) : [...prev, g])} style={{
              padding: '7px 14px', border: `1px solid ${tags.includes(g) ? S.goldBorder : S.border}`,
              borderRadius: 2, fontSize: 11, color: tags.includes(g) ? S.gold : S.muted,
              background: tags.includes(g) ? S.goldDim : 'transparent',
              cursor: 'pointer', fontFamily: S.josefin,
            }}>{g}</div>
          ))}
        </div>
      </div>

      {menus.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, marginBottom: 8 }}>メニュー（任意）</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {menus.map(m => (
              <div key={m.id} onClick={() => setMenuId(menuId === m.id ? null : m.id)} style={{
                padding: '7px 14px', border: `1px solid ${menuId === m.id ? S.goldBorder : S.border}`,
                borderRadius: 2, fontSize: 11, color: menuId === m.id ? S.gold : S.muted,
                background: menuId === m.id ? S.goldDim : 'transparent',
                cursor: 'pointer', fontFamily: S.josefin,
              }}>{m.name}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, marginBottom: 8 }}>コメント（任意）</div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="施術のポイントや使用カラー等..." rows={3} style={{
          width: '100%', background: 'var(--surface-2)', border: `1px solid ${S.border}`, borderRadius: 2,
          padding: '13px 14px', color: S.text, fontSize: 14, fontFamily: S.zen,
          outline: 'none', resize: 'none', lineHeight: 1.6,
        }} />
      </div>

      <div onClick={() => setIsPublished(v => !v)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: 'var(--surface-2)', border: `1px solid ${S.border}`,
        borderRadius: 2, marginBottom: 16, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 11, color: S.muted, fontFamily: S.zen }}>RESERVEに公開する</span>
        <div style={{ width: 36, height: 20, background: isPublished ? S.gold : 'var(--bg)', border: `1px solid ${isPublished ? S.gold : S.border}`, borderRadius: 20, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 2, left: isPublished ? 18 : 2, width: 14, height: 14, background: isPublished ? 'var(--bg)' : S.muted, borderRadius: '50%', transition: 'left 0.2s' }} />
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: '#e07060', marginBottom: 12, fontFamily: S.zen }}>{error}</div>}

      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', padding: 15, background: S.gold, border: 'none', borderRadius: 2,
        fontFamily: S.josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.25em',
        textTransform: 'uppercase', color: 'var(--bg)', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}>{loading ? '...' : '投稿する'}</button>
      <button onClick={dismiss} style={{ width: '100%', padding: 13, marginTop: 8, background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.muted, fontSize: 12, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: S.josefin }}>キャンセル</button>
    </>
  )
}
