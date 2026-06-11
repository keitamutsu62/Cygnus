import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomSheet, { useBottomSheetDismiss } from '../components/BottomSheet'
import { api, apiFetch } from '../lib/api'
import { getClaims, logout } from '../lib/auth'
import { useTheme, THEME_LABELS, type Theme } from '../lib/theme'
import type { Staff, Store, StaffRole } from '../types'
import { ROLE_LABEL } from '../types'

const josefin    = "'Josefin Sans', sans-serif"
const zen        = "'Zen Kaku Gothic New', sans-serif"
const gold       = 'var(--accent)'
const goldDim    = 'var(--accent-dim)'
const goldBorder = 'var(--accent-border)'
const muted      = 'var(--text-muted)'
const border     = 'var(--border)'
const surface    = 'var(--surface)'
const txt        = 'var(--text)'
const green      = '#6dba8e'
const greenDim   = 'rgba(109,186,142,0.1)'
const purpleDim  = 'rgba(150,100,220,0.1)'
const purple     = '#9664DC'
const grayDim    = 'rgba(232,228,220,0.06)'
const alertColor = '#e07060'

// BottomSheet 内のキャンセルボタン共通コンポーネント。
// setOpen(false) を直接呼ぶと exit アニメーションが飛ぶため、必ずこれを使う。
function SheetCancel({ label = 'キャンセル', style }: { label?: string; style?: React.CSSProperties }) {
  const dismiss = useBottomSheetDismiss()
  return (
    <button
      onClick={dismiss}
      style={{ width: '100%', padding: 12, background: 'transparent', border: 'none', fontFamily: zen, fontSize: 14, color: muted, cursor: 'pointer', ...style }}
    >
      {label}
    </button>
  )
}

type Dealer = { id: number; name: string; contact_method: 'LINE' | 'email'; contact_info: string; closing_day: number | null; status: string }
type BusinessHours = { open_time: string; close_time: string; closed_weekday: number | null }
type SubPage = 'profile' | 'hours' | 'staff-list' | 'staff-detail' | 'pos' | null

// ─── 招待モーダル ──────────────────────────────────────────────────────────────
function InviteModal({ onClose }: { onClose: () => void }) {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<StaffRole>('staff')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await api('/api/v1/auth/invite', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role }),
      })
      if (!res.ok) throw new Error()
      onClose()
    } catch {
      window.alert('招待の送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px',
    fontSize: 16, color: txt, fontFamily: zen, outline: 'none',
  }

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
        <OrbitSVG size={10}/>
        <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold }}>スタッフを招待</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 6 }}>メールアドレス</div>
          <input type="email" placeholder="staff@salon.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle}/>
        </div>
        <div>
          <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 6 }}>役職</div>
          <select value={role} onChange={e => setRole(e.target.value as StaffRole)} style={{ ...inputStyle, WebkitAppearance: 'none' }}>
            <option style={{ background: 'var(--bg)' }} value="staff">スタッフ</option>
            <option style={{ background: 'var(--bg)' }} value="admin">店長</option>
            <option style={{ background: 'var(--bg)' }} value="owner">オーナー</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(200,168,130,0.06)', border: `1px solid ${goldBorder}`, borderRadius: 2 }}>
        <div style={{ fontSize: 13, color: muted, fontFamily: zen, lineHeight: 1.8 }}>招待メールが送信されます。受け取った方は<br/>メール内のURLからアカウントを登録できます。</div>
      </div>
      <button onClick={send} disabled={sending || !email.trim()} style={{ width: '100%', marginTop: 16, padding: 14, background: (!email.trim() || sending) ? 'rgba(200,168,130,0.4)' : gold, border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 15, color: 'var(--on-accent)', cursor: sending || !email.trim() ? 'default' : 'pointer' }}>
        {sending ? '送信中...' : '招待メールを送信する'}
      </button>
      <SheetCancel style={{ marginTop: 8 }} />
    </BottomSheet>
  )
}

// ─── パスワード変更シート ──────────────────────────────────────────────────────
function PasswordChangeSheet({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [errMsg,  setErrMsg]  = useState<string | null>(null)
  const dismiss = useBottomSheetDismiss()

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px',
    fontSize: 16, color: txt, fontFamily: zen, outline: 'none',
  }

  async function save() {
    setErrMsg(null)
    if (!current) { setErrMsg('現在のパスワードを入力してください'); return }
    if (next.length < 8) { setErrMsg('新しいパスワードは8文字以上で入力してください'); return }
    if (next !== confirm) { setErrMsg('パスワードが一致しません'); return }
    setSaving(true)
    try {
      const res = await api('/api/v1/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({ current_password: current, new_password: next }),
      })
      if (!res.ok) {
        if (res.status === 401) { setErrMsg('現在のパスワードが正しくありません'); return }
        throw new Error()
      }
      dismiss()
    } catch {
      setErrMsg('パスワードの変更に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
        <OrbitSVG size={10} />
        <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold }}>パスワード変更</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 6 }}>現在のパスワード</div>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 6 }}>新しいパスワード（8文字以上）</div>
          <input type="password" value={next} onChange={e => setNext(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 6 }}>新しいパスワード（確認）</div>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} />
        </div>
      </div>
      {errMsg && (
        <div style={{ marginTop: 10, fontSize: 14, color: alertColor, fontFamily: zen }}>{errMsg}</div>
      )}
      <button
        onClick={save} disabled={saving}
        style={{ width: '100%', marginTop: 16, padding: 14, background: saving ? 'rgba(200,168,130,0.4)' : gold, border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 15, color: 'var(--on-accent)', cursor: saving ? 'default' : 'pointer' }}
      >
        {saving ? '変更中...' : '変更する'}
      </button>
      <SheetCancel style={{ marginTop: 8 }} />
    </BottomSheet>
  )
}

// ─── 臨時休業日シート ──────────────────────────────────────────────────────────
type SpecialClosure = { id: number; store_id: number; date: string; note: string }

