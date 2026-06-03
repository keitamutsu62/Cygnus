import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { api, apiFetch } from '../lib/api'
import type { Menu } from '../types'

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
const alert      = '#e07060'
const alertDim   = 'rgba(224,112,96,0.1)'

type Tab = 'treatment' | 'retail' | 'shimei'

// ─── 編集/追加モーダル ────────────────────────────────────────────────────────
function MenuEditModal({
  mode,
  tab,
  menu,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit'
  tab: 'treatment' | 'retail'
  menu?: Menu
  onClose: () => void
  onSaved: () => void
}) {
  const [name,     setName]     = useState(menu?.name ?? '')
  const [price,    setPrice]    = useState(menu?.price?.toString() ?? '')
  const [duration, setDuration] = useState(menu?.duration_minutes?.toString() ?? '')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(232,228,220,0.04)',
    border: `1px solid rgba(232,228,220,0.12)`,
    borderRadius: 2, padding: '10px 12px',
    fontSize: 16, color: txt, fontFamily: zen, outline: 'none',
  }

  async function save() {
    if (!name.trim()) return
    const priceNum = parseInt(price, 10)
    if (isNaN(priceNum) || priceNum < 0) return
    setSaving(true)
    try {
      let res: Response
      if (mode === 'add') {
        const body: Record<string, unknown> = {
          name: name.trim(),
          menu_type: tab,
          price: priceNum,
        }
        if (tab === 'treatment' && duration.trim()) {
          const d = parseInt(duration, 10)
          if (!isNaN(d)) body.duration = d
        }
        res = await api('/api/v1/menus', { method: 'POST', body: JSON.stringify(body) })
      } else {
        const body: Record<string, unknown> = {
          name: name.trim(),
          price: priceNum,
        }
        if (tab === 'treatment' && duration.trim()) {
          const d = parseInt(duration, 10)
          if (!isNaN(d)) body.duration = d
        }
        res = await api(`/api/v1/menus/${menu!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      }
      if (!res.ok) throw new Error()
      onSaved()
    } catch {
      window.alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!menu) return
    if (!window.confirm(`「${menu.name}」を削除しますか？`)) return
    setDeleting(true)
    try {
      const res = await api(`/api/v1/menus/${menu.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onSaved()
    } catch {
      window.alert('削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  const typeLabel = tab === 'treatment' ? '施術' : '物販'
  const canSave   = name.trim() && price.trim() && !isNaN(parseInt(price, 10))

  const overlayRef  = useRef<HTMLDivElement>(null)
  const panelRef    = useRef<HTMLDivElement>(null)
  const onCloseRef  = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const overlay = overlayRef.current
    const panel   = panelRef.current
    if (!overlay || !panel) return
    const stop = (e: TouchEvent) => { if (!panel.contains(e.target as Node)) e.preventDefault() }
    overlay.addEventListener('touchmove', stop, { passive: false })
    return () => overlay.removeEventListener('touchmove', stop)
  }, [])

  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    let sy = 0
    const onStart = (e: TouchEvent) => { sy = e.touches[0].clientY }
    const onMove  = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - sy
      if (dy > 0) { e.preventDefault(); el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)` }
    }
    const onEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - sy
      if (dy > 80) { onCloseRef.current(); return }
      el.style.transition = 'transform 0.2s'; el.style.transform = 'translateY(0)'
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

  return (
    <div
      ref={overlayRef}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        style={{ width: '100%', maxWidth: 480, background: '#1a1816', borderTop: `1px solid ${goldBorder}`, borderRadius: '16px 16px 0 0', padding: '20px 20px 40px', transition: 'transform 0.2s', willChange: 'transform' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 3, background: 'rgba(232,228,220,0.15)', borderRadius: 2, margin: '0 auto 20px' }}/>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, color: txt }}>
              {mode === 'add' ? `${typeLabel}を追加` : `${typeLabel}を編集`}
            </div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 8, letterSpacing: '0.12em', padding: '2px 8px', borderRadius: 1, border: `1px solid ${goldBorder}`, color: gold }}>
              {typeLabel}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 6 }}>
              {tab === 'treatment' ? 'メニュー名' : '商品名'}
            </div>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder={tab === 'treatment' ? 'カット・カラー など' : '商品名を入力'}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 6 }}>金額（税込）</div>
            <input
              type="number" inputMode="numeric" value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>
          {tab === 'treatment' && (
            <div>
              <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 6 }}>施術時間（分）</div>
              <input
                type="number" inputMode="numeric" value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="60"
                style={inputStyle}
              />
            </div>
          )}
        </div>

        <button
          onClick={save}
          disabled={saving || !canSave}
          style={{ width: '100%', marginTop: 20, padding: 14, background: (!canSave || saving) ? 'rgba(200,168,130,0.4)' : gold, border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 13, color: '#1a1816', cursor: canSave && !saving ? 'pointer' : 'default' }}
        >
          {saving ? '保存中...' : '保存する'}
        </button>

        {mode === 'edit' && (
          <button
            onClick={del}
            disabled={deleting}
            style={{ width: '100%', marginTop: 8, padding: 12, background: 'transparent', border: `1px solid ${alert}`, borderRadius: 2, fontFamily: zen, fontSize: 12, color: alert, cursor: 'pointer' }}
          >
            {deleting ? '削除中...' : 'このメニューを削除する'}
          </button>
        )}

        <button
          onClick={onClose}
          style={{ width: '100%', marginTop: 8, padding: 12, background: 'transparent', border: 'none', fontFamily: zen, fontSize: 12, color: muted, cursor: 'pointer' }}
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}

// ─── 指名料編集モーダル ───────────────────────────────────────────────────────
function ShimeiEditModal({
  current,
  onClose,
  onSaved,
}: {
  current: number
  onClose: () => void
  onSaved: (v: number) => void
}) {
  const [price, setPrice] = useState(current.toString())
  const num = parseInt(price, 10)
  const ok  = !isNaN(num) && num >= 0

  const overlayRef2  = useRef<HTMLDivElement>(null)
  const panelRef2    = useRef<HTMLDivElement>(null)
  const onCloseRef2  = useRef(onClose)
  onCloseRef2.current = onClose

  useEffect(() => {
    const overlay = overlayRef2.current
    const panel   = panelRef2.current
    if (!overlay || !panel) return
    const stop = (e: TouchEvent) => { if (!panel.contains(e.target as Node)) e.preventDefault() }
    overlay.addEventListener('touchmove', stop, { passive: false })
    return () => overlay.removeEventListener('touchmove', stop)
  }, [])

  useEffect(() => {
    const el = panelRef2.current
    if (!el) return
    let sy = 0
    const onStart = (e: TouchEvent) => { sy = e.touches[0].clientY }
    const onMove  = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - sy
      if (dy > 0) { e.preventDefault(); el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)` }
    }
    const onEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - sy
      if (dy > 80) { onCloseRef2.current(); return }
      el.style.transition = 'transform 0.2s'; el.style.transform = 'translateY(0)'
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

  return (
    <div
      ref={overlayRef2}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        ref={panelRef2}
        style={{ width: '100%', maxWidth: 480, background: '#1a1816', borderTop: `1px solid ${goldBorder}`, borderRadius: '16px 16px 0 0', padding: '20px 20px 40px', transition: 'transform 0.2s', willChange: 'transform' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 3, background: 'rgba(232,228,220,0.15)', borderRadius: 2, margin: '0 auto 20px' }}/>
        <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, color: txt, marginBottom: 20 }}>指名料を変更</div>
        <div style={{ fontSize: 11, color: muted, fontFamily: zen, marginBottom: 6 }}>金額（税込）</div>
        <input
          type="number" inputMode="numeric" value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="1100"
          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(232,228,220,0.04)', border: `1px solid rgba(232,228,220,0.12)`, borderRadius: 2, padding: '10px 12px', fontSize: 16, color: txt, fontFamily: zen, outline: 'none' }}
        />
        <button
          onClick={() => ok && onSaved(num)}
          disabled={!ok}
          style={{ width: '100%', marginTop: 16, padding: 14, background: ok ? gold : 'rgba(200,168,130,0.4)', border: 'none', borderRadius: 2, fontFamily: zen, fontSize: 13, color: '#1a1816', cursor: ok ? 'pointer' : 'default' }}
        >
          保存する
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, padding: 12, background: 'transparent', border: 'none', fontFamily: zen, fontSize: 12, color: muted, cursor: 'pointer' }}>
          キャンセル
        </button>
      </div>
    </div>
  )
}

