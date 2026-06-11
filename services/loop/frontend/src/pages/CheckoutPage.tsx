import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClaims } from '../lib/auth'
import { apiFetch, api } from '../lib/api'
import type { Staff, Store, Menu } from '../types'
import BottomSheet from '../components/BottomSheet'
import { Toast, useToast } from '../components/Toast'
import { ROLE_LABEL } from '../types'

const gold = 'var(--accent)'
const goldDim = 'var(--accent-dim)'
const goldBorder = 'var(--accent-border)'
const bg = 'var(--bg)'
const surface = 'var(--surface)'
const surface2 = 'var(--surface-2)'
const txt = 'var(--text)'
const muted = 'var(--text-muted)'
const border = 'var(--border)'
const green = '#6dba8e'
const josefin = "'Josefin Sans', sans-serif"
const zen = "'Zen Kaku Gothic New', sans-serif"

// iOS zoom prevention: inputs must be font-size >= 16px
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: 2,
  padding: '10px 12px',
  color: txt,
  fontSize: 16,
  fontFamily: zen,
  boxSizing: 'border-box',
}
const inputStylePrefixed: React.CSSProperties = { ...inputStyle, paddingLeft: 28 }

type Source = 'walkin' | 'reserve' | 'hotpepper' | 'line' | 'other'
type Payment = 'cash' | 'card' | 'ic'

interface LineItem {
  menuId?: number
  name: string
  price: number
  note?: string
}

// ─── メニューピッカー（施術 / 物販 共通） ──────────────────────────────
function MenuPickerModal({
  title,
  items,
  onSelect,
  onClose,
}: {
  title: string
  items: Menu[]
  onSelect: (item: LineItem) => void
  onClose: () => void
}) {
  const active = items.filter(m => m.is_active)
  return (
    <BottomSheet onClose={onClose} maxHeight="70vh">
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: gold, marginBottom: 16 }}>{title}</div>
      {active.length === 0 && (
        <div style={{ fontSize: 14, color: muted, fontFamily: zen, padding: '20px 0', textAlign: 'center' }}>登録データがありません</div>
      )}
      {active.map(m => (
        <div
          key={m.id}
          onClick={() => { onSelect({ menuId: m.id, name: m.name, price: m.price }); onClose() }}
          style={{ padding: '14px 0', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 15, color: txt, fontFamily: zen }}>{m.name}</div>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, color: gold }}>¥{m.price.toLocaleString()}</div>
        </div>
      ))}
      <button onClick={onClose} style={{ width: '100%', padding: '14px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 2, color: muted, fontSize: 15, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: josefin, marginTop: 16 }}>キャンセル</button>
    </BottomSheet>
  )
}

// ─── メニュー行編集モーダル ────────────────────────────────────────────
function ItemEditModal({
  item,
  type,
  onSave,
  onDelete,
  onClose,
}: {
  item: LineItem
  type: 'menu' | 'retail'
  onSave: (updated: LineItem) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(String(item.price))
  const [note, setNote] = useState(item.note ?? '')
  const label = type === 'menu' ? '施術' : '物販'

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: gold }}>メニューを編集</div>
        <div style={{ fontFamily: josefin, fontSize: 11, letterSpacing: '0.12em', color: muted, padding: '3px 8px', border: `1px solid ${border}`, borderRadius: 2 }}>{label}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: '0.1em', color: muted, fontFamily: josefin, marginBottom: 6 }}>メニュー名</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="例：カット + カラー" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 13, letterSpacing: '0.1em', color: muted, fontFamily: josefin, marginBottom: 6 }}>金額（税込）</div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: 15 }}>¥</span>
            <input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="0" style={inputStylePrefixed} />
          </div>
        </div>
        {type === 'menu' && (
          <div>
            <div style={{ fontSize: 13, letterSpacing: '0.1em', color: muted, fontFamily: josefin, marginBottom: 6 }}>備考</div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="例：○○クーポン適用など" style={inputStyle} />
          </div>
        )}
      </div>
      <button onClick={() => { onSave({ ...item, name, price: Number(price) || 0, note: note || undefined }); onClose() }}
        style={{ width: '100%', marginTop: 20, padding: '14px', background: gold, border: 'none', borderRadius: 2, color: bg, fontSize: 15, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: josefin }}>
        保存する
      </button>
      <button onClick={onClose}
        style={{ width: '100%', marginTop: 8, padding: '14px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 2, color: muted, fontSize: 15, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: josefin }}>
        キャンセル
      </button>
      <button onClick={() => { onDelete(); onClose() }}
        style={{ width: '100%', marginTop: 4, padding: '12px', background: 'transparent', border: 'none', color: 'rgba(255,90,90,0.7)', fontSize: 14, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: josefin }}>
        このメニューを削除
      </button>
    </BottomSheet>
  )
}