function SpecialClosureSheet({ storeId, onClose }: { storeId: number; onClose: () => void }) {
  const [closures, setClosures] = useState<SpecialClosure[]>([])
  const [newDate,  setNewDate]  = useState('')
  const [newNote,  setNewNote]  = useState('')
  const [adding,   setAdding]   = useState(false)

  useEffect(() => {
    apiFetch<SpecialClosure[]>(`/api/v1/stores/${storeId}/special-closures`)
      .then(list => setClosures(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [storeId])

  async function add() {
    if (!newDate) return
    setAdding(true)
    try {
      const res = await api(`/api/v1/stores/${storeId}/special-closures`, {
        method: 'POST',
        body: JSON.stringify({ date: newDate, note: newNote }),
      })
      if (!res.ok) throw new Error()
      const c: SpecialClosure = await res.json()
      setClosures(prev => [...prev, c].sort((a, b) => a.date.localeCompare(b.date)))
      setNewDate('')
      setNewNote('')
    } catch {
      window.alert('追加に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  async function remove(id: number) {
    try {
      const res = await api(`/api/v1/stores/${storeId}/special-closures/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setClosures(prev => prev.filter(c => c.id !== id))
    } catch {
      window.alert('削除に失敗しました')
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, boxSizing: 'border-box', background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px',
    fontSize: 16, color: txt, fontFamily: zen, outline: 'none',
  }

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
        <OrbitSVG size={10} />
        <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold }}>臨時休業日</span>
      </div>

      {/* 既存の臨時休業日リスト */}
      {closures.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {closures.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(232,228,220,0.04)', border: `1px solid ${border}`, borderRadius: 2 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, color: gold }}>{c.date}</span>
                {c.note && <span style={{ marginLeft: 8, fontSize: 14, color: muted, fontFamily: zen }}>{c.note}</span>}
              </div>
              <button
                onClick={() => remove(c.id)}
                style={{ padding: '4px 10px', background: 'transparent', border: `1px solid rgba(224,112,96,0.3)`, borderRadius: 2, fontSize: 13, color: alertColor, fontFamily: zen, cursor: 'pointer' }}
              >削除</button>
            </div>
          ))}
        </div>
      )}

      {closures.length === 0 && (
        <div style={{ textAlign: 'center', color: muted, fontSize: 14, fontFamily: zen, marginBottom: 16, padding: '12px 0' }}>臨時休業日は登録されていません</div>
      )}

      {/* 新規追加 */}
      <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 8 }}>日付を追加</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text" placeholder="備考（年末年始・GW等）" value={newNote}
          onChange={e => setNewNote(e.target.value)}
          style={{ ...inputStyle, width: '100%' }}
        />
      </div>
      <button
        onClick={add} disabled={adding || !newDate}
        style={{ width: '100%', padding: 14, background: (!newDate || adding) ? 'rgba(200,168,130,0.4)' : gold, border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 15, color: 'var(--on-accent)', cursor: (!newDate || adding) ? 'default' : 'pointer' }}
      >
        {adding ? '追加中...' : '追加する'}
      </button>
      <SheetCancel style={{ marginTop: 8 }} />
    </BottomSheet>
  )
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// ─── Icon SVGs ─────────────────────────────────────────────────────────────────
const OrbitSVG = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ flexShrink: 0 }}>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(18 40 40)"  stroke={gold} strokeWidth="6" opacity="0.9"/>
    <ellipse cx="40" cy="40" rx="28" ry="14" transform="rotate(-18 40 40)" stroke={gold} strokeWidth="6" opacity="0.5"/>
  </svg>
)
const PosCardIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="3" width="12" height="9" rx="1.5" stroke={color} strokeWidth="1.1"/>
    <path d="M4 3V2C4 1.4 4.4 1 5 1H9C9.6 1 10 1.4 10 2V3" stroke={color} strokeWidth="1.1"/>
  </svg>
)
const MenuListIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="2" width="12" height="10" rx="1.5" stroke={color} strokeWidth="1.1"/>
    <line x1="4" y1="5"   x2="10" y2="5"   stroke={color} strokeWidth="1" strokeLinecap="round"/>
    <line x1="4" y1="7.5" x2="10" y2="7.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    <line x1="4" y1="10"  x2="7"  y2="10"  stroke={color} strokeWidth="1" strokeLinecap="round"/>
  </svg>
)
const BellIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1C7 1 4.5 2.5 4.5 6V9L3.5 10V11H10.5V10L9.5 9V6C9.5 2.5 7 1 7 1Z" stroke={color} strokeWidth="1.1" fill="none"/>
    <path d="M5.5 11C5.5 11.8 6.2 12.5 7 12.5C7.8 12.5 8.5 11.8 8.5 11" stroke={color} strokeWidth="1.1" fill="none"/>
  </svg>
)
const MailIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="3" width="10" height="8" rx="1.5" stroke={color} strokeWidth="1.1"/>
    <polyline points="2,5.5 7,8 12,5.5" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)
const ClockIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.1"/>
    <polyline points="7,4 7,7 9,9" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const CalPlusIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="2" width="10" height="10" rx="1.5" stroke={color} strokeWidth="1.1"/>
    <line x1="2" y1="6" x2="12" y2="6" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    <line x1="7" y1="8" x2="7" y2="12" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
    <line x1="5" y1="10" x2="9" y2="10" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)
const PersonIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="5.5" r="2.5" stroke={color} strokeWidth="1.1"/>
    <path d="M2 13C2 10.2 4.2 8 7 8C9.8 8 12 10.2 12 13" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)
const LogoutIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3H3C2.4 3 2 3.4 2 4V11C2 11.6 2.4 12 3 12H5" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 10L12 7L9 4" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="7" x2="6" y2="7" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <polyline points="6,4 10,8 6,12" stroke={muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <polyline points="13,4 7,10 13,16" stroke={txt} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ─── 共通 UI ──────────────────────────────────────────────────────────────────
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: muted, padding: '0 4px 8px', display: 'flex', alignItems: 'center', gap: 7 }}>
      <OrbitSVG size={10} /> {children}
    </div>
  )
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
      {children}
    </div>
  )
}

function SettingRow({
  icon, iconBg, label, value, badge, action, onClick, danger, last,
}: {
  icon?: React.ReactNode
  iconBg?: 'gold' | 'green' | 'gray' | 'purple'
  label: string; value?: string
  badge?: React.ReactNode; action?: React.ReactNode
  onClick?: () => void; danger?: boolean; last?: boolean
}) {
  const bgMap = { gold: goldDim, green: greenDim, gray: grayDim, purple: purpleDim }
  return (
    <div
      onClick={onClick}
      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 'none' : `1px solid ${border}`, cursor: onClick ? 'pointer' : 'default' }}
    >
      {icon && (
        <div style={{ width: 28, height: 28, borderRadius: 6, background: iconBg ? bgMap[iconBg] : grayDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 400, color: danger ? alertColor : txt, fontFamily: zen, marginBottom: value ? 2 : 0 }}>{label}</div>
        {value && <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>{value}</div>}
      </div>
      {badge}
      {action}
      {onClick && !action && <ChevronRight />}
    </div>
  )
}

function SBadge({ type }: { type: 'connected' | 'warning' }) {
  const s: Record<string, React.CSSProperties> = {
    connected: { background: greenDim, color: green, border: '1px solid rgba(109,186,142,0.3)' },
    warning:   { background: goldDim,  color: gold,  border: `1px solid ${goldBorder}` },
  }
  return (
    <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 1, ...s[type] }}>
      {type === 'connected' ? '接続中' : '未接続'}
    </div>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onToggle() }}
      style={{ width: 36, height: 20, borderRadius: 10, background: on ? green : 'rgba(232,228,220,0.15)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
    >
      <div style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}/>
    </div>
  )
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
        <ChevronLeft />
      </button>
      <div style={{ fontSize: 17, color: txt, fontFamily: zen }}>{title}</div>
    </div>
  )
}

// ─── サロンカード ──────────────────────────────────────────────────────────────
function SalonCard({ salonName }: { salonName: string }) {
  const navigate = useNavigate()
  return (
    <div onClick={() => navigate('/plan')} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${gold}, transparent)` }}/>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: goldDim, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <BellIcon color={gold} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 400, color: txt, fontFamily: zen, marginBottom: 2 }}>{salonName}</div>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: gold }}>Cygnus LOOP · Standard Plan · ¥14,700/月</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polyline points="6,4 10,8 6,12" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    </div>
  )
}

// ─── ディーラー締日編集モーダル ───────────────────────────────────────────────
function DealerEditModal({
  dealer,
  onClose,
  onSaved,
}: {
  dealer: Dealer
  onClose: () => void
  onSaved: () => void
}) {
  const [input,       setInput]       = useState(dealer.closing_day !== null ? String(dealer.closing_day) : '')
  const [saving,      setSaving]      = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const dismiss = useBottomSheetDismiss()

  async function saveClosingDay() {
    const v = input.trim() === '' ? null : parseInt(input)
    if (v !== null && (isNaN(v) || v < 1 || v > 28)) return
    setSaving(true)
    try {
      const body = { name: dealer.name, contact_method: dealer.contact_method, contact_info: dealer.contact_info, status: dealer.status, closing_day: v }
      const res = await api(`/api/v1/dealers/${dealer.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      onSaved()
      dismiss()
    } catch {
      window.alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function deleteDealer() {
    setSaving(true)
    try {
      const res = await api(`/api/v1/dealers/${dealer.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onSaved()
      dismiss()
    } catch {
      window.alert('削除に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, color: txt, marginBottom: 16 }}>{dealer.name}</div>

      {/* 締日 */}
      <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 8 }}>締日（1〜28日、空欄で未設定）</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 15, color: muted, fontFamily: zen }}>毎月</span>
        <input
          type="number" min="1" max="28"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="例: 20"
          style={{ flex: 1, background: 'rgba(232,228,220,0.06)', border: `1px solid ${goldBorder}`, borderRadius: 2, padding: '10px 12px', color: txt, fontSize: 16, fontFamily: josefin, fontWeight: 100, outline: 'none' }}
        />
        <span style={{ fontSize: 15, color: muted, fontFamily: zen }}>日</span>
      </div>
      <button
        onClick={saveClosingDay} disabled={saving}
        style={{ width: '100%', padding: 12, background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: 2, fontFamily: zen, fontSize: 15, color: gold, cursor: 'pointer', marginBottom: 16 }}
      >
        {saving ? '保存中...' : '締日を保存する'}
      </button>

      {/* 削除（インライン確認） */}
      <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14 }}>
        {confirmDel ? (
          <>
            <div style={{ fontSize: 14, color: muted, fontFamily: zen, marginBottom: 10, textAlign: 'center' as const }}>
              本当に削除しますか？この操作は取り消せません。
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDel(false)}
                style={{ flex: 1, padding: '11px 0', background: 'transparent', border: `1px solid ${border}`, borderRadius: 2, fontFamily: zen, fontSize: 14, color: muted, cursor: 'pointer' }}
              >
                やめる
              </button>
              <button
                onClick={deleteDealer} disabled={saving}
                style={{ flex: 2, padding: '11px 0', background: 'rgba(224,112,96,0.15)', border: '1px solid rgba(224,112,96,0.4)', borderRadius: 2, fontFamily: zen, fontSize: 14, color: alertColor, cursor: 'pointer' }}
              >
                {saving ? '削除中...' : '削除する'}
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            style={{ width: '100%', padding: 12, background: 'transparent', border: `1px solid ${border}`, borderRadius: 2, fontFamily: zen, fontSize: 14, color: muted, cursor: 'pointer' }}
          >
            このディーラーを削除する
          </button>
        )}
      </div>

      {!confirmDel && <SheetCancel />}
    </BottomSheet>
  )
}

