import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const zen   = "'Zen Kaku Gothic New', sans-serif"
const alert = '#e07060'

export function useToast() {
  const [msg,     setMsg]     = useState<string | null>(null)
  const [isError, setIsError] = useState(true)
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show(m: string, error: boolean) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsError(error)
    setMsg(m)
    timerRef.current = setTimeout(() => setMsg(null), 4000)
  }

  return {
    msg,
    isError,
    showError:   (m: string) => show(m, true),
    showSuccess: (m: string) => show(m, false),
  }
}

export function Toast({ msg, isError = true }: { msg: string | null; isError?: boolean }) {
  if (!msg) return null
  const color  = isError ? alert : '#6dba8e'
  const border = isError ? 'rgba(224,112,96,0.4)' : 'rgba(109,186,142,0.4)'
  return createPortal(
    <div style={{
      position: 'fixed', bottom: 90, left: 20, right: 20, zIndex: 2000,
      background: '#1a1816', border: `1px solid ${border}`,
      borderRadius: 4, padding: '12px 16px',
      fontSize: 15, color, fontFamily: zen, lineHeight: 1.5,
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    }}>
      {msg}
    </div>,
    document.body
  )
}
