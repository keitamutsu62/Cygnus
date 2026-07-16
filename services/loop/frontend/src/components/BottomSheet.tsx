import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SHEET_BG    = 'var(--bg)'
const HANDLE_BG   = 'var(--border)'
const GOLD_BORDER = 'var(--accent-border)'
const DISMISS_THRESHOLD = 80
const ANIM_MS = 240

// キャンセルボタンなど「閉じる」操作をする子要素が dismiss を呼べるよう Context で渡す。
// 直接 setOpen(false) を呼ぶと exit アニメーションが走らずパッと消えるためこの経路を使う。
const DismissCtx = createContext<() => void>(() => {})
export const useBottomSheetDismiss = () => useContext(DismissCtx)

/**
 * Cygnus 標準ボトムシート
 *
 * スワイプ検知:
 *   - シート全体: コンテンツが先頭にあるとき下スワイプでディスミス（passive:false で preventDefault）
 *
 * Portal (document.body) マウントで:
 *   - ボトムナビより確実に上に表示
 *   - 背景スクロールコンテナにタッチが届かない
 *
 * 子コンポーネントから dismiss するには useBottomSheetDismiss() を使う。
 * → setOpen(false) を直接呼ぶと exit アニメーションが飛ぶため使用禁止。
 */
export default function BottomSheet({
  onClose,
  maxHeight = '75vh',
  children,
}: {
  onClose: () => void
  maxHeight?: string
  children: React.ReactNode
}) {
  const [entered, setEntered] = useState(false)
  const [dragY,   setDragY]   = useState(0)
  const [exiting, setExiting] = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragYRef   = useRef(0)
  const startYRef  = useRef<number | null>(null)
  const exitingRef = useRef(false)
  const exitTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prev
      if (exitTimer.current) clearTimeout(exitTimer.current)
    }
  }, [])

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return

    function onStart(e: TouchEvent) {
      startYRef.current = e.touches[0].clientY
    }
    function onMove(e: TouchEvent) {
      if (startYRef.current === null || exitingRef.current) return
      const dy = e.touches[0].clientY - startYRef.current
      const atTop = (contentRef.current?.scrollTop ?? 0) <= 0
      if (dy > 0 && atTop) {
        e.preventDefault()
        dragYRef.current = dy
        setDragY(dy)
      }
    }
    function onEnd() {
      if (exitingRef.current) return
      if (dragYRef.current > DISMISS_THRESHOLD) {
        dismiss()
      } else {
        dragYRef.current = 0
        setDragY(0)
      }
      startYRef.current = null
    }

    sheet.addEventListener('touchstart',  onStart, { passive: true })
    sheet.addEventListener('touchmove',   onMove,  { passive: false })
    sheet.addEventListener('touchend',    onEnd,   { passive: true })
    sheet.addEventListener('touchcancel', onEnd,   { passive: true })
    return () => {
      sheet.removeEventListener('touchstart',  onStart)
      sheet.removeEventListener('touchmove',   onMove)
      sheet.removeEventListener('touchend',    onEnd)
      sheet.removeEventListener('touchcancel', onEnd)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    if (exitingRef.current) return
    exitingRef.current = true
    setExiting(true)
    exitTimer.current = setTimeout(onClose, ANIM_MS)
  }

  const isDragging     = dragY > 0 && !exiting
  const sheetTransform = exiting
    ? 'translateY(100%)'
    : entered ? `translateY(${dragY}px)` : 'translateY(100%)'
  const sheetTransition = isDragging
    ? 'none'
    : `transform ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
  const backdropAlpha = entered && !exiting ? 0.55 : 0

  return createPortal(
    <DismissCtx.Provider value={dismiss}>
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0,
          background: `rgba(0,0,0,${backdropAlpha})`,
          transition: `background ${ANIM_MS}ms`,
          zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <div
          ref={sheetRef}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 480,
            background: SHEET_BG,
            borderTop: `1px solid ${GOLD_BORDER}`,
            borderRadius: '16px 16px 0 0',
            maxHeight,
            display: 'flex',
            flexDirection: 'column',
            transform: sheetTransform,
            transition: sheetTransition,
            willChange: 'transform',
          }}
        >
          <div style={{ flexShrink: 0, padding: '16px 20px 14px', cursor: 'grab' }}>
            <div style={{ width: 36, height: 4, background: HANDLE_BG, borderRadius: 2, margin: '0 auto' }} />
          </div>
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0 20px 44px',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </div>
    </DismissCtx.Provider>,
    document.body,
  )
}
