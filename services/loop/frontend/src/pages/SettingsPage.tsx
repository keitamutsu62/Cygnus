import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { apiFetch, api } from '../lib/api'
import { getClaims, logout } from '../lib/auth'
import type { Staff, Store, Menu } from '../types'
import { canManageStaff, ROLE_LABEL } from '../types'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const muted   = 'rgba(232,228,220,0.55)'
const border  = 'rgba(232,228,220,0.08)'
const gold    = '#c8a882'
const surface = '#211f1d'

// ─── 共通コンポーネント ────────────────────────────────────────────────────

function SettingRow({
  label, sub, chevron = true, danger = false, onClick,
}: {
  label: string; sub?: string; chevron?: boolean; danger?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '15px 0',
        background: 'none',
        border: 'none',
        borderBottom: `1px solid ${border}`,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: danger ? '#e07060' : '#e8e4dc', fontFamily: zen }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginTop: 2 }}>{sub}</div>}
      </div>
      {chevron && onClick && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <polyline points="6,3 11,8 6,13" stroke={muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 10, color: muted, fontFamily: josefin, letterSpacing: '0.18em', padding: '20px 0 8px' }}>
      {title}
    </div>
  )
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, display: 'flex' }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <polyline points="13,4 7,10 13,16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={{ fontSize: 17, color: '#e8e4dc', fontFamily: zen }}>{title}</div>
    </div>
  )
}

function Btn({
  label, onClick, variant = 'default',
}: {
  label: string; onClick: () => void; variant?: 'default' | 'danger' | 'ghost'
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: gold, color: '#1a1816', border: 'none' },
    danger:  { background: 'transparent', color: '#e07060', border: '1px solid #e07060' },
    ghost:   { background: 'transparent', color: muted, border: `1px solid ${border}` },
  }
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '13px 0',
        borderRadius: 2,
        fontSize: 13,
        fontFamily: zen,
        cursor: 'pointer',
        ...styles[variant],
      }}
    >
      {label}
    </button>
  )
}

// ─── スタッフ管理 ──────────────────────────────────────────────────────────

