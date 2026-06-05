import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const zen   = "'Zen Kaku Gothic New', sans-serif"
const alert = '#e07060'

export function useToast() {
  const [msg,   setMsg]   = useState<string | null>(null)
  const timerRef          = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showError(m: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMsg(m)
    timerRef.current = setTimeout(() => setMsg(null), 4000)
  }

  return { msg, showError }
}

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null
  return createPortal(
    <div style={{
      position: 'fixed', bottom: 90, left: 20, right: 20, zIndex: 2000,
      background: '#1a1816', border: '1px solid rgba(224,112,96,0.4)',
      borderRadius: 4, padding: '12px 16px',
      fontSize: 15, color: alert, fontFamily: zen, lineHeight: 1.5,
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    }}>
      {msg}
    </div>,
    document.body
  )
}
