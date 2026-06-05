import { useState, useEffect } from 'react'
import { apiFetch, api } from '../lib/api'
import { logout } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import type { Profile } from '../types'

const S = {
  bg: '#1a1816', surface: '#211f1d', surface2: '#272422',
  gold: '#c8a882', goldBorder: 'rgba(200,168,130,0.2)', goldDim: 'rgba(200,168,130,0.1)',
  text: '#e8e4dc', muted: 'rgba(232,228,220,0.5)', border: 'rgba(232,228,220,0.08)',
  green: '#6dba8e',
  josefin: "'Josefin Sans', sans-serif", zen: "'Zen Kaku Gothic New', sans-serif",
}

const SPECIALTIES = ['カラー', 'カット', 'パーマ', '縮毛矯正', 'トリートメント', 'ヘアセット', 'ブリーチ', 'インナーカラー']

export default function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bio, setBio] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [instagramUrl, setInstagramUrl] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    apiFetch<Profile>('/api/v1/studio/profile').then(p => {
      setProfile(p)
      setBio(p.bio ?? '')
      setSpecialties(p.specialties ? JSON.parse(p.specialties) as string[] : [])
      setInstagramUrl(p.instagram_url ?? '')
      setIsPublished(p.is_published)
    }).catch(() => {})
  }, [])

  async function handleAiSuggest() {
    setAiLoading(true)
    try {
      const res = await api('/api/v1/studio/bio-suggest', { method: 'POST' })
      if (!res.ok) return
      const { bio } = await res.json() as { bio: string }
      setBio(bio)
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
          bio: bio || null,
          specialties: specialties.length > 0 ? JSON.stringify(specialties) : null,
          instagram_url: instagramUrl || null,
          is_published: isPublished,
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

      {/* アバター */}
      <div style={{ padding: '24px 20px 0', textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: S.surface2, border: `1px solid ${S.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="10" r="5" stroke={S.gold} strokeWidth="1.5" opacity="0.5"/>
            <path d="M4 24c0-4.4 4.5-8 10-8s10 3.6 10 8" stroke={S.gold} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
          </svg>
        </div>
        <div style={{ fontSize: 12, color: S.muted, fontFamily: S.zen }}>プロフィール写真は準備中</div>
      </div>

      {/* RESERVE公開バッジ */}
      {isPublished && (
        <div style={{ margin: '0 20px 20px', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: S.goldDim, border: `1px solid ${S.goldBorder}`, borderRadius: 2 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke={S.gold} strokeWidth="1.2"/>
            <polyline points="3.5,7 6,9.5 10.5,4.5" stroke={S.gold} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ fontSize: 11, color: S.gold, lineHeight: 1.5, fontFamily: S.zen }}>RESERVEに公開中</div>
        </div>
      )}

      {/* 自己紹介 */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, fontFamily: S.josefin }}>自己紹介</div>
          <button onClick={handleAiSuggest} disabled={aiLoading} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', background: S.goldDim, border: `1px solid ${S.goldBorder}`,
            borderRadius: 2, cursor: aiLoading ? 'not-allowed' : 'pointer',
            opacity: aiLoading ? 0.6 : 1,
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
          <div style={{ width: 36, height: 20, background: isPublished ? S.gold : '#1a1816', border: `1px solid ${isPublished ? S.gold : S.border}`, borderRadius: 20, position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 2, left: isPublished ? 18 : 2, width: 14, height: 14, background: isPublished ? '#1a1816' : S.muted, borderRadius: '50%', transition: 'left 0.2s' }} />
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div style={{ padding: '0 20px' }}>
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
      </div>

      {/* ログアウト */}
      <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
        <span onClick={() => { logout(); navigate('/login') }} style={{ fontSize: 12, color: S.muted, cursor: 'pointer', fontFamily: S.zen }}>
          ログアウト
        </span>
      </div>

      {profile && (
        <div style={{ padding: '16px 20px 0', textAlign: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(232,228,220,0.2)', fontFamily: S.josefin, letterSpacing: '0.1em' }}>
            {/* cygnus_id は profile 取得後に account から別途取得が必要 */}
          </span>
        </div>
      )}
    </div>
  )
}