function StaffSettings({ onBack }: { onBack: () => void }) {
  const claims  = getClaims()
  const isAdmin = canManageStaff(claims?.role ?? 'staff')
  const [staffs, setStaffs] = useState<Staff[]>([])

  useEffect(() => {
    apiFetch<Staff[]>('/api/v1/staffs').then(setStaffs).catch(() => {})
  }, [])

  return (
    <div>
      <BackHeader title="スタッフ管理" onBack={onBack} />
      {isAdmin && (
        <Btn label="+ スタッフを招待" onClick={() => {}} />
      )}
      <div style={{ marginTop: 12 }}>
        {staffs.map(s => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 0',
              borderBottom: `1px solid ${border}`,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#2e2b28',
              border: `1px solid rgba(232,228,220,0.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, color: gold, fontFamily: josefin }}>
                {s.avatar_initials ?? s.name.slice(0, 2)}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#e8e4dc', fontFamily: zen }}>{s.name}</div>
              <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>{ROLE_LABEL[s.role]}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── メニュー管理 ──────────────────────────────────────────────────────────

function MenuSettings({ onBack }: { onBack: () => void }) {
  const [menus, setMenus] = useState<Menu[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newPrice, setNewPrice] = useState('')

  function load() {
    apiFetch<Menu[]>('/api/v1/menus').then(setMenus).catch(() => {})
  }
  useEffect(load, [])

  async function addMenu() {
    if (!newName || !newPrice) return
    await api('/api/v1/menus', {
      method: 'POST',
      body: JSON.stringify({ name: newName, price: Number(newPrice) }),
    })
    setNewName(''); setNewPrice(''); setAdding(false)
    load()
  }

  async function toggleActive(id: number, current: boolean) {
    await api(`/api/v1/menus/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !current }),
    })
    load()
  }

  return (
    <div>
      <BackHeader title="メニュー管理" onBack={onBack} />
      <Btn label="+ メニューを追加" onClick={() => setAdding(v => !v)} />

      {adding && (
        <div style={{ background: surface, borderRadius: 2, padding: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FieldInput placeholder="メニュー名" value={newName} onChange={setNewName} />
          <FieldInput placeholder="金額（円）" value={newPrice} onChange={setNewPrice} inputMode="numeric" />
          <Btn label="保存" onClick={addMenu} />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {menus.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: m.is_active ? '#e8e4dc' : muted, fontFamily: zen }}>{m.name}</div>
              <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>{m.price.toLocaleString('ja-JP')}円</div>
            </div>
            <button
              onClick={() => toggleActive(m.id, m.is_active)}
              style={{
                padding: '5px 12px',
                border: `1px solid ${m.is_active ? 'rgba(232,228,220,0.2)' : border}`,
                borderRadius: 2,
                background: 'transparent',
                color: m.is_active ? muted : 'rgba(232,228,220,0.25)',
                fontFamily: josefin,
                fontWeight: 100,
                fontSize: 10,
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              {m.is_active ? '有効' : '無効'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 店舗管理 ──────────────────────────────────────────────────────────────

function StoreSettings({ onBack }: { onBack: () => void }) {
  const [stores, setStores] = useState<Store[]>([])
  useEffect(() => {
    apiFetch<Store[]>('/api/v1/stores').then(setStores).catch(() => {})
  }, [])

  return (
    <div>
      <BackHeader title="店舗管理" onBack={onBack} />
      {stores.map(s => (
        <SettingRow key={s.id} label={s.name} chevron={false} />
      ))}
    </div>
  )
}

// ─── プロフィール ──────────────────────────────────────────────────────────

function ProfileSettings({ onBack }: { onBack: () => void }) {
  const claims   = getClaims()
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <BackHeader title="プロフィール" onBack={onBack} />
      <div style={{ padding: '16px', background: surface, borderRadius: 2, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginBottom: 4 }}>ロール</div>
        <div style={{ fontSize: 15, color: '#e8e4dc', fontFamily: zen }}>
          {claims ? ROLE_LABEL[claims.role] : '—'}
        </div>
      </div>

      <SectionHeader title="アカウント" />
      <SettingRow label="ログアウト" onClick={handleLogout} chevron={false} />

      <SectionHeader title="危険な操作" />
      {!showDeleteConfirm ? (
        <SettingRow label="アカウントを削除する" danger onClick={() => setShowDeleteConfirm(true)} />
      ) : (
        <div style={{ background: '#2a1f1f', border: '1px solid rgba(224,112,96,0.25)', borderRadius: 2, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#e07060', fontFamily: zen, marginBottom: 12 }}>
            削除すると元に戻せません。本当に削除しますか？
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn label="キャンセル" onClick={() => setShowDeleteConfirm(false)} variant="ghost" />
            <Btn label="削除する" onClick={() => {}} variant="danger" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 共通入力 ──────────────────────────────────────────────────────────────

function FieldInput({
  placeholder, value, onChange, inputMode,
}: {
  placeholder: string; value: string; onChange: (v: string) => void; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <input
      type="text"
      inputMode={inputMode}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        background: 'rgba(232,228,220,0.04)',
        border: `1px solid rgba(232,228,220,0.12)`,
        borderRadius: 2,
        padding: '10px 12px',
        fontSize: 14,
        color: '#e8e4dc',
        fontFamily: zen,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  )
}

// ─── メインページ ──────────────────────────────────────────────────────────

type SubPage = 'staff' | 'menus' | 'stores' | 'profile' | null

export default function SettingsPage() {
  const [sub, setSub] = useState<SubPage>(null)

  function back() { setSub(null) }

  return (
    <AppLayout>
      <div style={{ padding: '14px 20px 40px' }}>
        {sub === null && (
          <>
            <div style={{ fontSize: 19, fontWeight: 400, color: '#e8e4dc', fontFamily: zen, marginBottom: 4 }}>設定</div>

            <SectionHeader title="スタッフ・メニュー" />
            <SettingRow label="スタッフ管理"   sub="招待・役職・ステータス管理" onClick={() => setSub('staff')} />
            <SettingRow label="メニュー管理"   sub="施術メニューの追加・編集・無効化" onClick={() => setSub('menus')} />
            <SettingRow label="店舗管理"       sub="店舗情報・営業時間" onClick={() => setSub('stores')} />

            <SectionHeader title="アカウント" />
            <SettingRow label="プロフィール" sub="ロール・ログアウト・アカウント削除" onClick={() => setSub('profile')} />
          </>
        )}

        {sub === 'staff'   && <StaffSettings   onBack={back} />}
        {sub === 'menus'   && <MenuSettings    onBack={back} />}
        {sub === 'stores'  && <StoreSettings   onBack={back} />}
        {sub === 'profile' && <ProfileSettings onBack={back} />}
      </div>
    </AppLayout>
  )
}