// ─── スタッフピッカーモーダル ──────────────────────────────────────────
function StaffPickerModal({
  staffList,
  storeList,
  selectedId,
  onSelect,
  onClose,
}: {
  staffList: Staff[]
  storeList: Store[]
  selectedId: number
  onSelect: (id: number) => void
  onClose: () => void
}) {
  return (
    <BottomSheet onClose={onClose} maxHeight="60vh">
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: gold, marginBottom: 16 }}>担当スタッフを選択</div>
      {staffList.filter(s => s.is_active).map(s => {
        const storeName = storeList.find(st => st.id === s.store_id)?.name ?? '—'
        const av = s.avatar_initials ?? s.name.slice(0, 1)
        const isSelected = s.id === selectedId
        return (
          <div key={s.id} onClick={() => { onSelect(s.id); onClose() }}
            style={{ padding: '12px 0', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: isSelected ? gold : goldDim, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: josefin, fontWeight: 100, fontSize: 13, color: isSelected ? bg : gold, flexShrink: 0 }}>{av}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: isSelected ? gold : txt, fontFamily: zen }}>{s.name}</div>
              <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>{storeName} · {ROLE_LABEL[s.role]}</div>
            </div>
            {isSelected && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        )
      })}
    </BottomSheet>
  )
}

// ─── 指名料編集モーダル ────────────────────────────────────────────────
function ShimeiEditModal({ current, onSave, onClose }: { current: number; onSave: (v: number) => void; onClose: () => void }) {
  const [val, setVal] = useState(String(current))
  return (
    <BottomSheet onClose={onClose}>
      <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: gold, marginBottom: 20 }}>指名料を設定</div>
      <div>
        <div style={{ fontSize: 13, letterSpacing: '0.1em', color: muted, fontFamily: josefin, marginBottom: 6 }}>指名料（税込）</div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: 15 }}>¥</span>
          <input value={val} onChange={e => setVal(e.target.value)} type="number" placeholder="0" style={inputStylePrefixed} />
        </div>
        <div style={{ fontSize: 14, color: muted, marginTop: 10, lineHeight: 1.6, fontFamily: zen }}>設定した金額は「指名」を選択すると自動加算されます</div>
      </div>
      <button onClick={() => { onSave(Number(val) || 0); onClose() }}
        style={{ width: '100%', marginTop: 20, padding: '14px', background: gold, border: 'none', borderRadius: 2, color: bg, fontSize: 15, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: josefin }}>
        保存する
      </button>
      <button onClick={onClose}
        style={{ width: '100%', marginTop: 8, padding: '14px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 2, color: muted, fontSize: 15, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: josefin }}>
        キャンセル
      </button>
    </BottomSheet>
  )
}

