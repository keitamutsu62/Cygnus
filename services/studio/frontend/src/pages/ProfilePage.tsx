import { useState, useEffect, useRef } from 'react'
import { apiFetch, api } from '../lib/api'
import { logout, getClaims } from '../lib/auth'
import { useTheme, THEME_LABELS, type Theme } from '../lib/theme'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import type { Profile, Work } from '../types'

const S = {
  bg: 'var(--bg)', surface: 'var(--surface)', surface2: 'var(--surface-2)',
  gold: 'var(--accent)', goldBorder: 'var(--accent-border)', goldDim: 'var(--accent-dim)',
  text: 'var(--text)', muted: 'var(--text-muted)', border: 'var(--border)',
  green: '#6dba8e',
  josefin: "'Josefin Sans', sans-serif", zen: "'Zen Kaku Gothic New', sans-serif",
}

const SPECIALTIES = ['カラー', 'カット', 'パーマ', '縮毛矯正', 'トリートメント', 'ヘアセット', 'ブリーチ', 'インナーカラー']

type LoopMembership = { salon_name: string; role: string; is_active: boolean; joined_at: string; left_at: string | null }

export default function ProfilePage() {
  const navigate = useNavigate()
  const claims = getClaims()
  const displayName = claims?.display_name ?? ''
  const { theme, setTheme } = useTheme()

  const [, setProfile] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [bio, setBio] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [instagramUrl, setInstagramUrl] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [shimeiCharge, setShimeiCharge] = useState('')
  const [currentSalon, setCurrentSalon] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [showReservePreview, setShowReservePreview] = useState(false)
  const [publishedWorks, setPublishedWorks] = useState<Work[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiFetch<Profile>('/api/v1/studio/profile').then(p => {
      setProfile(p)
      setAvatarUrl(p.avatar_url ?? '')
      setBio(p.bio ?? '')
      setSpecialties(p.specialties ? JSON.parse(p.specialties) as string[] : [])
      setInstagramUrl(p.instagram_url ?? '')
      setIsPublished(p.is_published)
      setShimeiCharge(p.shimei_charge > 0 ? String(p.shimei_charge) : '')
    }).catch(() => {})

    apiFetch<LoopMembership[]>('/api/v1/studio/memberships').then(list => {
      const active = (list ?? []).find(m => m.is_active)
      if (active) setCurrentSalon(active.salon_name)
    }).catch(() => {})

    apiFetch<Work[]>('/api/v1/studio/works').then(ws => {
      setPublishedWorks((ws ?? []).filter(w => w.is_published))
    }).catch(() => {})
  }, [])

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const original = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        const SIZE = 400
        const scale = Math.min(1, SIZE / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = original
    }
    reader.readAsDataURL(file)
  }

  async function handleAiSuggest() {
    setAiLoading(true)
    setAiSuggestion('')
    try {
      const res = await api('/api/v1/studio/bio-suggest', { method: 'POST' })
      if (!res.ok) return
      const { bio: suggestion } = await res.json() as { bio: string }
      setAiSuggestion(suggestion)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      await api('/api/v1/studio/profile', {
        method: 'PUT',
        body: JSON.stringify({
          avatar_url: avatarUrl || null,
          bio: bio || null,
          specialties: specialties.length > 0 ? JSON.stringify(specialties) : null,
          instagram_url: instagramUrl || null,
          is_published: isPublished,
          shimei_charge: Number(shimeiCharge) || 0,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  function toggleSpecialty(s: string) {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: S.surface2, border: `1px solid ${S.border}`,
    borderRadius: 2, padding: '13px 14px', color: S.text, fontSize: 14,
    fontFamily: S.zen, outline: 'none',
  }

  return (
    <div style={{ padding: '0 0 40px' }}>

      {/* アバター + 名前 */}
      <div style={{ padding: '24px 20px 0', textAlign: 'center', marginBottom: 20 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: 'none' }} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 14px', cursor: 'pointer' }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: S.surface2, border: `1px solid ${S.goldBorder}`,
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="10" r="5" stroke={S.gold} strokeWidth="1.5" opacity="0.5"/>
                <path d="M4 24c0-4.4 4.5-8 10-8s10 3.6 10 8" stroke={S.gold} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
              </svg>
            )}
          </div>
          <div style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 20, height: 20, borderRadius: '50%',
            background: S.gold, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M7 1L9 3L3.5 8.5L1 9L1.5 6.5Z" stroke="var(--on-accent)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        {displayName && <div style={{ fontSize: 16, fontWeight: 400, color: S.text, fontFamily: S.zen, marginBottom: 4 }}>{displayName}</div>}
        {currentSalon && <div style={{ fontSize: 11, color: S.muted, fontFamily: S.zen }}>{currentSalon}</div>}
      </div>

      {/* RESERVE公開バッジ */}
      {isPublished && (
        <div style={{ margin: '0 20px 20px', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke={S.gold} strokeWidth="1.2"/>
            <polyline points="3.5,7 6,9.5 10.5,4.5" stroke={S.gold} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ fontSize: 11, color: S.gold, lineHeight: 1.5, fontFamily: S.zen }}>このプロフィールはCygnus RESERVEに公開されています</div>
        </div>
      )}

      {/* 自己紹介 */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin }}>自己紹介</div>
          <button onClick={handleAiSuggest} disabled={aiLoading} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', background: S.goldDim, border: `1px solid ${S.goldBorder}`,
            borderRadius: 2, cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.6 : 1,
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L7.5 4.5L11 6L7.5 7.5L6 11L4.5 7.5L1 6L4.5 4.5Z" stroke={S.gold} strokeWidth="1" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 10, color: S.gold, fontFamily: S.josefin, letterSpacing: '0.1em' }}>
              {aiLoading ? '生成中...' : 'AIが提案'}
            </span>
          </button>
        </div>
        <textarea
          value={bio} onChange={e => setBio(e.target.value)}
          placeholder="得意なスタイルや施術へのこだわりを書いてみましょう..."
          rows={4} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
        />
        {aiSuggestion && (
          <div style={{ marginTop: 8, background: S.surface2, border: `1px solid ${S.goldBorder}`, borderRadius: 2, padding: '14px 14px 10px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: S.gold, fontFamily: S.josefin, marginBottom: 8, opacity: 0.8 }}>
              AI SUGGESTION · 得意施術データより
            </div>
            <div style={{ fontSize: 13, color: S.text, lineHeight: 1.75, marginBottom: 12, fontFamily: S.zen }}>{aiSuggestion}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setBio(aiSuggestion); setAiSuggestion('') }}
                style={{ flex: 1, padding: 9, background: S.gold, color: 'var(--on-accent)', border: 'none', borderRadius: 2, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: S.josefin }}>この文章を使う</button>
              <button onClick={() => setAiSuggestion('')}
                style={{ padding: '9px 14px', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, fontSize: 11, color: S.muted, cursor: 'pointer', fontFamily: S.josefin }}>閉じる</button>
            </div>
          </div>
        )}
      </div>

      {/* 得意施術 */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, marginBottom: 8 }}>得意施術</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SPECIALTIES.map(s => (
            <div key={s} onClick={() => toggleSpecialty(s)} style={{
              padding: '7px 14px', border: `1px solid ${specialties.includes(s) ? S.goldBorder : S.border}`,
              borderRadius: 2, fontSize: 11, letterSpacing: '0.08em',
              color: specialties.includes(s) ? S.gold : S.muted,
              background: specialties.includes(s) ? S.goldDim : 'transparent',
              cursor: 'pointer', fontFamily: S.josefin,
            }}>{s}</div>
          ))}
        </div>
      </div>

      {/* 指名料 */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, marginBottom: 8 }}>指名料</div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: S.muted, fontFamily: S.josefin }}>¥</span>
          <input type="number" inputMode="numeric" min="0" value={shimeiCharge}
            onChange={e => setShimeiCharge(e.target.value)} placeholder="0"
            style={{ ...inputStyle, paddingLeft: 28 }} />
        </div>
      </div>

      {/* Instagram */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, marginBottom: 8 }}>Instagram URL</div>
        <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
          placeholder="https://instagram.com/username" style={inputStyle} />
      </div>

      {/* 公開設定 */}
      <div style={{ padding: '0 20px', marginBottom: 24 }}>
        <div onClick={() => setIsPublished(v => !v)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: S.surface2, border: `1px solid ${S.border}`,
          borderRadius: 2, cursor: 'pointer',
        }}>
          <div>
            <div style={{ fontSize: 13, color: S.text, fontFamily: S.zen, marginBottom: 2 }}>RESERVEに公開する</div>
            <div style={{ fontSize: 11, color: S.muted, fontFamily: S.zen }}>ONにするとお客さんに表示されます</div>
          </div>
          <div style={{ width: 36, height: 20, background: isPublished ? S.gold : 'var(--surface-2)', border: `1px solid ${isPublished ? S.gold : S.border}`, borderRadius: 20, position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 2, left: isPublished ? 18 : 2, width: 14, height: 14, background: isPublished ? '#1a1816' : S.muted, borderRadius: '50%', transition: 'left 0.2s' }} />
          </div>
        </div>
      </div>

      {/* ボタン群 */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={handleSave} disabled={loading} style={{
          width: '100%', padding: 15,
          background: saved ? 'rgba(109,186,142,0.1)' : S.gold,
          border: saved ? '1px solid rgba(109,186,142,0.3)' : 'none',
          borderRadius: 2, fontFamily: S.zen, fontSize: 13,
          color: saved ? S.green : '#1a1816', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}>
          {saved ? '保存しました ✓' : '保存する'}
        </button>

        <button onClick={() => setShowReservePreview(true)} style={{
          width: '100%', padding: 14, background: 'transparent',
          border: `1px solid ${S.goldBorder}`, borderRadius: 2,
          color: S.gold, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: S.josefin,
        }}>RESERVE での見え方を確認</button>
      </div>

      {/* テーマ */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, marginBottom: 10 }}>テーマ</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['dark', 'light', 'pop'] as Theme[]).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                flex: 1, padding: '10px 4px', border: `1px solid ${theme === t ? S.gold : S.border}`,
                borderRadius: 6, background: theme === t ? S.goldDim : 'transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: t === 'dark' ? '#1a1816' : t === 'light' ? '#f7f3ee' : '#ffffff', border: '1px solid rgba(128,128,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: t === 'dark' ? '#c8a882' : t === 'light' ? '#9b7c5a' : '#f06292' }} />
              </div>
              <span style={{ fontSize: 9, fontFamily: S.josefin, letterSpacing: '0.08em', color: theme === t ? S.gold : S.muted }}>{THEME_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ログアウト */}
      <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
        <span onClick={() => { logout(); navigate('/login') }} style={{ fontSize: 12, color: S.muted, cursor: 'pointer', fontFamily: S.zen }}>
          ログアウト
        </span>
      </div>

      {/* RESERVEプレビューオーバーレイ */}
      {showReservePreview && createPortal(
        <ReservePreview
          displayName={displayName}
          currentSalon={currentSalon}
          avatarUrl={avatarUrl}
          bio={bio}
          specialties={specialties}
          shimeiCharge={Number(shimeiCharge) || 0}
          works={publishedWorks}
          onClose={() => setShowReservePreview(false)}
        />,
        document.body
      )}
    </div>
  )
}