// ─── ディーラー追加フォーム ────────────────────────────────────────────────────
function DealerAddForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name,       setName]       = useState('')
  const [method,     setMethod]     = useState<'LINE' | 'email'>('LINE')
  const [info,       setInfo]       = useState('')
  const [closingDay, setClosingDay] = useState('')
  const [saving,     setSaving]     = useState(false)
  const canSave = name.trim() && info.trim()

  async function save() {
    if (!canSave) return
    const cd = closingDay.trim() === '' ? null : parseInt(closingDay)
    if (cd !== null && (isNaN(cd) || cd < 1 || cd > 28)) return
    setSaving(true)
    try {
      const res = await api('/api/v1/dealers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), contact_method: method, contact_info: info.trim(), closing_day: cd }),
      })
      if (!res.ok) throw new Error()
      onDone()
    } catch {
      window.alert('保存に失敗しました')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px',
    fontSize: 16, color: txt, fontFamily: zen, outline: 'none',
  }

  return (
    <div style={{ padding: '14px 16px', borderTop: `1px solid ${border}`, background: 'rgba(232,228,220,0.02)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <input placeholder="ディーラー名" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['LINE', 'email'] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{
              flex: 1, padding: '8px 0', borderRadius: 2, cursor: 'pointer',
              fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.1em',
              border: `1px solid ${method === m ? goldBorder : border}`,
              background: method === m ? goldDim : 'transparent',
              color: method === m ? gold : muted,
            }}>
              {m === 'LINE' ? 'LINE' : 'メール'}
            </button>
          ))}
        </div>
        <input
          placeholder={method === 'LINE' ? '@account_id' : 'order@example.com'}
          value={info} onChange={e => setInfo(e.target.value)}
          style={inputStyle}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: muted, fontFamily: zen, whiteSpace: 'nowrap' as const }}>締日（任意）</span>
          <input
            type="number" min="1" max="28"
            placeholder="例: 20"
            value={closingDay} onChange={e => setClosingDay(e.target.value)}
            style={{ ...inputStyle, width: 80, flexShrink: 0 }}
          />
          <span style={{ fontSize: 14, color: muted, fontFamily: zen }}>日</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: `1px solid ${border}`, borderRadius: 2, fontFamily: zen, fontSize: 14, color: muted, cursor: 'pointer' }}>キャンセル</button>
        <button onClick={save} disabled={saving || !canSave} style={{ flex: 2, padding: '10px 0', background: (!canSave || saving) ? 'rgba(200,168,130,0.4)' : gold, border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 14, color: 'var(--on-accent)', cursor: canSave && !saving ? 'pointer' : 'default' }}>
          {saving ? '保存中...' : '追加する'}
        </button>
      </div>
    </div>
  )
}