// ─── メインページ ─────────────────────────────────────────────────────────────
export default function MenusPage() {
  const navigate  = useNavigate()
  const [tab,          setTab]          = useState<Tab>('treatment')
  const [treatments,   setTreatments]   = useState<Menu[]>([])
  const [retails,      setRetails]      = useState<Menu[]>([])
  const [shimeiRyo,    setShimeiRyo]    = useState(1100)
  const [editMenu,     setEditMenu]     = useState<Menu | null>(null)
  const [addTab,       setAddTab]       = useState<'treatment' | 'retail' | null>(null)
  const [shimeiEdit,   setShimeiEdit]   = useState(false)
  const [loading,      setLoading]      = useState(true)

  function loadMenus() {
    return Promise.all([
      apiFetch<Menu[]>('/api/v1/menus?type=treatment'),
      apiFetch<Menu[]>('/api/v1/menus?type=retail'),
    ]).then(([t, r]) => {
      setTreatments(Array.isArray(t) ? t : [])
      setRetails(Array.isArray(r) ? r : [])
    }).catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      loadMenus(),
      apiFetch<{ shimei_charge: number }>('/api/v1/settings')
        .then(d => { if (d?.shimei_charge !== undefined) setShimeiRyo(d.shimei_charge) })
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const currentList = tab === 'treatment' ? treatments : retails

  return (
    <>
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ヘッダー + タブ（スクロールしない固定エリア） */}
      <div style={{ flexShrink: 0, background: '#1a1816' }}>
        {/* ヘッダー */}
        <div style={{ padding: '14px 20px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/settings')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <polyline points="13,4 7,10 13,16" stroke={txt} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 400, color: txt, fontFamily: zen }}>メニュー設定</div>
          </div>
        </div>

        {/* タブ */}
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8 }}>
          {(['treatment', 'retail', 'shimei'] as const).map(t => {
            const label = t === 'treatment' ? '施術メニュー' : t === 'retail' ? '物販' : '指名料'
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '9px 4px', textAlign: 'center',
                  fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.15em',
                  background: 'transparent',
                  border: `1px solid ${active ? goldBorder : border}`,
                  borderRadius: 2,
                  color: active ? gold : muted,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* スクロールコンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <div style={{ padding: '12px 20px 80px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ヒントバナー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: greenDim, border: '1px solid rgba(109,186,142,0.2)', borderRadius: 2, marginBottom: 16, fontSize: 11, color: green, fontFamily: zen }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="5" cy="5" r="4.5" stroke={green} strokeWidth="1"/>
            <line x1="5" y1="3.5" x2="5" y2="5.5" stroke={green} strokeWidth="1" strokeLinecap="round"/>
            <circle cx="5" cy="7" r="0.5" fill={green}/>
          </svg>
          ここで登録したメニューは会計入力に使用されます
        </div>

        {/* コンテンツ */}
        {loading ? (
          <div style={{ textAlign: 'center', color: muted, padding: 40, fontSize: 12, fontFamily: josefin }}>Loading...</div>
        ) : tab === 'shimei' ? (
          /* 指名料タブ */
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}` }}>
              <div>
                <div style={{ fontSize: 13, color: txt, fontFamily: zen, marginBottom: 3 }}>指名料</div>
                <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>会計時に「指名」選択で自動加算</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 20, color: gold }}>
                  ¥{shimeiRyo.toLocaleString()}
                </div>
                <button
                  onClick={() => setShimeiEdit(true)}
                  style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.1em', padding: '4px 10px', background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: 2, color: gold, cursor: 'pointer' }}
                >
                  編集
                </button>
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, color: muted, fontFamily: zen, lineHeight: 1.8 }}>
                指名料は店舗全体に適用される一律金額です。
              </div>
            </div>
          </div>
        ) : (
          /* 施術/物販タブ */
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 2, overflow: 'hidden' }}>
            {currentList.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: muted, fontSize: 12, fontFamily: zen }}>
                まだ{tab === 'treatment' ? 'メニュー' : '商品'}が登録されていません
              </div>
            )}
            {currentList.map((item, i) => (
              <div
                key={item.id}
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${border}` }}
              >
                <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, color: muted, minWidth: 20, textAlign: 'center' }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: txt, fontFamily: zen, marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: muted, fontFamily: zen }}>
                    ¥{item.price.toLocaleString()}
                    {item.duration_minutes ? ` · ${item.duration_minutes}分` : ''}
                  </div>
                </div>
                {!item.is_active && (
                  <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 8, letterSpacing: '0.12em', padding: '2px 8px', borderRadius: 1, background: alertDim, color: alert, border: `1px solid rgba(224,112,96,0.3)` }}>
                    無効
                  </div>
                )}
                <button
                  onClick={() => setEditMenu(item)}
                  style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.1em', padding: '4px 10px', background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: 2, color: gold, cursor: 'pointer', flexShrink: 0 }}
                >
                  編集
                </button>
              </div>
            ))}
            <div
              onClick={() => setAddTab(tab === 'treatment' ? 'treatment' : 'retail')}
              style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <line x1="7" y1="2" x2="7" y2="12" stroke={gold} strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="7" x2="12" y2="7" stroke={gold} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 13, color: gold, fontFamily: zen }}>
                {tab === 'treatment' ? 'メニューを追加' : '商品を追加'}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      </div>
    </AppLayout>

    {/* 追加モーダル */}
    {addTab && (
      <MenuEditModal
        mode="add"
        tab={addTab}
        onClose={() => setAddTab(null)}
        onSaved={() => { setAddTab(null); loadMenus() }}
      />
    )}

    {/* 編集モーダル */}
    {editMenu && (
      <MenuEditModal
        mode="edit"
        tab={editMenu.menu_type}
        menu={editMenu}
        onClose={() => setEditMenu(null)}
        onSaved={() => { setEditMenu(null); loadMenus() }}
      />
    )}

    {/* 指名料編集モーダル */}
    {shimeiEdit && (
      <ShimeiEditModal
        current={shimeiRyo}
        onClose={() => setShimeiEdit(false)}
        onSaved={async v => {
          await apiFetch('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ shimei_charge: v }) }).catch(() => {})
          setShimeiRyo(v)
          setShimeiEdit(false)
        }}
      />
    )}

    </>
  )
}
