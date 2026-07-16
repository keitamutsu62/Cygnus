import { useEffect, useState } from 'react'
import { api, apiFetch } from '../lib/api'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = 'var(--accent)'
const text    = 'var(--text)'
const muted   = 'var(--text-muted)'
const border  = 'var(--border)'
const surface = 'var(--surface)'

type Extracted = {
  author: string
  date: string
  rating: number
  text: string
  staff_hint: string
  staff_id: number | null
  staff_name: string | null
}
type Staff = { id: number; name: string; is_active: boolean }
type Menu  = { id: number; name: string; menu_type: string }
type Store = { id: number; name: string }

type Draft = Extracted & {
  editable: boolean
  menu_id: number | null
  rating_finish: number
  rating_service: number
  selected: boolean
}

export default function ReviewImportSheet({ onClose, onSaved }: {
  onClose: () => void
  onSaved: (count: number) => void
}) {
  const [files, setFiles]       = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [phase, setPhase]       = useState<'upload' | 'analyzing' | 'confirm' | 'saving'>('upload')
  const [drafts, setDrafts]     = useState<Draft[]>([])
  const [staffs, setStaffs]     = useState<Staff[]>([])
  const [menus,  setMenus]      = useState<Menu[]>([])
  const [stores, setStores]     = useState<Store[]>([])
  const [storeId, setStoreId]   = useState<number | null>(null)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    apiFetch<Staff[]>('/api/v1/staffs').then(list => setStaffs(Array.isArray(list) ? list.filter(s => s.is_active) : [])).catch(() => {})
    apiFetch<Menu[]>('/api/v1/menus?type=treatment').then(list => setMenus(Array.isArray(list) ? list : [])).catch(() => {})
    apiFetch<Store[]>('/api/v1/stores').then(list => {
      const arr = Array.isArray(list) ? list : []
      setStores(arr)
      if (arr.length === 1) setStoreId(arr[0].id)
    }).catch(() => {})
  }, [])

  function onSelectFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    const total = files.length + list.length
    if (total > 20) {
      setError(`一度にアップロードできるのは最大20枚までです（現在 ${total} 枚）`)
      return
    }
    setError(null)
    const nextFiles = [...files, ...list]
    setFiles(nextFiles)
    Promise.all(list.map(f => new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(f)
    }))).then(urls => setPreviews(prev => [...prev, ...urls]))
    e.target.value = ''
  }

  function removeFile(i: number) {
    setFiles(files.filter((_, idx) => idx !== i))
    setPreviews(previews.filter((_, idx) => idx !== i))
  }

  async function analyze() {
    if (files.length === 0) { setError('スクショを1枚以上追加してください'); return }
    setError(null)
    setPhase('analyzing')
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('images', f))
      const res = await api('/api/v1/reviews/import/analyze', { method: 'POST', body: fd, headers: {} })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = await res.json() as Extracted[]
      const next: Draft[] = data.map(d => ({
        ...d,
        editable: true,
        menu_id: null,
        rating_finish:  d.rating,
        rating_service: d.rating,
        selected: true,
      }))
      setDrafts(next)
      setPhase('confirm')
    } catch (e) {
      setError('解析に失敗しました。時間をおいて再度お試しください。')
      setPhase('upload')
      console.error(e)
    }
  }

  async function save() {
    const selected = drafts.filter(d => d.selected)
    if (selected.length === 0) { setError('保存する口コミを1件以上選択してください'); return }
    setError(null)
    setPhase('saving')
    try {
      const items = selected.map(d => ({
        staff_id: d.staff_id,
        menu_id:  d.menu_id,
        rating_overall: d.rating,
        rating_finish:  d.rating_finish,
        rating_service: d.rating_service,
        comment: d.text,
        created_at: d.date || undefined,
      }))
      const res = await api('/api/v1/reviews/import', {
        method: 'POST',
        body: JSON.stringify({ store_id: storeId, items }),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = await res.json() as { saved: number }
      onSaved(data.saved)
    } catch (e) {
      setError('保存に失敗しました。時間をおいて再度お試しください。')
      setPhase('confirm')
      console.error(e)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxHeight: '92dvh',
        background: 'var(--bg)', borderTop: `1px solid ${border}`,
        borderRadius: '16px 16px 0 0',
        display: 'flex', flexDirection: 'column' as const,
      }}>
        <div style={{ padding: '18px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}` }}>
          <div>
            <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', color: text }}>IMPORT</div>
            <div style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted, marginTop: 2 }}>Google Maps の口コミスクショから取り込む</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: josefin, fontWeight: 100, fontSize: 12, color: muted, letterSpacing: '0.1em' }}>CLOSE</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 20px 24px', flex: 1 }}>
          {error && (
            <div style={{ background: 'rgba(224,112,96,0.08)', border: '1px solid rgba(224,112,96,0.25)', borderRadius: 4, padding: '10px 12px', marginBottom: 12, fontFamily: zen, fontSize: 12, color: '#e07060' }}>
              {error}
            </div>
          )}

          {phase === 'upload' && (
            <>
              <div style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted, marginBottom: 10, lineHeight: 1.7 }}>
                Google Mapsで検索 → 口コミページを表示 → スクロールしながらスクショを撮影 → ここに追加してください（最大20枚）。
              </div>
              <div style={{
                background: 'var(--accent-dim)', border: `1px solid var(--accent-border)`,
                borderRadius: 4, padding: '10px 12px', marginBottom: 12,
                fontFamily: zen, fontWeight: 300, fontSize: 12, color: text, lineHeight: 1.65,
              }}>
                <b style={{ color: gold, fontWeight: 500 }}>💡 Tip：</b>
                まずは一覧画面をスクロールしながら数枚まとめて撮影。長文で <b>「もっと見る」</b> が付いている口コミは、個別に開いて全文表示させた画面を追加で撮影してください。
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px dashed ${border}`, borderRadius: 6, padding: '24px 16px',
                cursor: 'pointer', color: muted, fontFamily: zen, fontSize: 13,
                background: surface,
              }}>
                <input type="file" accept="image/*" multiple onChange={onSelectFiles} style={{ display: 'none' }} />
                ＋ 画像を追加（{files.length}/20）
              </label>

              {previews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 12 }}>
                  {previews.map((src, i) => (
                    <div key={i} style={{ position: 'relative', paddingTop: '133%', background: surface, border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden' }}>
                      <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => removeFile(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', width: 20, height: 20, borderRadius: '50%', fontSize: 12, cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {stores.length > 1 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.18em', color: muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>店舗</div>
                  <select value={storeId ?? ''} onChange={e => setStoreId(e.target.value ? Number(e.target.value) : null)} style={{ width: '100%', padding: '10px 12px', background: surface, border: `1px solid ${border}`, borderRadius: 4, fontFamily: zen, fontSize: 14, color: text }}>
                    <option value="">— 未指定 —</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <button onClick={analyze} disabled={files.length === 0} style={{
                marginTop: 20, width: '100%', padding: 14,
                background: files.length === 0 ? 'var(--accent-dim)' : gold, border: 'none', borderRadius: 4,
                cursor: files.length === 0 ? 'default' : 'pointer',
                fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em',
                color: 'var(--on-accent)', textTransform: 'uppercase' as const,
              }}>Analyze ({files.length}枚)</button>
            </>
          )}

          {phase === 'analyzing' && (
            <div style={{ textAlign: 'center' as const, padding: '40px 0' }}>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', color: gold, marginBottom: 8 }}>ANALYZING…</div>
              <div style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted }}>スクショから口コミを抽出しています（数十秒かかります）</div>
            </div>
          )}

          {phase === 'confirm' && (
            <>
              <div style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: muted, marginBottom: 10 }}>
                抽出された口コミ ({drafts.length}件)。担当スタッフ・メニューを確認して保存してください。
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {drafts.map((d, i) => (
                  <div key={i} style={{
                    background: surface, border: `1px solid ${border}`,
                    borderLeft: `3px solid ${d.selected ? gold : border}`,
                    borderRadius: 4, padding: '12px 14px', opacity: d.selected ? 1 : 0.55,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <input type="checkbox" checked={d.selected} onChange={() => setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, selected: !x.selected } : x))} />
                      <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: gold }}>{'★'.repeat(d.rating)}{'☆'.repeat(5 - d.rating)}</span>
                      <span style={{ fontFamily: zen, fontWeight: 400, fontSize: 12, color: text }}>{d.author || '匿名'}</span>
                      <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: muted, marginLeft: 'auto' as const }}>{d.date}</span>
                    </div>
                    <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 12, color: text, margin: '0 0 10px', lineHeight: 1.65 }}>{d.text}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 9, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const, marginBottom: 3 }}>担当スタッフ {d.staff_hint && <span style={{ color: gold }}>（候補: {d.staff_hint}）</span>}</div>
                        <select
                          value={d.staff_id ?? ''}
                          onChange={e => {
                            const v = e.target.value ? Number(e.target.value) : null
                            const staffName = v ? staffs.find(s => s.id === v)?.name ?? null : null
                            setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, staff_id: v, staff_name: staffName } : x))
                          }}
                          style={{ width: '100%', padding: '6px 8px', background: 'var(--bg)', border: `1px solid ${border}`, borderRadius: 3, fontFamily: zen, fontSize: 12, color: text }}
                        >
                          <option value="">— 不明 —</option>
                          {staffs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 9, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' as const, marginBottom: 3 }}>メニュー</div>
                        <select
                          value={d.menu_id ?? ''}
                          onChange={e => {
                            const v = e.target.value ? Number(e.target.value) : null
                            setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, menu_id: v } : x))
                          }}
                          style={{ width: '100%', padding: '6px 8px', background: 'var(--bg)', border: `1px solid ${border}`, borderRadius: 3, fontFamily: zen, fontSize: 12, color: text }}
                        >
                          <option value="">— 未指定 —</option>
                          {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setPhase('upload')} style={{ flex: 1, padding: 13, background: 'transparent', border: `1px solid ${border}`, borderRadius: 4, fontFamily: zen, fontSize: 13, color: muted, cursor: 'pointer' }}>戻る</button>
                <button onClick={save} disabled={drafts.filter(d => d.selected).length === 0} style={{
                  flex: 2, padding: 13,
                  background: drafts.filter(d => d.selected).length === 0 ? 'var(--accent-dim)' : gold,
                  border: 'none', borderRadius: 4, fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', color: 'var(--on-accent)', textTransform: 'uppercase' as const,
                  cursor: drafts.filter(d => d.selected).length === 0 ? 'default' : 'pointer',
                }}>Save ({drafts.filter(d => d.selected).length}件)</button>
              </div>
            </>
          )}

          {phase === 'saving' && (
            <div style={{ textAlign: 'center' as const, padding: '40px 0' }}>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', color: gold, marginBottom: 8 }}>SAVING…</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