// ─── メインページ ──────────────────────────────────────────────────────
export default function CheckoutPage() {
  const navigate = useNavigate()
  const claims = getClaims()

  const [staffList, setStaffList] = useState<Staff[]>([])
  const [storeList, setStoreList] = useState<Store[]>([])
  const [treatmentMenus, setTreatmentMenus] = useState<Menu[]>([])
  const [retailMenus, setRetailMenus] = useState<Menu[]>([])

  const [selectedStaffId, setSelectedStaffId] = useState<number>(claims?.staff_id ?? 0)
  const [shimei, setShimei] = useState(false)
  const [shimeiRyo, setShimeiRyo] = useState(1100)
  const [source, setSource] = useState<Source>('walkin')
  const [menuItems, setMenuItems] = useState<LineItem[]>([])
  const [retailItems, setRetailItems] = useState<LineItem[]>([])
  const [payment, setPayment] = useState<Payment>('cash')

  const [showStaffPicker, setShowStaffPicker] = useState(false)
  const [showMenuPicker, setShowMenuPicker] = useState(false)
  const [showRetailPicker, setShowRetailPicker] = useState(false)
  const [editItem, setEditItem] = useState<{ type: 'menu' | 'retail'; index: number } | null>(null)
  const [showShimeiEdit, setShowShimeiEdit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successAmount, setSuccessAmount] = useState(0)
  const [successSub, setSuccessSub] = useState('')
  const { msg: toastMsg, showError } = useToast()

  useEffect(() => {
    apiFetch<Staff[]>('/api/v1/staffs').then(list => setStaffList(Array.isArray(list) ? list : [])).catch(() => showError('スタッフ情報の読み込みに失敗しました'))
    apiFetch<Store[]>('/api/v1/stores').then(list => setStoreList(Array.isArray(list) ? list : [])).catch(() => showError('店舗情報の読み込みに失敗しました'))
    apiFetch<Menu[]>('/api/v1/menus?type=treatment').then(list => setTreatmentMenus(Array.isArray(list) ? list : [])).catch(() => showError('メニュー情報の読み込みに失敗しました'))
    apiFetch<Menu[]>('/api/v1/menus?type=retail').then(list => setRetailMenus(Array.isArray(list) ? list : [])).catch(() => {})
    apiFetch<{ shimei_charge: number }>('/api/v1/settings').then(d => { if (d?.shimei_charge !== undefined) setShimeiRyo(d.shimei_charge) }).catch(() => {})
  }, [])

  const selectedStaff = staffList.find(s => s.id === selectedStaffId)
  const storeName = storeList.find(st => st.id === (selectedStaff?.store_id ?? claims?.store_id))?.name ?? ''

  // スタッフ個別設定があればそちらを優先、なければサロンデフォルトを使用
  const effectiveShimeiRyo = selectedStaff?.shimei_charge ?? shimeiRyo

  const subtotal = menuItems.reduce((s, i) => s + i.price, 0) + retailItems.reduce((s, i) => s + i.price, 0)
  const total = subtotal + (shimei ? effectiveShimeiRyo : 0)

  const SOURCES: { id: Source; label: string }[] = [
    { id: 'walkin', label: 'フリー' },
    { id: 'reserve', label: 'RESERVE' },
    { id: 'hotpepper', label: 'ホットペッパー' },
    { id: 'line', label: 'LINE' },
    { id: 'other', label: 'その他' },
  ]

  async function submit() {
    if (menuItems.length === 0 && retailItems.length === 0) {
      alert('施術または物販を1件以上追加してください')
      return
    }
    setSubmitting(true)
    const now = new Date().toISOString()
    const storeId = selectedStaff?.store_id ?? claims?.store_id ?? null

    try {
      const shimeiEntry = shimei && effectiveShimeiRyo > 0
        ? [api('/api/v1/treatments', {
            method: 'POST',
            body: JSON.stringify({
              staff_id: selectedStaffId,
              store_id: storeId,
              menu_id: null,
              menu_name: '指名料',
              price: effectiveShimeiRyo,
              source,
              is_shimei: true,
              count_as_client: false,
              performed_at: now,
              notes: null,
            }),
          }).then(r => { if (!r.ok) throw new Error() })]
        : []
      await Promise.all([
        ...menuItems.map((item, index) =>
          api('/api/v1/treatments', {
            method: 'POST',
            body: JSON.stringify({
              staff_id: selectedStaffId,
              store_id: storeId,
              menu_id: item.menuId ?? null,
              menu_name: item.name,
              price: item.price,
              source,
              is_shimei: shimei,
              count_as_client: index === 0,
              performed_at: now,
              notes: item.note ?? null,
            }),
          }).then(r => { if (!r.ok) throw new Error() }),
        ),
        ...shimeiEntry,
        ...retailItems.map(item =>
          api('/api/v1/retail-sales', {
            method: 'POST',
            body: JSON.stringify({
              staff_id: selectedStaffId,
              store_id: storeId ?? 0,
              product_name: item.name,
              price: item.price,
              sold_at: now,
            }),
          }).then(r => { if (!r.ok) throw new Error() }),
        ),
      ])
      setSuccessAmount(total)
      setSuccessSub([
        selectedStaff?.name ?? '',
        menuItems.length > 0 ? `施術 ${menuItems.length}件` : '',
        retailItems.length > 0 ? `物販 ${retailItems.length}件` : '',
      ].filter(Boolean).join(' · '))
      setSuccess(true)
    } catch {
      alert('会計の送信に失敗しました。もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, fontFamily: josefin, marginBottom: 10 }}>{children}</div>
  )

  const Section = ({ children }: { children: React.ReactNode }) => (
    <div style={{ padding: '20px 20px 0' }}>{children}</div>
  )

  const ToggleBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} style={{
      flex: 1, padding: '11px 0', background: active ? goldDim : 'transparent',
      border: `1px solid ${active ? goldBorder : border}`, borderRadius: 2,
      color: active ? gold : muted, fontSize: 15, letterSpacing: '0.08em',
      cursor: 'pointer', fontFamily: josefin, fontWeight: active ? 400 : 100,
    }}>{children}</button>
  )

  const AddBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button onClick={onClick} style={{
      width: '100%', padding: '11px', background: 'transparent',
      border: `1px dashed ${border}`, borderRadius: 2, color: muted, fontSize: 14, letterSpacing: '0.08em',
      cursor: 'pointer', fontFamily: josefin, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      {label}
    </button>
  )

  if (success) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(109,186,142,0.12)', border: '1px solid rgba(109,186,142,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <polyline points="6,14 11,20 22,9" stroke={green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, letterSpacing: '0.2em', color: txt }}>会計完了</div>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 32, color: gold }}>¥{successAmount.toLocaleString()}</div>
        <div style={{ fontSize: 14, color: muted, fontFamily: zen }}>{successSub}</div>
        <button onClick={() => navigate(-1)} style={{
          marginTop: 24, padding: '14px 48px', background: goldDim, border: `1px solid ${goldBorder}`,
          borderRadius: 2, color: gold, fontSize: 14, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: josefin,
        }}>閉じる</button>
      </div>
    )
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: bg, display: 'flex', flexDirection: 'column' }}>
        {/* トップバー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><polyline points="11,4 6,9 11,14" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 15, letterSpacing: '0.2em', color: txt }}>会計入力</div>
          <div style={{ width: 18 }} />
        </div>

        {/* スクロールエリア */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 100 } as React.CSSProperties}>

          {/* 店舗コンテキスト */}
          {storeName && (
            <div style={{ margin: '12px 20px 0', padding: '10px 14px', background: surface, border: `1px solid ${border}`, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: green, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>{storeName} · 施術 {treatmentMenus.filter(m => m.is_active).length}件 / 物販 {retailMenus.filter(m => m.is_active).length}件</div>
            </div>
          )}

          {/* 担当スタッフ */}
          <Section>
            <SectionTitle>担当スタッフ</SectionTitle>
            <div onClick={() => setShowStaffPicker(true)} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: goldDim, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: josefin, fontWeight: 100, fontSize: 13, color: gold, flexShrink: 0 }}>
                  {selectedStaff ? (selectedStaff.avatar_initials ?? selectedStaff.name.slice(0, 1)) : '?'}
                </div>
                <div>
                  <div style={{ fontSize: 15, color: txt, fontFamily: zen }}>{selectedStaff?.name ?? '選択してください'}</div>
                  <div style={{ fontSize: 13, color: muted, fontFamily: zen }}>{storeName}{selectedStaff ? ` · ${ROLE_LABEL[selectedStaff.role]}` : ''}</div>
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="4,2 8,6 4,10" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </Section>

          {/* 指名区分 */}
          <Section>
            <SectionTitle>指名区分</SectionTitle>
            <div style={{ display: 'flex', gap: 8 }}>
              <ToggleBtn active={!shimei} onClick={() => setShimei(false)}>フリー</ToggleBtn>
              <ToggleBtn active={shimei} onClick={() => setShimei(true)}>指名</ToggleBtn>
            </div>
            {shimei && (
              <div onClick={() => setShowShimeiEdit(true)} style={{ marginTop: 8, padding: '12px 16px', background: surface, border: `1px solid ${border}`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ fontSize: 15, color: txt, fontFamily: zen }}>指名料</div>
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, color: gold }}>¥{effectiveShimeiRyo.toLocaleString()}</div>
              </div>
            )}
          </Section>

          {/* 来店経路 */}
          <Section>
            <SectionTitle>来店経路</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {SOURCES.map(s => (
                <ToggleBtn key={s.id} active={source === s.id} onClick={() => setSource(s.id)}>{s.label}</ToggleBtn>
              ))}
            </div>
          </Section>

          {/* 施術メニュー */}
          <Section>
            <SectionTitle>施術メニュー</SectionTitle>
            {menuItems.map((item, i) => (
              <div key={i} onClick={() => setEditItem({ type: 'menu', index: i })}
                style={{ padding: '12px 0', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 15, color: txt, fontFamily: zen }}>{item.name}</div>
                  {item.note && <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginTop: 2 }}>{item.note}</div>}
                </div>
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, color: gold }}>¥{item.price.toLocaleString()}</div>
              </div>
            ))}
            <div style={{ marginTop: menuItems.length > 0 ? 8 : 0 }}>
              <AddBtn onClick={() => setShowMenuPicker(true)} label="メニューを追加" />
            </div>
          </Section>

          {/* 物販 */}
          <Section>
            <SectionTitle>物販</SectionTitle>
            {retailItems.map((item, i) => (
              <div key={i} onClick={() => setEditItem({ type: 'retail', index: i })}
                style={{ padding: '12px 0', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ fontSize: 15, color: txt, fontFamily: zen }}>{item.name}</div>
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 15, color: gold }}>¥{item.price.toLocaleString()}</div>
              </div>
            ))}
            <div style={{ marginTop: retailItems.length > 0 ? 8 : 0 }}>
              <AddBtn onClick={() => setShowRetailPicker(true)} label="物販を追加" />
            </div>
          </Section>

          {/* 合計金額 */}
          <div style={{ margin: '20px 20px 0', padding: '16px 20px', background: surface2, border: `1px solid ${goldBorder}`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: '0.15em', color: muted, fontFamily: josefin }}>合計金額</div>
              {shimei && effectiveShimeiRyo > 0 && (
                <div style={{ fontSize: 13, color: muted, fontFamily: zen, marginTop: 3 }}>指名料 ¥{effectiveShimeiRyo.toLocaleString()} 含む</div>
              )}
            </div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 28, color: gold }}>
              <span style={{ fontSize: 15 }}>¥</span>{total.toLocaleString()}
            </div>
          </div>

          {/* 支払方法 */}
          <Section>
            <SectionTitle>支払方法</SectionTitle>
            <div style={{ display: 'flex', gap: 8 }}>
              <ToggleBtn active={payment === 'cash'} onClick={() => setPayment('cash')}>現金</ToggleBtn>
              <ToggleBtn active={payment === 'card'} onClick={() => setPayment('card')}>カード</ToggleBtn>
              <ToggleBtn active={payment === 'ic'} onClick={() => setPayment('ic')}>電子マネー</ToggleBtn>
            </div>
          </Section>

          {/* 会計完了ボタン */}
          <div style={{ padding: '24px 20px 0' }}>
            <button onClick={submit} disabled={submitting} style={{
              width: '100%', padding: '16px', background: gold, border: 'none', borderRadius: 2,
              color: bg, fontSize: 15, letterSpacing: '0.12em', cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: josefin, opacity: submitting ? 0.6 : 1,
            }}>
              {submitting ? '送信中...' : '会計完了'}
            </button>
          </div>
        </div>
      </div>

      {/* モーダル類 */}
      {showStaffPicker && (
        <StaffPickerModal
          staffList={staffList}
          storeList={storeList}
          selectedId={selectedStaffId}
          onSelect={setSelectedStaffId}
          onClose={() => setShowStaffPicker(false)}
        />
      )}
      {showMenuPicker && (
        <MenuPickerModal
          title="メニューを選択"
          items={treatmentMenus}
          onSelect={item => setMenuItems(prev => [...prev, item])}
          onClose={() => setShowMenuPicker(false)}
        />
      )}
      {showRetailPicker && (
        <MenuPickerModal
          title="物販を選択"
          items={retailMenus}
          onSelect={item => setRetailItems(prev => [...prev, item])}
          onClose={() => setShowRetailPicker(false)}
        />
      )}
      {editItem && (
        <ItemEditModal
          type={editItem.type}
          item={editItem.type === 'menu' ? menuItems[editItem.index] : retailItems[editItem.index]}
          onSave={updated => {
            if (editItem.type === 'menu') setMenuItems(prev => prev.map((x, i) => i === editItem.index ? updated : x))
            else setRetailItems(prev => prev.map((x, i) => i === editItem.index ? updated : x))
          }}
          onDelete={() => {
            if (editItem.type === 'menu') setMenuItems(prev => prev.filter((_, i) => i !== editItem.index))
            else setRetailItems(prev => prev.filter((_, i) => i !== editItem.index))
          }}
          onClose={() => setEditItem(null)}
        />
      )}
      {showShimeiEdit && (
        <ShimeiEditModal
          current={effectiveShimeiRyo}
          onSave={setShimeiRyo}
          onClose={() => setShowShimeiEdit(false)}
        />
      )}
    <Toast msg={toastMsg} />
    </>
  )
}
