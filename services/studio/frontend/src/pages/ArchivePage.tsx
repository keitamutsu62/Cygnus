import { useState, useEffect, useRef } from 'react'
import { apiFetch, api } from '../lib/api'
import type { Work } from '../types'
import BottomSheet, { useBottomSheetDismiss } from '../components/BottomSheet'

const S = {
  bg: '#1a1816', surface: '#272422', gold: '#c8a882', text: '#e8e4dc',
  muted: 'rgba(232,228,220,0.5)', border: 'rgba(232,228,220,0.08)',
  goldBorder: 'rgba(200,168,130,0.2)', goldDim: 'rgba(200,168,130,0.1)',
  josefin: "'Josefin Sans', sans-serif", zen: "'Zen Kaku Gothic New', sans-serif",
}

const GENRES = ['すべて', 'カラー', 'カット', 'パーマ', '縮毛矯正', 'トリートメント']

export default function ArchivePage() {
  const [works, setWorks] = useState<Work[]>([])
  const [filter, setFilter] = useState('すべて')
  const [selected, setSelected] = useState<Work | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    apiFetch<Work[] | null>('/api/v1/studio/works').then(data => setWorks(data ?? [])).catch(() => {})
  }, [])

  const filtered = filter === 'すべて' ? works : works.filter(w => {
    if (!w.tags) return false
    const tags = JSON.parse(w.tags) as string[]
    return tags.includes(filter)
  })

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
      <div style={{ padding: '16px 20px 12px', fontSize: 11, color: S.muted, lineHeight: 1.7, fontFamily: S.zen }}>
        作品はRESERVEのスタイリストページに公開されます。
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
            {w.tags && (() => {
              const tags = JSON.parse(w.tags) as string[]
              return tags[0] ? (
                <div style={{
                  position: 'absolute', bottom: 6, left: 6,
                  fontSize: 9, fontFamily: S.josefin, letterSpacing: '0.08em',
                  background: 'rgba(26,24,22,0.8)', color: S.gold, padding: '2px 6px', borderRadius: 1,
                }}>{tags[0]}</div>
              ) : null
            })()}
            {!w.is_published && (
              <div style={{
                position: 'absolute', top: 4, right: 4,
                fontSize: 8, fontFamily: S.josefin, letterSpacing: '0.08em',
                background: 'rgba(26,24,22,0.85)', color: S.muted, padding: '2px 5px', borderRadius: 1,
              }}>非公開</div>
            )}
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
            onDelete={handleDelete}
            onTogglePublish={handleTogglePublish}
          />
        </BottomSheet>
      )}

      {showAdd && (
        <BottomSheet onClose={() => setShowAdd(false)} maxHeight="95vh">
          <AddWork onAdded={w => { setWorks(ws => [w, ...ws]); setShowAdd(false) }} />
        </BottomSheet>
      )}
    </div>
  )
}

function WorkDetail({ work, onDelete, onTogglePublish }: {
  work: Work
  onDelete: (id: number) => void
  onTogglePublish: (w: Work) => void
}) {
  const dismiss = useBottomSheetDismiss()
  const tags = work.tags ? JSON.parse(work.tags) as string[] : []

  return (
    <>
      <img src={work.image_url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 2, marginBottom: 16 }} />
      {tags[0] && (
        <div style={{ display: 'inline-block', fontSize: 10, fontFamily: S.josefin, letterSpacing: '0.12em', color: S.gold, background: S.goldDim, border: `1px solid ${S.goldBorder}`, padding: '4px 10px', borderRadius: 2, marginBottom: 14 }}>{tags[0]}</div>
      )}
      {work.description && <div style={{ fontSize: 13, color: S.text, lineHeight: 1.7, marginBottom: 14, fontFamily: S.zen }}>{work.description}</div>}
      <div style={{ fontSize: 10, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.1em', marginBottom: 20 }}>
        {new Date(work.created_at).toLocaleDateString('ja-JP')}
      </div>

      <div onClick={() => onTogglePublish(work)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: '#272422', border: `1px solid ${S.border}`,
        borderRadius: 2, marginBottom: 16, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 11, color: S.muted, fontFamily: S.zen }}>RESERVEに公開する</span>
        <div style={{ width: 36, height: 20, background: work.is_published ? S.gold : '#1a1816', border: `1px solid ${work.is_published ? S.gold : S.border}`, borderRadius: 20, position: 'relative', transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 2, left: work.is_published ? 18 : 2, width: 14, height: 14, background: work.is_published ? '#1a1816' : S.muted, borderRadius: '50%', transition: 'left 0.2s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={dismiss} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.muted, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: S.josefin }}>閉じる</button>
        <button onClick={() => onDelete(work.id)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid rgba(220,80,80,0.3)', borderRadius: 2, color: 'rgba(220,80,80,0.7)', fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: S.josefin }}>削除</button>
      </div>
    </>
  )
}

function AddWork({ onAdded }: { onAdded: (w: Work) => void }) {
  const dismiss = useBottomSheetDismiss()
  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState('')
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
          tags: tag ? JSON.stringify([tag]) : undefined,
          is_published: isPublished,
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
        width: '100%', aspectRatio: '4/3', background: S.surface,
        border: `1px dashed ${imageUrl ? S.goldBorder : S.border}`,
        borderRadius: 2, marginBottom: 14, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            <div key={g} onClick={() => setTag(tag === g ? '' : g)} style={{
              padding: '7px 14px', border: `1px solid ${tag === g ? S.goldBorder : S.border}`,
              borderRadius: 2, fontSize: 11, color: tag === g ? S.gold : S.muted,
              background: tag === g ? S.goldDim : 'transparent',
              cursor: 'pointer', fontFamily: S.josefin,
            }}>{g}</div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, marginBottom: 8 }}>コメント（任意）</div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="施術のポイントや使用カラー等..." rows={3} style={{
          width: '100%', background: '#272422', border: `1px solid ${S.border}`, borderRadius: 2,
          padding: '13px 14px', color: S.text, fontSize: 14, fontFamily: S.zen,
          outline: 'none', resize: 'none', lineHeight: 1.6,
        }} />
      </div>

      <div onClick={() => setIsPublished(v => !v)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: '#272422', border: `1px solid ${S.border}`,
        borderRadius: 2, marginBottom: 16, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 11, color: S.muted, fontFamily: S.zen }}>RESERVEに公開する</span>
        <div style={{ width: 36, height: 20, background: isPublished ? S.gold : '#1a1816', border: `1px solid ${isPublished ? S.gold : S.border}`, borderRadius: 20, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 2, left: isPublished ? 18 : 2, width: 14, height: 14, background: isPublished ? '#1a1816' : S.muted, borderRadius: '50%', transition: 'left 0.2s' }} />
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: '#e07060', marginBottom: 12, fontFamily: S.zen }}>{error}</div>}

      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', padding: 15, background: S.gold, border: 'none', borderRadius: 2,
        fontFamily: S.josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.25em',
        textTransform: 'uppercase', color: '#1a1816', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}>{loading ? '...' : '投稿する'}</button>
      <button onClick={dismiss} style={{ width: '100%', padding: 13, marginTop: 8, background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.muted, fontSize: 12, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: S.josefin }}>キャンセル</button>
    </>
  )
}