function ReservePreview({ displayName, currentSalon, avatarUrl, bio, specialties, shimeiCharge, works, onClose }: {
  displayName: string
  currentSalon: string
  avatarUrl: string
  bio: string
  specialties: string[]
  shimeiCharge: number
  works: Work[]
  onClose: () => void
}) {
  return (
    <div data-theme="dark" style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: '#141210', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto',
    }}>
      {/* ヘッダーバー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid rgba(232,228,220,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: S.josefin, fontSize: 13, letterSpacing: '0.2em', color: S.gold }}>CYGNUS</span>
          <span style={{ fontFamily: S.josefin, fontSize: 10, letterSpacing: '0.2em', color: S.muted }}>RESERVE</span>
          <span style={{ fontSize: 9, color: 'rgba(200,168,130,0.5)', fontFamily: S.josefin, letterSpacing: '0.1em', marginLeft: 4 }}>プレビュー</span>
        </div>
        <div onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <line x1="3" y1="3" x2="13" y2="13" stroke={S.text} strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="13" y1="3" x2="3" y2="13" stroke={S.text} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* スクロールコンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* STUDIOプレビューバッジ */}
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2 }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="3" stroke={S.gold} strokeWidth="1"/></svg>
            <span style={{ fontSize: 9, color: S.gold, fontFamily: S.josefin, letterSpacing: '0.1em' }}>STUDIO プレビュー</span>
          </div>
        </div>

        {/* スタイリスト行 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 20px 16px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: S.surface2, border: `1px solid ${S.goldBorder}`,
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: S.josefin, fontSize: 22, color: S.gold, fontWeight: 100 }}>
                {displayName ? Array.from(displayName)[0] : '?'}
              </span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 400, color: S.text, fontFamily: S.zen, marginBottom: 3 }}>{displayName || '—'}</div>
            <div style={{ fontSize: 12, color: S.muted, fontFamily: S.zen, marginBottom: 6 }}>{currentSalon || '—'}</div>
            <div style={{ fontSize: 11, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.05em', marginBottom: 4 }}>フォロワー —人</div>
            {shimeiCharge > 0 && (
              <div style={{ fontSize: 11, color: S.gold, fontFamily: S.josefin }}>指名料 ¥{shimeiCharge.toLocaleString('ja-JP')}</div>
            )}
          </div>
          <div style={{ padding: '6px 14px', border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 11, color: S.gold, fontFamily: S.josefin, letterSpacing: '0.1em', flexShrink: 0 }}>フォロー</div>
        </div>

        {/* Bio */}
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(232,228,220,0.05)' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, padding: '16px 0 10px' }}>Profile</div>
          <div style={{ fontSize: 13, color: bio ? S.text : S.muted, lineHeight: 1.8, fontFamily: S.zen }}>
            {bio || '自己紹介が設定されていません'}
          </div>
        </div>

        {/* 得意施術 */}
        {specialties.length > 0 && (
          <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(232,228,220,0.05)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, padding: '16px 0 12px' }}>Specialties</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {specialties.map(s => (
                <div key={s} style={{ padding: '6px 12px', border: `1px solid ${S.goldBorder}`, borderRadius: 2, fontSize: 11, color: S.gold, fontFamily: S.josefin, letterSpacing: '0.08em' }}>{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* 公開作品 */}
        <div style={{ borderTop: '1px solid rgba(232,228,220,0.05)' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin, padding: '16px 20px 12px' }}>Works</div>
          {works.length === 0 ? (
            <div style={{ padding: '0 20px 20px', fontSize: 12, color: S.muted, fontFamily: S.zen }}>公開中の作品がありません</div>
          ) : (
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 24px', overflowX: 'auto' }}>
              {works.map(w => (
                <div key={w.id} style={{ width: 120, height: 120, flexShrink: 0, borderRadius: 2, overflow: 'hidden', background: S.surface2 }}>
                  <img src={w.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 予約するバー */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 20px 28px', background: 'rgba(20,18,16,0.95)',
        borderTop: '1px solid rgba(232,228,220,0.08)',
      }}>
        <button style={{
          width: '100%', padding: 15, background: S.gold, border: 'none', borderRadius: 2,
          fontFamily: S.josefin, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--on-accent)', cursor: 'default', opacity: 0.7,
        }}>予約する（プレビュー）</button>
      </div>
    </div>
  )
}
