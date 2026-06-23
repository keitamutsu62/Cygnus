import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = '#C8A882'
const border  = '#E4E0D8'
const bg      = '#F8F7F4'
const muted   = '#999'

function loadStaffNames(): string[] {
  try {
    const stored = localStorage.getItem('cygnus_staffs')
    if (stored) return JSON.parse(stored).map((s: { name: string }) => s.name)
  } catch { /* ignore */ }
  return ['田中 美咲', '佐藤 れな', '山本 あい', '鈴木 花']
}
const RATING_LABELS = ['', '残念でした', 'もう少し', '普通', '良かった', '最高でした']

const OrbitSVG = () => (
  <svg width="16" height="16" viewBox="0 0 80 80" fill="none">
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke={gold} strokeWidth="6" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="6" opacity="0.5"/>
  </svg>
)

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 14 }}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform 0.1s' }}
          >
            <svg viewBox="0 0 24 24" width="40" height="40"
              fill={n <= active ? '#F59E0B' : 'none'}
              stroke={n <= active ? '#F59E0B' : '#DDD'}
              strokeWidth="1.5"
              style={{ display: 'block' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        ))}
      </div>
      <span style={{
        fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.1em',
        color: '#F59E0B', height: 16,
        opacity: active > 0 ? 1 : 0, transition: 'opacity 0.15s',
      }}>
        {RATING_LABELS[active]}
      </span>
    </div>
  )
}

interface Ratings { overall: number; finish: number; service: number }

const QUESTIONS: { key: keyof Ratings; label: string; sub: string }[] = [
  { key: 'overall', label: '総合満足度',         sub: '今回のご来店はいかがでしたか？' },
  { key: 'finish',  label: '仕上がり',           sub: 'スタイルの仕上がりはご満足いただけましたか？' },
  { key: 'service', label: '接客・コミュニケーション', sub: 'スタッフの対応はいかがでしたか？' },
]

const STORAGE_KEY = 'cygnus_salon_name'

export default function SurveyPage() {
  const navigate = useNavigate()
  const [staff, setStaff] = useState('')
  const salonName = localStorage.getItem(STORAGE_KEY) ?? ''
  const staffNames = loadStaffNames()
  const [ratings, setRatings] = useState<Ratings>({ overall: 0, finish: 0, service: 0 })
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const filled = staff !== '' && ratings.overall > 0 && ratings.finish > 0 && ratings.service > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: string[] = []
    if (!staff) errs.push('担当スタッフを選択してください')
    if (ratings.overall === 0) errs.push('総合満足度を選択してください')
    if (ratings.finish === 0) errs.push('仕上がりを選択してください')
    if (ratings.service === 0) errs.push('接客・コミュニケーションを選択してください')
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setSubmitting(true)
    if (comment.trim()) sessionStorage.setItem('cygnus_review_draft', comment.trim())
    await new Promise(r => setTimeout(r, 700))
    navigate('/thanks')
  }

  return (
    <div style={{ minHeight: '100dvh', background: bg }}>

      {/* Header */}
      <div style={{ background: '#1a1816', padding: '20px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <OrbitSVG />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.22em', color: 'rgba(232,228,220,0.5)' }}>CYGNUS</span>
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.22em', color: gold }}>VOICE</span>
          </div>
        </div>
        {salonName && (
          <p style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.2em', color: 'rgba(232,228,220,0.45)', margin: '0 0 10px', textTransform: 'uppercase' as const }}>{salonName}</p>
        )}
        <h1 style={{ fontFamily: zen, fontWeight: 300, fontSize: 20, color: '#e8e4dc', lineHeight: 1.6, margin: 0 }}>
          本日のご感想を<br />お聞かせください
        </h1>
      </div>

      {/* Form body */}
      <div style={{ padding: '0 20px 40px' }}>
        <form onSubmit={handleSubmit} noValidate>

          {/* 01 Staff */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.2em', color: gold }}>01</span>
              <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#555' }}>担当スタッフ</span>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '16px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {staffNames.map(s => (
                  <button key={s} type="button" onClick={() => setStaff(s)} style={{
                    padding: '12px 0',
                    border: `1px solid ${staff === s ? '#1a1816' : border}`,
                    borderRadius: 4,
                    background: staff === s ? '#1a1816' : '#FAFAF8',
                    color: staff === s ? '#e8e4dc' : muted,
                    fontFamily: zen, fontWeight: 300, fontSize: 14,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 02-04 Star ratings */}
          {QUESTIONS.map((q, i) => (
            <div key={q.key} style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.2em', color: gold }}>0{i + 2}</span>
                <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#555' }}>{q.label}</span>
              </div>
              <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '20px 16px' }}>
                <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 13, color: muted, margin: '0 0 16px', textAlign: 'center' as const }}>{q.sub}</p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <StarRating value={ratings[q.key]} onChange={v => setRatings(prev => ({ ...prev, [q.key]: v }))} />
                </div>
              </div>
            </div>
          ))}

          {/* 05 Comment */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.2em', color: gold }}>05</span>
              <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#555' }}>Comment</span>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: '#bbb', letterSpacing: '0.1em' }}>任意</span>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: 'rgba(66,133,244,0.7)', letterSpacing: '0.08em', marginLeft: 4 }}>— Googleレビューにも使えます</span>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '14px 16px' }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                placeholder="ご要望・感想など、なんでもお書きください"
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  border: 'none', outline: 'none', resize: 'none' as const,
                  background: 'transparent',
                  fontFamily: zen, fontWeight: 300, fontSize: 14, color: '#333',
                  lineHeight: 1.7,
                }}
              />
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{
              marginTop: 14, background: 'rgba(224,112,96,0.08)',
              border: '1px solid rgba(224,112,96,0.2)', borderRadius: 4, padding: '12px 14px',
            }}>
              {errors.map(e => (
                <p key={e} style={{ fontFamily: zen, fontSize: 13, color: '#e07060', margin: 0 }}>{e}</p>
              ))}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 20, width: '100%', padding: 15,
              background: filled ? '#1a1816' : '#E0DDD6',
              border: 'none', borderRadius: 4,
              cursor: submitting ? 'default' : 'pointer',
              fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.25em',
              textTransform: 'uppercase' as const,
              color: filled ? '#e8e4dc' : muted,
              opacity: submitting ? 0.6 : 1,
              transition: 'background 0.2s',
            }}
          >
            {submitting ? '送信中…' : 'Submit'}
          </button>

          <p style={{
            textAlign: 'center' as const, marginTop: 14,
            fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.15em', color: '#bbb',
          }}>
            回答は匿名で送信されます
          </p>
        </form>
      </div>
    </div>
  )
}