// ─── スタッフ詳細画面 ──────────────────────────────────────────────────────────
function StaffDetail({
  staff,
  storeList,
  salonShimeiCharge,
  onBack,
  onUpdated,
}: {
  staff: Staff
  storeList: Store[]
  salonShimeiCharge: number
  onBack: () => void
  onUpdated: () => void
}) {
  const claims    = getClaims()
  const [rolePickerOpen,   setRolePickerOpen]   = useState(false)
  const [deactivateOpen,   setDeactivateOpen]   = useState(false)
  const [shimeiEditOpen,   setShimeiEditOpen]   = useState(false)
  const [shimeiInput,      setShimeiInput]      = useState('')
  const [saving, setSaving] = useState(false)

  const storeName = storeList.find(s => s.id === staff.store_id)?.name ?? '—'
  const initials  = staff.avatar_initials ?? staff.name.slice(0, 2)
  const isSelf    = claims?.staff_id === staff.id

  async function changeRole(role: StaffRole) {
    setSaving(true)
    setRolePickerOpen(false)
    try {
      const res = await api(`/api/v1/staffs/${staff.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error()
      onUpdated()
    } catch {
      window.alert('役職の変更に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function changeShimei(value: number | null) {
    setSaving(true)
    setShimeiEditOpen(false)
    try {
      const body = value === null
        ? { clear_shimei_charge: true }
        : { shimei_charge: value }
      const res = await api(`/api/v1/staffs/${staff.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      onUpdated()
    } catch {
      window.alert('指名料の変更に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive() {
    setSaving(true)
    setDeactivateOpen(false)
    try {
      const res = await api(`/api/v1/staffs/${staff.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !staff.is_active }),
      })
      if (!res.ok) throw new Error()
      onUpdated()
    } catch {
      window.alert('ステータスの変更に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const isActive = staff.is_active

  return (
    <div>
      <BackHeader title="スタッフ詳細" onBack={onBack} />

      {/* アバター */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0 32px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: goldDim, border: `2px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: josefin, fontWeight: 100, fontSize: 24, color: gold, opacity: isActive ? 1 : 0.4 }}>
          {initials}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 400, color: txt, fontFamily: zen, marginBottom: 4 }}>{staff.name}</div>
          <div style={{ fontSize: 14, color: muted, fontFamily: zen }}>{storeName} · {ROLE_LABEL[staff.role]}</div>
        </div>
        {/* ステータスバッジ（is_active 連動） */}
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 1,
          background: isActive ? greenDim : 'rgba(224,112,96,0.1)',
          color: isActive ? green : alertColor,
          border: isActive ? '1px solid rgba(109,186,142,0.3)' : '1px solid rgba(224,112,96,0.3)',
        }}>
          {isActive ? '有効' : '無効'}
        </div>
      </div>

      {/* アカウント情報 */}
      <GroupLabel>アカウント情報</GroupLabel>
      <SettingGroup>
        <SettingRow label="氏名" value={staff.name} />
        <SettingRow label="メールアドレス" value={staff.email} />
        <SettingRow label="所属店舗" value={storeName} />
        <SettingRow label="ステータス" value={isActive ? '有効（ログイン可能）' : '無効（ログイン停止中）'} />
        <SettingRow
          label="役職"
          value={ROLE_LABEL[staff.role]}
          onClick={isSelf ? undefined : () => setRolePickerOpen(true)}
        />
        <SettingRow
          label="指名料"
          value={staff.shimei_charge !== null
            ? `¥${staff.shimei_charge.toLocaleString('ja-JP')}（個別設定）`
            : `共通設定を使用（¥${salonShimeiCharge.toLocaleString('ja-JP')}）`}
          onClick={() => { setShimeiInput(String(staff.shimei_charge ?? salonShimeiCharge)); setShimeiEditOpen(true) }}
          last
        />
      </SettingGroup>

      {/* アカウント操作 */}
      {!isSelf && (
        <>
          <GroupLabel>アカウント操作</GroupLabel>
          <SettingGroup>
            <SettingRow
              label={isActive ? '無効にする' : '有効に戻す'}
              value={isActive ? 'このサロンへのアクセスを停止します' : 'ログインを再び許可します'}
              onClick={() => setDeactivateOpen(true)}
              danger={isActive}
              last
            />
          </SettingGroup>
        </>
      )}

      {saving && (
        <div style={{ textAlign: 'center', color: muted, fontSize: 13, fontFamily: josefin, padding: '8px 0' }}>更新中...</div>
      )}

      {/* 役職変更ピッカー */}
      {rolePickerOpen && (
        <BottomSheet onClose={() => setRolePickerOpen(false)}>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, color: txt, marginBottom: 16 }}>役職を変更</div>
          {(['owner', 'admin', 'staff'] as StaffRole[]).map(r => (
            <div
              key={r}
              onClick={() => changeRole(r)}
              style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}`, cursor: 'pointer' }}
            >
              <div style={{ fontSize: 15, color: r === staff.role ? gold : txt, fontFamily: zen }}>{ROLE_LABEL[r]}</div>
              {r === staff.role && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <polyline points="2.5,7 5.5,10.5 11.5,3.5" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
          <SheetCancel style={{ marginTop: 12 }} />
        </BottomSheet>
      )}

      {/* 指名料編集 */}
      {shimeiEditOpen && (
        <BottomSheet onClose={() => setShimeiEditOpen(false)}>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, color: txt, marginBottom: 4 }}>指名料（個別設定）</div>
          <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 16 }}>未設定の場合、サロン共通の指名料が適用されます</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 15, color: muted }}>¥</span>
            <input
              type="number"
              min="0"
              value={shimeiInput}
              onChange={e => setShimeiInput(e.target.value)}
              style={{ flex: 1, background: 'rgba(232,228,220,0.06)', border: `1px solid ${goldBorder}`, borderRadius: 2, padding: '10px 12px', color: txt, fontSize: 16, fontFamily: josefin, fontWeight: 100, outline: 'none' }}
            />
          </div>
          <button
            onClick={() => changeShimei(Math.max(0, parseInt(shimeiInput) || 0))}
            style={{ width: '100%', padding: 12, background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: 2, fontFamily: zen, fontSize: 15, color: gold, cursor: 'pointer', marginBottom: 8 }}
          >
            この金額で設定する
          </button>
          <button
            onClick={() => changeShimei(null)}
            style={{ width: '100%', padding: 12, background: 'transparent', border: `1px solid ${border}`, borderRadius: 2, fontFamily: zen, fontSize: 14, color: muted, cursor: 'pointer', marginBottom: 8 }}
          >
            共通設定に戻す（¥{salonShimeiCharge.toLocaleString('ja-JP')}）
          </button>
          <SheetCancel style={{ padding: 10 }} />
        </BottomSheet>
      )}

      {/* 有効/無効切り替え確認 */}
      {deactivateOpen && (
        <BottomSheet onClose={() => setDeactivateOpen(false)}>
          <div style={{ fontSize: 15, color: txt, fontFamily: zen, marginBottom: 8 }}>
            {isActive ? 'アカウントを無効にしますか？' : 'アカウントを有効に戻しますか？'}
          </div>
          <div style={{ fontSize: 14, color: muted, fontFamily: zen, lineHeight: 1.8, marginBottom: 20 }}>
            {isActive
              ? <>{staff.name} のアクセスを停止します。<br/>この操作は後から取り消せます。</>
              : <>{staff.name} のログインを再び許可します。</>
            }
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SheetCancel style={{ flex: 1, width: 'auto', padding: '11px 0', border: `1px solid ${border}`, borderRadius: 2 }} />
            <button
              onClick={toggleActive}
              style={{ flex: 2, padding: '11px 0', background: isActive ? 'rgba(224,112,96,0.15)' : greenDim, border: `1px solid ${isActive ? 'rgba(224,112,96,0.4)' : 'rgba(109,186,142,0.3)'}`, borderRadius: 2, fontFamily: zen, fontSize: 14, color: isActive ? alertColor : green, cursor: 'pointer' }}
            >
              {isActive ? '無効にする' : '有効に戻す'}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── プロフィール画面 ──────────────────────────────────────────────────────────
function ProfileSettings({ onBack }: { onBack: () => void }) {
  const claims   = getClaims()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [myStaff,          setMyStaff]          = useState<Staff | null>(null)
  const [myStore,          setMyStore]           = useState<Store | null>(null)
  const [showPasswordSheet, setShowPasswordSheet] = useState(false)
  const [avatarUploading,  setAvatarUploading]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function fetchStaff() {
    const list = await apiFetch<Staff[]>('/api/v1/staffs').catch(() => [] as Staff[])
    setMyStaff((Array.isArray(list) ? list : []).find(s => s.id === claims?.staff_id) ?? null)
  }

  useEffect(() => {
    fetchStaff()
    apiFetch<Store[]>('/api/v1/stores')
      .then(list => setMyStore((Array.isArray(list) ? list : []).find(s => s.id === claims?.store_id) ?? null))
      .catch(() => {})
  }, [])

  const initials = myStaff?.avatar_initials ?? (myStaff?.name ? myStaff.name.slice(0, 2) : '—')
  const avatarUrl = myStaff?.avatar_url ?? null

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target?.result as string
      const img = new Image()
      img.onload = async () => {
        const MAX = 400
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setAvatarUploading(true)
        try {
          await api('/api/v1/staffs/me/avatar', {
            method: 'PATCH',
            body: JSON.stringify({ avatar_url: dataUrl }),
          })
          await fetchStaff()
        } finally {
          setAvatarUploading(false)
        }
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <BackHeader title="プロフィール" onBack={onBack} />

      {/* アバター */}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: 'none' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0 32px' }}>
        <div
          onClick={() => !avatarUploading && fileRef.current?.click()}
          style={{ position: 'relative', cursor: 'pointer' }}
        >
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: goldDim, border: `2px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: josefin, fontWeight: 100, fontSize: 24, color: gold, overflow: 'hidden' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 2v7M2 5.5h7" stroke="var(--on-accent)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 400, color: txt, fontFamily: zen, marginBottom: 4 }}>{myStaff?.name ?? '—'}</div>
          <div style={{ fontSize: 14, color: muted, fontFamily: zen }}>
            {ROLE_LABEL[claims?.role ?? 'staff']} · {myStore?.name ?? '—'}
          </div>
        </div>
      </div>

      {/* アカウント情報 */}
      <GroupLabel>アカウント情報</GroupLabel>
      <SettingGroup>
        <SettingRow label="氏名" value={myStaff?.name ?? '—'} />
        <SettingRow label="役職" value={ROLE_LABEL[claims?.role ?? 'staff']} />
        <SettingRow label="所属店舗" value={myStore?.name ?? '—'} last />
      </SettingGroup>

      {/* テーマ */}
      <GroupLabel>テーマ</GroupLabel>
      <div style={{ margin: '0 16px', background: 'var(--surface)', borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 12 }}>アプリの表示テーマを選択してください</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['dark', 'light', 'pop'] as Theme[]).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                flex: 1, padding: '10px 4px', border: `1px solid ${theme === t ? gold : border}`,
                borderRadius: 6, background: theme === t ? goldDim : 'transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: t === 'dark' ? '#1a1816' : t === 'light' ? '#f7f3ee' : '#ffffff', border: '1px solid rgba(128,128,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t === 'dark' ? '#c8a882' : t === 'light' ? '#9b7c5a' : '#f06292' }} />
              </div>
              <span style={{ fontSize: 10, fontFamily: josefin, letterSpacing: '0.08em', color: theme === t ? gold : muted }}>{THEME_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* セキュリティ */}
      <GroupLabel>セキュリティ</GroupLabel>
      <SettingGroup>
        <SettingRow label="パスワード変更" onClick={() => setShowPasswordSheet(true)} />
        <SettingRow label="ログアウト" onClick={handleLogout} danger last />
      </SettingGroup>

      {showPasswordSheet && <PasswordChangeSheet onClose={() => setShowPasswordSheet(false)} />}

      {/* アカウント削除 */}
      <GroupLabel>アカウント削除</GroupLabel>
      <SettingGroup>
        <SettingRow
          label="アカウントを削除する"
          value="Cygnusアカウントとデータを完全に削除します"
          onClick={() => {
            if (window.confirm('アカウントを削除しますか？\nこの操作は取り消せません。')) {
              window.alert('バックエンド接続後に対応予定です')
            }
          }}
          danger
          last
        />
      </SettingGroup>
    </div>
  )
}

