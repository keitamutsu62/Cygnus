import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { adminFetch } from '../lib/api'

// ── BottomSheet（LOOP と同一実装） ─────────────────────────────
const BS_CSS = `
.adm-bs-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: flex-end; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
.adm-bs-overlay.open { opacity: 1; pointer-events: auto; }
.adm-bs-panel {
  width: 100%; max-width: 600px; box-sizing: border-box;
  background: #1a1816;
  border-top: 1px solid rgba(200,168,130,0.3);
  border-radius: 16px 16px 0 0;
  padding: 24px 20px 48px;
  transform: translateY(100%);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  max-height: 85vh; overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  will-change: transform;
}
.adm-bs-overlay.open .adm-bs-panel { transform: translateY(0); }
`
;(function () {
  const existing = document.getElementById('adm-bs-styles')
  if (existing) existing.remove()
  const el = document.createElement('style')
  el.id = 'adm-bs-styles'
  el.textContent = BS_CSS
  document.head.appendChild(el)
})()

function BottomSheet({ onClose, children }: {
  onClose: () => void
  children: (close: () => void) => React.ReactNode
}) {
  const overlayRef    = useRef<HTMLDivElement>(null)
  const panelRef      = useRef<HTMLDivElement>(null)
  const onCloseRef    = useRef(onClose)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  onCloseRef.current  = onClose

  function close() {
    const overlay = overlayRef.current
    const panel   = panelRef.current
    if (overlay) {
      overlay.style.transition    = 'none'
      overlay.style.opacity       = '1'
      overlay.style.pointerEvents = 'none'
      overlay.classList.remove('open')
    }
    if (panel) {
      panel.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
      panel.style.transform  = 'translateY(100%)'
    }
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      onCloseRef.current()
    }, 450)
  }

  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        overlayRef.current?.classList.add('open')
      })
      return () => cancelAnimationFrame(id2)
    })
    return () => {
      cancelAnimationFrame(id1)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  // 背景スクロール禁止
  useEffect(() => {
    const overlay = overlayRef.current
    const panel   = panelRef.current
    if (!overlay || !panel) return
    const stop = (e: TouchEvent) => { if (!panel.contains(e.target as Node)) e.preventDefault() }
    overlay.addEventListener('touchmove', stop, { passive: false })
    return () => overlay.removeEventListener('touchmove', stop)
  }, [])

  // スワイプで閉じる
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    let sy = 0, isDragging = false

    const onStart = (e: TouchEvent) => { sy = e.touches[0].clientY; isDragging = true }
    const onMove  = (e: TouchEvent) => {
      if (!isDragging) return
      const dy = e.touches[0].clientY - sy
      if (dy > 0 && el.scrollTop === 0) {
        e.preventDefault()
        el.style.transition = 'none'
        el.style.transform  = `translateY(${dy}px)`
      }
    }
    const onEnd = (e: TouchEvent) => {
      isDragging = false
      const dy = e.changedTouches[0].clientY - sy
      if (dy > 80 && el.scrollTop === 0) {
        const overlay = overlayRef.current
        if (overlay) {
          overlay.style.transition    = 'none'
          overlay.style.opacity       = '1'
          overlay.style.pointerEvents = 'none'
          overlay.classList.remove('open')
        }
        el.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform  = 'translateY(100%)'
        setTimeout(() => onCloseRef.current(), 450)
      } else {
        el.style.transition = 'transform 0.35s ease'
        el.style.transform  = 'translateY(0)'
        setTimeout(() => { el.style.transition = ''; el.style.transform = '' }, 350)
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [])

  return createPortal(
    <div ref={overlayRef} className="adm-bs-overlay"
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div ref={panelRef} className="adm-bs-panel">
        <div style={{ width: 40, height: 3, background: 'rgba(232,228,220,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
        {children(close)}
      </div>
    </div>,
    document.body
  )
}

const gold    = '#c8a882'
const muted   = 'rgba(232,228,220,0.55)'
const border  = 'rgba(232,228,220,0.08)'
const green   = '#6dba8e'
const alert   = '#e07060'
const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"

type Status = 'scheduled' | 'done' | 'cancelled'
type Appt = {
  id: number; salon_name: string; title: string
  date: string; time: string | null; status: Status
  notes: string | null; result: string | null
}

const STATUS_COLOR: Record<Status, string> = {
  scheduled: gold, done: green, cancelled: muted,
}
const STATUS_LABEL: Record<Status, string> = {
  scheduled: '予定', done: '完了', cancelled: 'キャンセル',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function fmt(d: string) {
  const [, m, day] = d.split('-')
  return `${parseInt(m)}/${parseInt(day)}`
}

export default function AppointmentsPage() {
  const [list, setList]         = useState<Appt[]>([])
  const [loading, setLoading]   = useState(true)
  const [today]                 = useState(() => new Date())
  const [cursor, setCursor]     = useState(() => new Date())   // 表示月
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selected, setSelected] = useState<Appt | null>(null)  // 実績入力対象
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [resultInput, setResultInput] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function toast(msg: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToastMsg(msg)
    timerRef.current = setTimeout(() => setToastMsg(null), 3000)
  }

  async function load() {
    try {
      const data = await adminFetch<Appt[]>('/admin/v1/appointments')
      setList(data ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  // ── カレンダー計算 ──────────────────────────────────────────
  const year  = cursor.getFullYear()
  const month = cursor.getMonth()   // 0-indexed

  function toKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  // 月初の曜日 & 月末日
  const firstDay  = new Date(year, month, 1).getDay()
  const lastDate  = new Date(year, month + 1, 0).getDate()

  // 日付 → アポ list マップ
  const apptByDate = new Map<string, Appt[]>()
  list.forEach(a => {
    const key = a.date.slice(0, 10)
    if (!apptByDate.has(key)) apptByDate.set(key, [])
    apptByDate.get(key)!.push(a)
  })

  // 選択日のアポ
  const dayAppts = selectedDay ? (apptByDate.get(selectedDay) ?? []) : []

  // ── 統計 ──────────────────────────────────────────────────
  const total     = list.length
  const done      = list.filter(a => a.status === 'done').length
  const scheduled = list.filter(a => a.status === 'scheduled').length
  const cancelled = list.filter(a => a.status === 'cancelled').length

  // ── 月移動 ──────────────────────────────────────────────────
  function prevMonth() {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))
    setSelectedDay(null)
  }
  function nextMonth() {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))
    setSelectedDay(null)
  }

  // ── 新規登録 ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    salon_name: '', title: '',
    date: selectedDay ?? toKey(today.getFullYear(), today.getMonth(), today.getDate()),
    time: '', notes: '',
  })

  // フォームを開くとき選択日をデフォルトにセット
  function openForm() {
    setForm(f => ({
      ...f,
      date: selectedDay ?? toKey(today.getFullYear(), today.getMonth(), today.getDate()),
    }))
    setShowForm(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await adminFetch('/admin/v1/appointments', {
        method: 'POST',
        body: JSON.stringify({
          salon_name: form.salon_name, title: form.title,
          date: form.date, time: form.time || null, notes: form.notes || null,
        }),
      })
      setForm({ salon_name: '', title: '', date: form.date, time: '', notes: '' })
      setShowForm(false)
      await load()
      setSelectedDay(form.date)
      toast('アポを追加しました')
    } catch {
      toast('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  // ── ステータス変更 ──────────────────────────────────────────
  async function updateStatus(appt: Appt, status: Status) {
    try {
      await adminFetch(`/admin/v1/appointments/${appt.id}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      })
      await load()
    } catch { toast('更新に失敗しました') }
  }

  // ── 実績保存 ──────────────────────────────────────────────────
  async function saveResult(appt: Appt) {
    setSaving(true)
    try {
      await adminFetch(`/admin/v1/appointments/${appt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ result: resultInput, status: 'done' }),
      })
      setSelected(null)
      await load()
      toast('実績を記録しました')
    } catch { toast('エラーが発生しました')
    } finally { setSaving(false) }
  }

  // ── 削除 ──────────────────────────────────────────────────────
  async function handleDelete(appt: Appt) {
    if (!confirm(`「${appt.title}」を削除しますか？`)) return
    try {
      await adminFetch(`/admin/v1/appointments/${appt.id}`, { method: 'DELETE' })
      await load()
      toast('削除しました')
    } catch { toast('削除に失敗しました') }
  }

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div style={{ padding: '20px', maxWidth: 600, margin: '0 auto', paddingBottom: 100 }}>

      {/* ── カレンダーヘッダー ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.2em', color: gold }}>
          APPOINTMENTS
        </div>
        <button onClick={openForm} style={{
          padding: '8px 16px', background: gold, border: 'none',
          borderRadius: 4, color: '#1a1816', fontSize: 13,
          fontFamily: josefin, letterSpacing: '0.1em', cursor: 'pointer',
        }}>+ NEW</button>
      </div>

      {/* ── 月ナビ ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={navBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke={muted} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, letterSpacing: '0.15em', color: '#e8e4dc' }}>
          {year}年{month + 1}月
        </div>
        <button onClick={nextMonth} style={navBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke={muted} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── カレンダーグリッド ── */}
      <div style={{
        background: '#211f1d', border: `1px solid ${border}`,
        borderRadius: 8, overflow: 'hidden', marginBottom: 16,
      }}>
        {/* 曜日ヘッダー */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${border}` }}>
          {WEEKDAYS.map((w, i) => (
            <div key={w} style={{
              textAlign: 'center', padding: '8px 0',
              fontSize: 11, fontFamily: josefin, letterSpacing: '0.1em',
              color: i === 0 ? '#e07060' : i === 6 ? '#6dba8e' : muted,
            }}>{w}</div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {/* 空白セル */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} style={{ padding: '10px 0', minHeight: 48 }} />
          ))}

          {/* 日付セル */}
          {Array.from({ length: lastDate }).map((_, i) => {
            const day    = i + 1
            const key    = toKey(year, month, day)
            const appts  = apptByDate.get(key) ?? []
            const isToday    = key === todayKey
            const isSelected = key === selectedDay
            const hasAppt    = appts.length > 0
            const doneCnt    = appts.filter(a => a.status === 'done').length
            const schedCnt   = appts.filter(a => a.status === 'scheduled').length

            return (
              <div
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                style={{
                  padding: '8px 4px 6px',
                  minHeight: 48,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(200,168,130,0.1)' : 'transparent',
                  borderTop: isSelected ? `1px solid ${gold}` : '1px solid transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: isToday ? gold : 'transparent',
                  fontSize: 13,
                  fontFamily: josefin,
                  color: isToday ? '#1a1816' : isSelected ? gold : '#e8e4dc',
                  fontWeight: isToday ? 400 : 100,
                }}>
                  {day}
                </div>

                {/* アポドット */}
                {hasAppt && (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {schedCnt > 0 && (
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: gold }} />
                    )}
                    {doneCnt > 0 && (
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: green }} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 選択日のアポ一覧 ── */}
      {selectedDay && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.15em', marginBottom: 8 }}>
            {parseInt(selectedDay.split('-')[1])}月{parseInt(selectedDay.split('-')[2])}日
          </div>
          {dayAppts.length === 0 ? (
            <div style={{
              padding: '20px 16px', background: '#211f1d', border: `1px solid ${border}`,
              borderRadius: 8, fontSize: 14, color: muted, fontFamily: zen, textAlign: 'center',
            }}>
              この日のアポはありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayAppts.map(a => (
                <ApptCard key={a.id} appt={a}
                  onComplete={() => { setSelected(a); setResultInput(a.result ?? '') }}
                  onDelete={() => handleDelete(a)}
                  onCancel={() => updateStatus(a, 'cancelled')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 統計 ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8, marginBottom: 16,
      }}>
        {[
          { label: 'アポ総数', value: total, color: '#e8e4dc' },
          { label: '予定中',   value: scheduled, color: gold },
          { label: '完了',     value: done,      color: green },
          { label: 'キャンセル', value: cancelled, color: muted },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#211f1d', border: `1px solid ${border}`,
            borderRadius: 8, padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontFamily: josefin, fontWeight: 100, color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── 新規フォーム（BottomSheet） ── */}
      {showForm && (
        <BottomSheet onClose={() => setShowForm(false)}>
          {close => (
            <>
              <div style={{ fontSize: 11, color: gold, fontFamily: josefin, letterSpacing: '0.22em', marginBottom: 20 }}>
                // NEW APPOINTMENT
              </div>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'salon_name', label: 'サロン名', type: 'text', required: true },
                  { key: 'title',      label: '内容',     type: 'text', required: true },
                  { key: 'date',       label: '日付',     type: 'date', required: true },
                  { key: 'time',       label: '時間',     type: 'time', required: false },
                ].map(({ key, label, type, required }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>
                      {label}{required && ' *'}
                    </label>
                    <input type={type} required={required}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>
                    メモ
                  </label>
                  <textarea rows={3} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={close} style={outlineBtn}>CANCEL</button>
                  <button type="submit" disabled={saving} style={{ ...goldBtn, flex: 2, opacity: saving ? 0.5 : 1 }}>
                    {saving ? '...' : 'ADD'}
                  </button>
                </div>
              </form>
            </>
          )}
        </BottomSheet>
      )}

      {/* ── 実績入力（BottomSheet） ── */}
      {selected && (
        <BottomSheet onClose={() => setSelected(null)}>
          {close => (
            <>
              <div style={{ fontSize: 11, color: gold, fontFamily: josefin, letterSpacing: '0.22em', marginBottom: 16 }}>
                // RESULT
              </div>
              <div style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.1em', marginBottom: 4 }}>
                {selected.salon_name}
              </div>
              <div style={{ fontSize: 16, fontFamily: zen, color: '#e8e4dc', marginBottom: 20 }}>
                {selected.title}
              </div>
              <label style={{ fontSize: 11, color: muted, fontFamily: josefin, letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>
                実績・結果
              </label>
              <textarea rows={4} value={resultInput}
                onChange={e => setResultInput(e.target.value)}
                placeholder="商談内容、次のアクションなど..."
                style={{ ...inputStyle, marginBottom: 16, resize: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={close} style={outlineBtn}>CANCEL</button>
                <button onClick={() => saveResult(selected)} disabled={saving}
                  style={{ ...goldBtn, flex: 2, opacity: saving ? 0.5 : 1 }}>
                  {saving ? '...' : '完了として記録'}
                </button>
              </div>
            </>
          )}
        </BottomSheet>
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 80, left: 20, right: 20,
          background: '#211f1d', border: `1px solid ${border}`,
          borderRadius: 4, padding: '12px 16px',
          fontSize: 14, color: '#e8e4dc', fontFamily: zen,
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)', zIndex: 200,
        }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}

// ── ApptCard ───────────────────────────────────────────────────
function ApptCard({ appt, onComplete, onDelete, onCancel }: {
  appt: Appt
  onComplete?: () => void
  onDelete: () => void
  onCancel?: () => void
}) {
  const [open, setOpen] = useState(false)
  const border  = 'rgba(232,228,220,0.08)'
  const muted   = 'rgba(232,228,220,0.55)'
  const josefin = "'Josefin Sans', sans-serif"
  const zen     = "'Zen Kaku Gothic New', sans-serif"

  return (
    <div style={{ background: '#211f1d', border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[appt.status] }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {appt.time && (
              <span style={{ fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.08em' }}>{appt.time}</span>
            )}
            <span style={{ fontSize: 11, color: STATUS_COLOR[appt.status], fontFamily: josefin, letterSpacing: '0.08em' }}>
              {STATUS_LABEL[appt.status]}
            </span>
          </div>
          <div style={{ fontSize: 14, color: '#e8e4dc', fontFamily: zen, marginTop: 2 }}>{appt.title}</div>
          <div style={{ fontSize: 12, color: muted, fontFamily: zen }}>{appt.salon_name}</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }}>
          <path d="M2 4L6 8L10 4" stroke={muted} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${border}`, padding: '10px 14px' }}>
          {appt.notes && (
            <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
              {appt.notes}
            </div>
          )}
          {appt.result && (
            <div style={{
              padding: '8px 10px', marginBottom: 8,
              background: 'rgba(109,186,142,0.08)', border: '1px solid rgba(109,186,142,0.2)',
              borderRadius: 4, fontSize: 13, color: '#6dba8e', fontFamily: zen, whiteSpace: 'pre-wrap',
            }}>
              {appt.result}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {onComplete && <button onClick={onComplete} style={tagBtn('#c8a882', '#1a1816')}>実績を記録</button>}
            {onCancel   && <button onClick={onCancel}   style={tagBtn('transparent', muted, `1px solid rgba(232,228,220,0.15)`)}>キャンセル</button>}
            <button onClick={onDelete} style={tagBtn('transparent', '#e07060', '1px solid rgba(224,112,96,0.3)')}>削除</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── スタイル定数 ───────────────────────────────────────────────
const navBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: '#1a1816', border: '1px solid rgba(232,228,220,0.08)',
  borderRadius: 4, color: '#e8e4dc', fontSize: 14,
  fontFamily: "'Zen Kaku Gothic New', sans-serif", outline: 'none', colorScheme: 'dark',
}
const goldBtn: React.CSSProperties = {
  padding: '12px', background: '#c8a882', border: 'none',
  borderRadius: 4, color: '#1a1816', fontSize: 13,
  fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', cursor: 'pointer',
}
const outlineBtn: React.CSSProperties = {
  flex: 1, padding: '12px', background: 'transparent',
  border: '1px solid rgba(232,228,220,0.08)', borderRadius: 4,
  color: 'rgba(232,228,220,0.55)', fontSize: 13,
  fontFamily: "'Josefin Sans', sans-serif", cursor: 'pointer',
}
function tagBtn(bg: string, color: string, border = 'none'): React.CSSProperties {
  return { padding: '6px 12px', background: bg, border, borderRadius: 4, color, fontSize: 12, fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.08em', cursor: 'pointer' }
}
