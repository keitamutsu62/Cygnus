import { useState } from 'react'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = '#C8A882'

const OrbitSVG = () => (
  <svg width="36" height="36" viewBox="0 0 80 80" fill="none">
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke={gold} strokeWidth="5" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="5" opacity="0.5"/>
  </svg>
)

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function ThankYouPage() {
  const [copied, setCopied] = useState(false)
  const reviewDraft = sessionStorage.getItem('cygnus_review_draft') ?? ''
  const googleUrl   = localStorage.getItem('cygnus_google_review_url') ?? ''
  const showGoogle  = reviewDraft.length > 0

  async function handleGoogleReview() {
    try { await navigator.clipboard.writeText(reviewDraft) } catch { /* ignore */ }
    setCopied(true)
    if (googleUrl) setTimeout(() => window.open(googleUrl, '_blank'), 400)
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#1a1816',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        {/* Check circle */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          border: `1.5px solid rgba(200,168,130,0.4)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 32px',
        }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={gold} strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h1 style={{
          fontFamily: zen, fontWeight: 300, fontSize: 22, color: '#e8e4dc',
          margin: '0 0 16px', lineHeight: 1.5,
        }}>
          ありがとうございました
        </h1>
        <p style={{
          fontFamily: zen, fontWeight: 300, fontSize: 14,
          color: 'rgba(232,228,220,0.45)', lineHeight: 1.8, margin: 0,
        }}>
          いただいたご意見を大切に<br />
          スタッフのより良いサービスに<br />
          活かしてまいります。
        </p>

        {showGoogle && (
          <div style={{ marginTop: 36 }}>
            <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: 'rgba(232,228,220,0.4)', margin: '0 0 14px', lineHeight: 1.7 }}>
              よろしければ、Googleにも<br />口コミを投稿していただけますか？
            </p>
            <button
              onClick={handleGoogleReview}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '13px 0',
                background: copied ? 'rgba(200,168,130,0.15)' : 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(200,168,130,0.3)',
                borderRadius: 4, cursor: 'pointer',
                fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.18em',
                color: copied ? gold : 'rgba(232,228,220,0.7)',
                transition: 'all 0.2s',
              }}
            >
              {copied ? (
                <span>コピーしました — 貼り付けてください</span>
              ) : (
                <><GoogleIcon /><span>Googleで口コミを投稿する</span></>
              )}
            </button>
          </div>
        )}

        <div style={{ width: 1, height: 40, background: 'rgba(200,168,130,0.2)', margin: '40px auto 32px' }} />

        <OrbitSVG />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, justifyContent: 'center', marginTop: 10 }}>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.25em', color: 'rgba(232,228,220,0.3)' }}>CYGNUS</span>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.25em', color: 'rgba(200,168,130,0.5)' }}>VOICE</span>
        </div>
      </div>
    </div>
  )
}