// ─── 営業時間・定休日画面 ─────────────────────────────────────────────────────
function HoursSettings({ onBack }: { onBack: () => void }) {
  const claims  = getClaims()
  const storeId = claims?.store_id
  const [openTime,   setOpenTime]   = useState('10:00')
  const [closeTime,  setCloseTime]  = useState('20:00')
  const [closedDay,  setClosedDay]  = useState<number | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [loaded,     setLoaded]     = useState(false)

  useEffect(() => {
    if (!storeId) return
    apiFetch<BusinessHours>(`/api/v1/stores/${storeId}/hours`)
      .then(data => {
        setOpenTime(data.open_time   ?? '10:00')
        setCloseTime(data.close_time ?? '20:00')
        setClosedDay(data.closed_weekday ?? null)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [storeId])

  async function save() {
    if (!storeId) return
    setSaving(true)
    try {
      const res = await api(`/api/v1/stores/${storeId}/hours`, {
        method: 'PUT',
        body: JSON.stringify({ open_time: openTime, close_time: closeTime, closed_weekday: closedDay }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      window.alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', maxWidth: '100%', boxSizing: 'border-box',
    background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px',
    fontSize: 16, color: txt, fontFamily: zen, outline: 'none',
  }

  return (
    <div>
      <BackHeader title="営業時間・定休日" onBack={onBack} />

      {!loaded && <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 14, fontFamily: josefin }}>Loading...</div>}

      {loaded && (
        <>
          <GroupLabel>営業時間</GroupLabel>
          <SettingGroup>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
              <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 8 }}>開始時刻</div>
              <div style={{ display: 'flex' }}>
                <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
              </div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 8 }}>終了時刻</div>
              <div style={{ display: 'flex' }}>
                <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
              </div>
            </div>
          </SettingGroup>

          <GroupLabel>定休日</GroupLabel>
          <SettingGroup>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                {WEEKDAYS.map((day, i) => {
                  const active = closedDay === i
                  return (
                    <button key={i} onClick={() => setClosedDay(active ? null : i)} style={{ padding: '8px 14px', borderRadius: 2, cursor: 'pointer', fontFamily: zen, fontSize: 15, border: `1px solid ${active ? goldBorder : border}`, background: active ? goldDim : 'transparent', color: active ? gold : muted }}>
                      {day}曜
                    </button>
                  )
                })}
                <button onClick={() => setClosedDay(null)} style={{ padding: '8px 14px', borderRadius: 2, cursor: 'pointer', fontFamily: zen, fontSize: 15, border: `1px solid ${closedDay === null ? goldBorder : border}`, background: closedDay === null ? goldDim : 'transparent', color: closedDay === null ? gold : muted }}>
                  なし
                </button>
              </div>
            </div>
          </SettingGroup>

          <button
            onClick={save} disabled={saving}
            style={{ width: '100%', padding: 14, background: saved ? greenDim : saving ? 'rgba(200,168,130,0.4)' : gold, border: saved ? '1px solid rgba(109,186,142,0.3)' : 'none', borderRadius: 2, fontFamily: zen, fontSize: 15, color: saved ? green : '#1a1816', cursor: saving ? 'default' : 'pointer' }}
          >
            {saving ? '保存中...' : saved ? '保存しました ✓' : '保存する'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── スタッフ一覧サブページ ────────────────────────────────────────────────────
function StaffListSettings({
  staffList,
  storeList,
  onSelectStaff,
  onInvite,
  onBack,
}: {
  staffList: Staff[]
  storeList: Store[]
  onSelectStaff: (s: Staff) => void
  onInvite: () => void
  onBack: () => void
}) {
  return (
    <div>
      <BackHeader title="スタッフ管理" onBack={onBack} />
      <GroupLabel>メンバー ({staffList.length}名)</GroupLabel>
      <SettingGroup>
        {staffList.map(s => {
          const storeName = storeList.find(st => st.id === s.store_id)?.name ?? '—'
          const av = s.avatar_initials ?? s.name.slice(0, 1)
          return (
            <div
              key={s.id}
              onClick={() => onSelectStaff(s)}
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${border}`, cursor: 'pointer' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: goldDim, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: josefin, fontWeight: 100, fontSize: 13, color: gold, flexShrink: 0, opacity: s.is_active ? 1 : 0.4 }}>
                {av}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 400, color: s.is_active ? txt : muted, fontFamily: zen, marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>{storeName} · {ROLE_LABEL[s.role]}</div>
              </div>
              <div style={{
                fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.12em',
                textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 1,
                background: s.is_active ? greenDim : 'rgba(224,112,96,0.1)',
                color: s.is_active ? green : alertColor,
                border: s.is_active ? '1px solid rgba(109,186,142,0.3)' : '1px solid rgba(224,112,96,0.3)',
              }}>
                {s.is_active ? '有効' : '無効'}
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <polyline points="6,4 10,8 6,12" stroke={muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )
        })}
        <div onClick={onInvite} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="7" y1="2" x2="7" y2="12" stroke={gold} strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="7" x2="12" y2="7" stroke={gold} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div style={{ fontSize: 15, color: gold, fontFamily: zen }}>スタッフを招待する</div>
        </div>
      </SettingGroup>
    </div>
  )
}

type PosType = 'none' | 'smaregi' | 'square'
const POS_LABEL: Record<PosType, string> = { none: '未設定', smaregi: 'スマレジ', square: 'Square' }

// ─── Square設定フォーム ───────────────────────────────────────────────────────
function SquareSettings({ inputStyle }: { inputStyle: React.CSSProperties }) {
  const [locationId, setLocationId] = useState('')
  const [token,      setToken]      = useState('')
  const [showToken,  setShowToken]  = useState(false)

  return (
    <SettingGroup>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
        <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 8 }}>Location ID</div>
        <input
          type="text" value={locationId} onChange={e => setLocationId(e.target.value)}
          placeholder="例: LXXXXXXXXXXXXXXXXX"
          style={inputStyle}
        />
      </div>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>Access Token</div>
          <button
            onClick={() => setShowToken(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: muted, fontFamily: josefin, letterSpacing: '0.1em' }}
          >
            {showToken ? '隠す' : '表示'}
          </button>
        </div>
        <input
          type={showToken ? 'text' : 'password'}
          value={token} onChange={e => setToken(e.target.value)}
          placeholder="EAAAxxxxxxxxxxxxxxxxxxxxxxxxx"
          style={inputStyle}
        />
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 13, color: muted, fontFamily: zen, lineHeight: 1.8 }}>
          Square DeveloperダッシュボードからAccess TokenとLocation IDを発行・確認できます。
        </div>
      </div>
    </SettingGroup>
  )
}

// ─── POS店舗別設定画面 ─────────────────────────────────────────────────────────
function PosStoreSettings({ store, onBack }: { store: Store; onBack: () => void }) {
  const [posType, setPosType] = useState<PosType>('none')
  const [storeId, setStoreId] = useState('')
  const [saved,   setSaved]   = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px',
    fontSize: 16, color: txt, fontFamily: zen, outline: 'none',
  }

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <BackHeader title={store.name} onBack={onBack} />

      <GroupLabel>接続するPOSシステム</GroupLabel>
      <SettingGroup>
        {(['none', 'smaregi', 'square'] as PosType[]).map((t, i, arr) => (
          <div
            key={t}
            onClick={() => setPosType(t)}
            style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none', cursor: 'pointer' }}
          >
            <div style={{ flex: 1, fontSize: 15, color: posType === t ? gold : txt, fontFamily: zen }}>{POS_LABEL[t]}</div>
            {posType === t && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <polyline points="2.5,7 5.5,10.5 11.5,3.5" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </SettingGroup>

      {posType === 'smaregi' && (
        <>
          <GroupLabel>スマレジ設定</GroupLabel>
          <SettingGroup>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
              <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 8 }}>Store ID</div>
              <input
                type="text" inputMode="numeric" value={storeId} onChange={e => setStoreId(e.target.value)}
                placeholder="例: 00123"
                style={inputStyle}
              />
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 13, color: muted, fontFamily: zen, lineHeight: 1.8 }}>
                スマレジのStore IDはスマレジ管理画面の「設定 → 店舗」から確認できます。
              </div>
            </div>
          </SettingGroup>
        </>
      )}

      {posType === 'square' && (
        <>
          <GroupLabel>Square設定</GroupLabel>
          <SquareSettings inputStyle={inputStyle} />
        </>
      )}

      {posType !== 'none' && (
        <button
          onClick={save}
          style={{ width: '100%', padding: 14, background: saved ? greenDim : gold, border: saved ? '1px solid rgba(109,186,142,0.3)' : 'none', borderRadius: 2, fontFamily: zen, fontSize: 15, color: saved ? green : '#1a1816', cursor: 'pointer' }}
        >
          {saved ? '保存しました ✓' : '保存する'}
        </button>
      )}
    </div>
  )
}

// ─── POS連携サブページ（店舗一覧） ────────────────────────────────────────────
function PosSettings({
  storeList,
  onBack,
}: {
  storeList: Store[]
  onBack: () => void
}) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)

  if (selectedStore) {
    return <PosStoreSettings store={selectedStore} onBack={() => setSelectedStore(null)} />
  }

  return (
    <div>
      <BackHeader title="POS連携" onBack={onBack} />
      <div style={{ padding: '10px 14px', background: 'rgba(200,168,130,0.06)', border: `1px solid ${goldBorder}`, borderRadius: 2, marginBottom: 20, fontSize: 13, color: muted, fontFamily: zen, lineHeight: 1.8 }}>
        店舗ごとにPOSシステムとの連携を設定できます。
      </div>
      <GroupLabel>店舗を選択</GroupLabel>
      <SettingGroup>
        {storeList.length === 0 ? (
          <div style={{ padding: '20px 16px', textAlign: 'center', color: muted, fontSize: 14, fontFamily: zen }}>店舗が登録されていません</div>
        ) : (
          storeList.map((store, i) => (
            <SettingRow
              key={store.id}
              icon={<PosCardIcon color="rgba(232,228,220,0.3)" />} iconBg="gray"
              label={store.name}
              value="未接続"
              badge={<SBadge type="warning" />}
              onClick={() => setSelectedStore(store)}
              last={i === storeList.length - 1}
            />
          ))
        )}
      </SettingGroup>
    </div>
  )
}

// ─── メインページ ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const claims   = getClaims()
  const navigate = useNavigate()
  const [sub,            setSub]            = useState<SubPage>(null)
  const [dealers,        setDealers]        = useState<Dealer[]>([])
  const [addOpen,        setAddOpen]        = useState(false)
  const [notif,          setNotif]          = useState({ stock: true, daily: false })
  const [hours,          setHours]          = useState<BusinessHours | null>(null)
  const [staffList,      setStaffList]      = useState<Staff[]>([])
  const [storeList,      setStoreList]      = useState<Store[]>([])
  const [myStaff,        setMyStaff]        = useState<Staff | null>(null)
  const [showInvite,     setShowInvite]     = useState(false)
  const [treatmentCount, setTreatmentCount] = useState(0)
  const [retailCount,    setRetailCount]    = useState(0)
  const [selectedStaff,       setSelectedStaff]       = useState<Staff | null>(null)
  const [salonShimeiCharge,   setSalonShimeiCharge]   = useState(1100)
  const [closingEditDealer,   setClosingEditDealer]   = useState<Dealer | null>(null)
  const [showClosureSheet,    setShowClosureSheet]    = useState(false)

  function loadDealers() {
    apiFetch<Dealer[]>('/api/v1/dealers')
      .then(d => setDealers(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  function loadStaffs() {
    apiFetch<Staff[]>('/api/v1/staffs')
      .then(list => {
        const arr = Array.isArray(list) ? list : []
        setStaffList(arr)
        setMyStaff(arr.find(s => s.id === claims?.staff_id) ?? null)
        if (selectedStaff) {
          const updated = arr.find(s => s.id === selectedStaff.id)
          if (updated) setSelectedStaff(updated)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadDealers()
    apiFetch<{ shimei_charge: number }>('/api/v1/settings')
      .then(d => { if (d?.shimei_charge !== undefined) setSalonShimeiCharge(d.shimei_charge) })
      .catch(() => {})
    const storeId = claims?.store_id
    if (storeId) {
      apiFetch<BusinessHours>(`/api/v1/stores/${storeId}/hours`)
        .then(setHours).catch(() => {})
    }
    apiFetch<Staff[]>('/api/v1/staffs')
      .then(list => {
        const arr = Array.isArray(list) ? list : []
        setStaffList(arr)
        setMyStaff(arr.find(s => s.id === claims?.staff_id) ?? null)
      })
      .catch(() => {})
    apiFetch<Store[]>('/api/v1/stores')
      .then(list => setStoreList(Array.isArray(list) ? list : []))
      .catch(() => {})
    apiFetch<{ id: number; is_active: boolean }[]>('/api/v1/menus?type=treatment')
      .then(list => setTreatmentCount(Array.isArray(list) ? list.filter(m => m.is_active).length : 0))
      .catch(() => {})
    apiFetch<{ id: number; is_active: boolean }[]>('/api/v1/menus?type=retail')
      .then(list => setRetailCount(Array.isArray(list) ? list.filter(m => m.is_active).length : 0))
      .catch(() => {})
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // サブページ
  if (sub === 'profile') {
    return (
      <div style={{ padding: '14px 20px 80px' }}>
        <ProfileSettings onBack={() => setSub(null)} />
      </div>
    )
  }
  if (sub === 'hours') {
    return (
      <div style={{ padding: '14px 20px 80px' }}>
        <HoursSettings onBack={() => setSub(null)} />
      </div>
    )
  }
  if (sub === 'staff-list') {
    return (
      <>
        <div style={{ padding: '14px 20px 80px' }}>
          <StaffListSettings
            staffList={staffList}
            storeList={storeList}
            onSelectStaff={s => { setSelectedStaff(s); setSub('staff-detail') }}
            onInvite={() => setShowInvite(true)}
            onBack={() => setSub(null)}
          />
        </div>
        {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      </>
    )
  }
  if (sub === 'staff-detail' && selectedStaff) {
    return (
      <div style={{ padding: '14px 20px 80px' }}>
        <StaffDetail
          staff={selectedStaff}
          storeList={storeList}
          salonShimeiCharge={salonShimeiCharge}
          onBack={() => { setSub('staff-list'); setSelectedStaff(null) }}
          onUpdated={() => loadStaffs()}
        />
      </div>
    )
  }
  if (sub === 'pos') {
    return (
      <div style={{ padding: '14px 20px 80px' }}>
        <PosSettings storeList={storeList} onBack={() => setSub(null)} />
      </div>
    )
  }

  const hoursLabel  = hours ? `${hours.open_time} 〜 ${hours.close_time}` : '—'


  return (
    <>
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 400, color: txt, fontFamily: zen }}>設定</div>
      </div>

      <div style={{ padding: '14px 20px 80px' }}>

        {/* サロンカード */}
        <SalonCard salonName={claims?.salon_name ?? '—'} />

        {/* スタッフ管理 */}
        <GroupLabel>スタッフ管理</GroupLabel>
        <SettingGroup>
          <SettingRow
            icon={<PersonIcon color={gold} />} iconBg="gold"
            label="スタッフ一覧・招待"
            value={staffList.length > 0 ? `${staffList.length}名` : '—'}
            onClick={() => setSub('staff-list')}
            last
          />
        </SettingGroup>

        {/* メニュー管理 */}
        <GroupLabel>メニュー管理</GroupLabel>
        <SettingGroup>
          <SettingRow
            icon={<MenuListIcon color={gold} />} iconBg="gold"
            label="メニュー一覧・編集"
            value={`施術 ${treatmentCount}件 · 物販 ${retailCount}件`}
            onClick={() => navigate('/menus')}
            last
          />
        </SettingGroup>

        {/* POS連携 */}
        <GroupLabel>POS連携</GroupLabel>
        <SettingGroup>
          <SettingRow
            icon={<PosCardIcon color="rgba(232,228,220,0.3)" />} iconBg="gray"
            label="POS連携設定"
            value={storeList.length > 0 ? `${storeList.length}店舗` : '店舗未登録'}
            onClick={() => setSub('pos')}
            last
          />
        </SettingGroup>

        {/* ディーラー登録 */}
        <GroupLabel>ディーラー登録</GroupLabel>
        <SettingGroup>
          {dealers.map((d, i) => (
            <div
              key={d.id}
              onClick={() => setClosingEditDealer(d)}
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${border}`, cursor: 'pointer' }}
            >
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, color: muted, minWidth: 16, textAlign: 'center' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 400, color: txt, fontFamily: zen, marginBottom: 2 }}>{d.name}</div>
                <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>
                  {d.contact_method === 'LINE' ? 'LINE' : 'メール'} · {d.contact_info}
                </div>
                <div style={{ fontSize: 12, color: d.closing_day !== null ? gold : muted, fontFamily: josefin, fontWeight: 100, marginTop: 2 }}>
                  {d.closing_day !== null ? `締日: 毎月${d.closing_day}日` : '締日: 未設定'}
                </div>
              </div>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 1, background: greenDim, color: green, border: '1px solid rgba(109,186,142,0.3)' }}>
                有効
              </div>
            </div>
          ))}
          {addOpen ? (
            <DealerAddForm
              onDone={() => { loadDealers(); setAddOpen(false) }}
              onCancel={() => setAddOpen(false)}
            />
          ) : (
            <div onClick={() => setAddOpen(true)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <line x1="7" y1="2" x2="7" y2="12" stroke={gold} strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="7" x2="12" y2="7" stroke={gold} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 15, color: gold, fontFamily: zen }}>ディーラーを追加</div>
            </div>
          )}
        </SettingGroup>

        {/* 通知設定 */}
        <GroupLabel>通知設定</GroupLabel>
        <SettingGroup>
          <SettingRow
            icon={<BellIcon color={purple} />} iconBg="purple"
            label="在庫アラート通知"
            action={<Toggle on={notif.stock} onToggle={() => setNotif(n => ({ ...n, stock: !n.stock }))} />}
          />
          <SettingRow
            icon={<MailIcon color={purple} />} iconBg="purple"
            label="日次レポート"
            action={<Toggle on={notif.daily} onToggle={() => setNotif(n => ({ ...n, daily: !n.daily }))} />}
            last
          />
        </SettingGroup>

        {/* 営業時間・休業日 */}
        <GroupLabel>営業時間・休業日</GroupLabel>
        <SettingGroup>
          <SettingRow
            icon={<ClockIcon color={gold} />} iconBg="gold"
            label="営業時間・定休日" value={hoursLabel}
            onClick={() => setSub('hours')}
          />
          <SettingRow
            icon={<CalPlusIcon color={gold} />} iconBg="gold"
            label="臨時休業日の追加" value="年末年始・GW等を登録"
            onClick={() => setShowClosureSheet(true)}
            last
          />
        </SettingGroup>

        {/* アカウント */}
        <GroupLabel>アカウント</GroupLabel>
        <SettingGroup>
          <SettingRow
            icon={<PersonIcon color="rgba(232,228,220,0.4)" />} iconBg="gray"
            label="プロフィール"
            value={myStaff ? `${myStaff.name} · ${myStaff.email}` : ROLE_LABEL[claims?.role ?? 'staff']}
            onClick={() => setSub('profile')}
          />
          <SettingRow
            icon={<LogoutIcon color="rgba(232,228,220,0.4)" />} iconBg="gray"
            label="ログアウト"
            onClick={handleLogout}
            last
          />
        </SettingGroup>

        {/* バージョン情報 */}
        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
          <div>
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.22em', color: txt, opacity: 0.3 }}>CYGNUS </span>
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.22em', color: gold, opacity: 0.3 }}>LOOP</span>
          </div>
          <div style={{ fontSize: 12, color: muted, opacity: 0.4, marginTop: 6 }}>Version 1.0.0</div>
        </div>

      </div>

    {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    {closingEditDealer && (
      <DealerEditModal
        dealer={closingEditDealer}
        onClose={() => setClosingEditDealer(null)}
        onSaved={() => { loadDealers(); setClosingEditDealer(null) }}
      />
    )}
    {showClosureSheet && claims?.store_id && (
      <SpecialClosureSheet
        storeId={claims.store_id}
        onClose={() => setShowClosureSheet(false)}
      />
    )}
    </>
  )
}
