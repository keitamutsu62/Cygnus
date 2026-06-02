import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { api, apiFetch } from '../lib/api'
import { getClaims, logout } from '../lib/auth'
import type { Staff, Store, StaffRole } from '../types'
import { ROLE_LABEL } from '../types'

const josefin    = "'Josefin Sans', sans-serif"
const zen        = "'Zen Kaku Gothic New', sans-serif"
const gold       = '#c8a882'
const goldDim    = 'rgba(200,168,130,0.12)'
const goldBorder = 'rgba(200,168,130,0.2)'
const muted      = 'rgba(232,228,220,0.55)'
const border     = 'rgba(232,228,220,0.08)'
const surface    = '#211f1d'
const txt        = '#e8e4dc'
const green      = '#6dba8e'
const greenDim   = 'rgba(109,186,142,0.1)'
const purpleDim  = 'rgba(150,100,220,0.1)'
const purple     = '#9664DC'
const grayDim    = 'rgba(232,228,220,0.06)'
const alert      = '#e07060'

type Dealer = { id: number; name: string; contact_method: 'LINE' | 'email'; contact_info: string }
type BusinessHours = { open_time: string; close_time: string; closed_weekday: number | null }
type SubPage = 'profile' | 'hours' | null

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
      alert('招待の送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px',
    fontSize: 14, color: txt, fontFamily: zen, outline: 'none',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 480, background: '#1a1816', borderTop: `1px solid ${goldBorder}`, borderRadius: '16px 16px 0 0', padding: '20px 20px 40px' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 3, background: 'rgba(232,228,220,0.15)', borderRadius: 2, margin: '0 auto 20px' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
          <OrbitSVG size={10}/>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: gold }}>スタッフを招待</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 6 }}>メールアドレス</div>
            <input type="email" placeholder="staff@salon.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle}/>
          </div>
          <div>
            <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 6 }}>役職</div>
            <select value={role} onChange={e => setRole(e.target.value as StaffRole)} style={{ ...inputStyle, WebkitAppearance: 'none' as any }}>
              <option style={{ background: '#1a1816' }} value="staff">スタッフ</option>
              <option style={{ background: '#1a1816' }} value="admin">店長</option>
              <option style={{ background: '#1a1816' }} value="owner">オーナー</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(200,168,130,0.06)', border: `1px solid ${goldBorder}`, borderRadius: 2 }}>
          <div style={{ fontSize: 11, color: muted, fontFamily: zen, lineHeight: 1.8 }}>招待メールが送信されます。受け取った方は<br/>メール内のURLからアカウントを登録できます。</div>
        </div>
        <button onClick={send} disabled={sending || !email.trim()} style={{ width: '100%', marginTop: 16, padding: 14, background: (!email.trim() || sending) ? 'rgba(200,168,130,0.4)' : gold, border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 13, color: '#1a1816', cursor: sending || !email.trim() ? 'default' : 'pointer' }}>
          {sending ? '送信中...' : '招待メールを送信する'}
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, padding: 12, background: 'transparent', border: 'none', fontFamily: zen, fontSize: 12, color: muted, cursor: 'pointer' }}>キャンセル</button>
      </div>
    </div>
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
const BellIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1C7 1 4.5 2.5 4.5 6V9L3.5 10V11H10.5V10L9.5 9V6C9.5 2.5 7 1 7 1Z" stroke={color} strokeWidth="1.1" fill="none"/>
    <path d="M5.5 11C5.5 11.8 6.2 12.5 7 12.5C7.8 12.5 8.5 11.8 8.5 11" stroke={color} strokeWidth="1.1" fill="none"/>
  </svg>
)
const CircleNotifIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.1"/>
    <polyline points="4.5,7 6.5,9 9.5,5" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
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
const CalIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="2" width="10" height="10" rx="1.5" stroke={color} strokeWidth="1.1"/>
    <line x1="5" y1="1" x2="5" y2="3" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
    <line x1="9" y1="1" x2="9" y2="3" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
    <line x1="2" y1="6" x2="12" y2="6" stroke={color} strokeWidth="1" strokeLinecap="round"/>
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
    <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: muted, padding: '0 4px 8px', display: 'flex', alignItems: 'center', gap: 7 }}>
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
        <div style={{ fontSize: 13, fontWeight: 400, color: danger ? alert : txt, fontFamily: zen, marginBottom: value ? 2 : 0 }}>{label}</div>
        {value && <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>{value}</div>}
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
    <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 1, ...s[type] }}>
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
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${gold}, transparent)` }}/>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: goldDim, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <BellIcon color={gold} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 400, color: txt, fontFamily: zen, marginBottom: 2 }}>{salonName}</div>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: gold }}>Cygnus LOOP · Standard Plan · ¥14,700/月</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polyline points="6,4 10,8 6,12" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    </div>
  )
}

// ─── ディーラー追加フォーム ────────────────────────────────────────────────────
function DealerAddForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name,   setName]   = useState('')
  const [method, setMethod] = useState<'LINE' | 'email'>('LINE')
  const [info,   setInfo]   = useState('')
  const [saving, setSaving] = useState(false)
  const canSave = name.trim() && info.trim()

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      const res = await api('/api/v1/dealers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), contact_method: method, contact_info: info.trim() }),
      })
      if (!res.ok) throw new Error()
      onDone()
    } catch {
      alert('保存に失敗しました')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px',
    fontSize: 14, color: txt, fontFamily: zen, outline: 'none',
  }

  return (
    <div style={{ padding: '14px 16px', borderTop: `1px solid ${border}`, background: 'rgba(232,228,220,0.02)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <input placeholder="ディーラー名" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['LINE', 'email'] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{
              flex: 1, padding: '8px 0', borderRadius: 2, cursor: 'pointer',
              fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.1em',
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
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: `1px solid ${border}`, borderRadius: 2, fontFamily: zen, fontSize: 12, color: muted, cursor: 'pointer' }}>キャンセル</button>
        <button onClick={save} disabled={saving || !canSave} style={{ flex: 2, padding: '10px 0', background: (!canSave || saving) ? 'rgba(200,168,130,0.4)' : gold, border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 12, color: '#1a1816', cursor: canSave && !saving ? 'pointer' : 'default' }}>
          {saving ? '保存中...' : '追加する'}
        </button>
      </div>
    </div>
  )
}

// ─── プロフィール画面 ──────────────────────────────────────────────────────────
function ProfileSettings({ onBack }: { onBack: () => void }) {
  const claims   = getClaims()
  const navigate = useNavigate()
  const [myStaff, setMyStaff] = useState<Staff | null>(null)
  const [myStore, setMyStore] = useState<Store | null>(null)

  useEffect(() => {
    apiFetch<Staff[]>('/api/v1/staffs')
      .then(list => setMyStaff((Array.isArray(list) ? list : []).find(s => s.id === claims?.staff_id) ?? null))
      .catch(() => {})
    apiFetch<Store[]>('/api/v1/stores')
      .then(list => setMyStore((Array.isArray(list) ? list : []).find(s => s.id === claims?.store_id) ?? null))
      .catch(() => {})
  }, [])

  const initials = myStaff?.avatar_initials ?? (myStaff?.name ? myStaff.name.slice(0, 2) : '—')

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <BackHeader title="プロフィール" onBack={onBack} />

      {/* アバター */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0 32px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: goldDim, border: `2px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: josefin, fontWeight: 100, fontSize: 24, color: gold }}>
          {initials}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 400, color: txt, fontFamily: zen, marginBottom: 4 }}>{myStaff?.name ?? '—'}</div>
          <div style={{ fontSize: 12, color: muted, fontFamily: zen }}>
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

      {/* セキュリティ */}
      <GroupLabel>セキュリティ</GroupLabel>
      <SettingGroup>
        <SettingRow label="パスワード変更" onClick={() => {}} />
        <SettingRow label="ログアウト" onClick={handleLogout} danger last />
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
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px',
    fontSize: 16, color: txt, fontFamily: zen, outline: 'none',
  }

  return (
    <div>
      <BackHeader title="営業時間・定休日" onBack={onBack} />

      {!loaded && <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 12, fontFamily: josefin }}>Loading...</div>}

      {loaded && (
        <>
          <GroupLabel>営業時間</GroupLabel>
          <SettingGroup>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 8 }}>開始時刻</div>
              <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 8 }}>終了時刻</div>
              <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} style={inputStyle} />
            </div>
          </SettingGroup>

          <GroupLabel>定休日</GroupLabel>
          <SettingGroup>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                {WEEKDAYS.map((day, i) => {
                  const active = closedDay === i
                  return (
                    <button key={i} onClick={() => setClosedDay(active ? null : i)} style={{ padding: '8px 14px', borderRadius: 2, cursor: 'pointer', fontFamily: zen, fontSize: 13, border: `1px solid ${active ? goldBorder : border}`, background: active ? goldDim : 'transparent', color: active ? gold : muted }}>
                      {day}曜
                    </button>
                  )
                })}
                <button onClick={() => setClosedDay(null)} style={{ padding: '8px 14px', borderRadius: 2, cursor: 'pointer', fontFamily: zen, fontSize: 13, border: `1px solid ${closedDay === null ? goldBorder : border}`, background: closedDay === null ? goldDim : 'transparent', color: closedDay === null ? gold : muted }}>
                  なし
                </button>
              </div>
            </div>
          </SettingGroup>

          <button
            onClick={save} disabled={saving}
            style={{ width: '100%', padding: 14, background: saved ? greenDim : saving ? 'rgba(200,168,130,0.4)' : gold, border: saved ? '1px solid rgba(109,186,142,0.3)' : 'none', borderRadius: 2, fontFamily: zen, fontSize: 13, color: saved ? green : '#1a1816', cursor: saving ? 'default' : 'pointer' }}
          >
            {saving ? '保存中...' : saved ? '保存しました ✓' : '保存する'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── メインページ ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const claims   = getClaims()
  const navigate = useNavigate()
  const [sub,          setSub]          = useState<SubPage>(null)
  const [dealers,      setDealers]      = useState<Dealer[]>([])
  const [addOpen,      setAddOpen]      = useState(false)
  const [notif,        setNotif]        = useState({ stock: true, order: true, daily: false })
  const [hours,        setHours]        = useState<BusinessHours | null>(null)
  const [staffList,    setStaffList]    = useState<Staff[]>([])
  const [storeList,    setStoreList]    = useState<Store[]>([])
  const [myStaff,      setMyStaff]      = useState<Staff | null>(null)
  const [showInvite,   setShowInvite]   = useState(false)

  function loadDealers() {
    apiFetch<Dealer[]>('/api/v1/dealers')
      .then(d => setDealers(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  useEffect(() => {
    loadDealers()
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
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // サブページ
  if (sub === 'profile') {
    return (
      <AppLayout>
        <div style={{ padding: '14px 20px 80px' }}>
          <ProfileSettings onBack={() => setSub(null)} />
        </div>
      </AppLayout>
    )
  }
  if (sub === 'hours') {
    return (
      <AppLayout>
        <div style={{ padding: '14px 20px 80px' }}>
          <HoursSettings onBack={() => setSub(null)} />
        </div>
      </AppLayout>
    )
  }

  const hoursLabel  = hours ? `${hours.open_time} 〜 ${hours.close_time}` : '—'
  const closedLabel = hours?.closed_weekday != null ? `毎週${WEEKDAYS[hours.closed_weekday]}曜日` : '設定なし'

  return (
    <>
    <AppLayout>
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 400, color: txt, fontFamily: zen }}>設定</div>
      </div>

      <div style={{ padding: '14px 20px 80px' }}>

        {/* サロンカード */}
        <SalonCard salonName={claims?.salon_name ?? '—'} />

        {/* スタッフ管理 */}
        <GroupLabel>スタッフ管理</GroupLabel>
        <SettingGroup>
          {staffList.map(s => {
            const storeName = storeList.find(st => st.id === s.store_id)?.name ?? '—'
            const av = s.avatar_initials ?? s.name.slice(0, 1)
            return (
              <div key={s.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: goldDim, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: josefin, fontWeight: 100, fontSize: 11, color: gold, flexShrink: 0 }}>
                  {av}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 400, color: txt, fontFamily: zen, marginBottom: 2 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>{storeName} · {ROLE_LABEL[s.role]}</div>
                </div>
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 1, background: greenDim, color: green, border: '1px solid rgba(109,186,142,0.3)' }}>
                  有効
                </div>
              </div>
            )
          })}
          <div onClick={() => setShowInvite(true)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="7" y1="2" x2="7" y2="12" stroke={gold} strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="2" y1="7" x2="12" y2="7" stroke={gold} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize: 13, color: gold, fontFamily: zen }}>スタッフを招待する</div>
          </div>
        </SettingGroup>

        {/* POS連携 */}
        <GroupLabel>POS連携</GroupLabel>
        <SettingGroup>
          <SettingRow
            icon={<PosCardIcon color={green} />} iconBg="green"
            label="スマレジ" value="Store ID: 00123 · 接続済み"
            badge={<SBadge type="connected" />}
            onClick={() => {}}
          />
          <SettingRow
            icon={<PosCardIcon color="rgba(232,228,220,0.3)" />} iconBg="gray"
            label="Square" value="未接続"
            badge={<SBadge type="warning" />}
            onClick={() => {}}
            last
          />
        </SettingGroup>

        {/* ディーラー登録 */}
        <GroupLabel>ディーラー登録</GroupLabel>
        <SettingGroup>
          {dealers.map((d, i) => (
            <div key={d.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${border}` }}>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, color: muted, minWidth: 16, textAlign: 'center' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 400, color: txt, fontFamily: zen, marginBottom: 2 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>
                  {d.contact_method === 'LINE' ? 'LINE' : 'メール'} · {d.contact_info}
                </div>
              </div>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 1, background: greenDim, color: green, border: '1px solid rgba(109,186,142,0.3)' }}>
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
              <div style={{ fontSize: 13, color: gold, fontFamily: zen }}>ディーラーを追加</div>
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
            icon={<CircleNotifIcon color={purple} />} iconBg="purple"
            label="発注完了通知"
            action={<Toggle on={notif.order} onToggle={() => setNotif(n => ({ ...n, order: !n.order }))} />}
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
            label="営業時間" value={hoursLabel}
            onClick={() => setSub('hours')}
          />
          <SettingRow
            icon={<CalIcon color={gold} />} iconBg="gold"
            label="定休日" value={closedLabel}
            onClick={() => setSub('hours')}
          />
          <SettingRow
            icon={<CalPlusIcon color={gold} />} iconBg="gold"
            label="臨時休業日の追加" value="年末年始・GW等を登録"
            onClick={() => {}}
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
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.22em', color: txt, opacity: 0.3 }}>CYGNUS </span>
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.22em', color: gold, opacity: 0.3 }}>LOOP</span>
          </div>
          <div style={{ fontSize: 10, color: muted, opacity: 0.4, marginTop: 6 }}>Version 1.0.0</div>
        </div>

      </div>
    </AppLayout>

    {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </>
  )
}
