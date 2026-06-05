import { useState, useEffect } from 'react'
import { apiFetch, api } from '../lib/api'
import BottomSheet, { useBottomSheetDismiss } from '../components/BottomSheet'

const S = {
  gold: '#c8a882', text: '#e8e4dc', muted: 'rgba(232,228,220,0.5)',
  border: 'rgba(232,228,220,0.08)', surface: '#211f1d', green: '#6dba8e',
  goldBorder: 'rgba(200,168,130,0.2)', goldDim: 'rgba(200,168,130,0.1)',
  josefin: "'Josefin Sans', sans-serif", zen: "'Zen Kaku Gothic New', sans-serif",
}

type Memo = { id: number; memo_date: string; text: string }

export default function HomePage() {
  const now = new Date()
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  const [showMemoEdit, setShowMemoEdit] = useState(false)
  const [showMemoLog, setShowMemoLog] = useState(false)
  const [allMemos, setAllMemos] = useState<Memo[]>([])

  async function fetchAllMemos() {
    try {
      const all = await apiFetch<Memo[] | null>('/api/v1/studio/memos')
      setAllMemos(all ?? [])
    } catch {}
  }

  useEffect(() => { fetchAllMemos() }, [])

  async function handleMemoSaved() {
    await fetchAllMemos()
    setShowMemoEdit(false)
  }

  return (
    <div>
      <div style={{ padding: '24px 20px 16px' }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 4, fontFamily: S.josefin, letterSpacing: '0.1em' }}>{dateStr}</div>
        <div style={{ fontSize: 20, fontWeight: 400, color: S.text, fontFamily: S.zen }}>おつかれさまです。</div>
      </div>

      <Section title="今日の予約" badge="RESERVE 連携予定">
        <div style={{ padding: '20px 16px', textAlign: 'center', color: S.muted, fontSize: 12, fontFamily: S.zen, lineHeight: 1.8 }}>
          RESERVE連携後に予約情報が表示されます。
        </div>
      </Section>

      <Section title="今月の記録" badge="LOOP 連携予定">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
          <StatCard label="売上" value="—" unit="¥" />
          <StatCard label="施術件数" value="—" unit="件" />
          <StatCard label="リピート率" value="—" unit="%" />
          <StatCard label="新規顧客" value="—" unit="名" />
        </div>
      </Section>

      <Section title="最近の施術" badge="LOOP 連携予定">
        <div style={{ padding: '20px 16px', textAlign: 'center', color: S.muted, fontSize: 12, fontFamily: S.zen, lineHeight: 1.8 }}>
          LOOP連携後に施術記録が表示されます。
        </div>
      </Section>

      {/* 今日のメモ */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold, fontFamily: S.josefin }}>今日のメモ</div>
        </div>

        <div
          onClick={() => setShowMemoEdit(true)}
          style={{
            padding: '14px 16px', background: S.surface,
            border: `1px solid ${S.border}`,
            borderRadius: 2, cursor: 'pointer', lineHeight: 1.75,
            fontSize: 13, fontFamily: S.zen, color: S.muted,
          }}
        >
          今日感じたこと、気づいたことを残しておく...
        </div>

        <div
          onClick={() => { setShowMemoLog(true) }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10, cursor: 'pointer', padding: '4px 0' }}
        >
          {allMemos.length > 0 && (
            <span style={{ fontSize: 10, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.1em' }}>{allMemos.length}件 · </span>
          )}
          <span style={{ fontSize: 10, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.12em' }}>過去の記録を見る</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polyline points="4,2 8,6 4,10" stroke="rgba(232,228,220,0.4)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {showMemoEdit && (
        <BottomSheet onClose={() => setShowMemoEdit(false)}>
          <MemoEditSheet onSaved={() => handleMemoSaved()} />
        </BottomSheet>
      )}

      {showMemoLog && (
        <BottomSheet onClose={() => setShowMemoLog(false)} maxHeight="85vh">
          <MemoLogSheet memos={allMemos} />
        </BottomSheet>
      )}
    </div>
  )
}

function MemoEditSheet({ onSaved }: { onSaved: () => void }) {
  const dismiss = useBottomSheetDismiss()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!text.trim()) { dismiss(); return }
    setLoading(true)
    try {
      const res = await api('/api/v1/studio/memos', {
        method: 'POST',
        body: JSON.stringify({ text: text.trim() }),
      })
      if (res.ok) {
        setText('')
        onSaved()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold, marginBottom: 16, fontFamily: S.josefin }}>今日のメモ</div>
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder="今日感じたこと、気づいたことを残しておく..."
        rows={5} autoFocus
        style={{
          width: '100%', background: '#272422', border: `1px solid ${S.border}`,
          borderRadius: 2, padding: '13px 14px', color: S.text, fontSize: 14,
          fontFamily: S.zen, outline: 'none', resize: 'none', lineHeight: 1.75,
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={dismiss} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 2, color: S.muted, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: S.josefin }}>キャンセル</button>
        <button onClick={handleSave} disabled={loading} style={{ flex: 2, padding: 12, background: S.gold, border: 'none', borderRadius: 2, color: '#1a1816', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer', fontFamily: S.josefin, opacity: loading ? 0.7 : 1 }}>保存する</button>
      </div>
    </>
  )
}

// memo_date は parseTime=true により "2026-06-05 00:00:00 +0900 JST" 等で来るため regex でパース
function parseMemoDate(dateStr: string) {
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return new Date(0)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

type MonthGroup = { monthKey: string; label: string; items: Memo[] }
type YearGroup  = { year: number; months: MonthGroup[] }

function groupByYearMonth(memos: Memo[]): YearGroup[] {
  const yearMap = new Map<number, Map<string, Memo[]>>()
  for (const m of memos) {
    const d = parseMemoDate(m.memo_date)
    const y = d.getFullYear()
    const mk = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!yearMap.has(y)) yearMap.set(y, new Map())
    const mmap = yearMap.get(y)!
    if (!mmap.has(mk)) mmap.set(mk, [])
    mmap.get(mk)!.push(m)
  }
  return [...yearMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, mmap]) => ({
      year,
      months: [...mmap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([mk, items]) => ({
          monthKey: mk,
          label: `${Number(mk.split('-')[1])}月`,
          items,
        })),
    }))
}

function MemoLogSheet({ memos }: { memos: Memo[] }) {
  const nowYear  = new Date().getFullYear()
  const nowMonth = `${nowYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const yearGroups = groupByYearMonth(memos)

  const [openYears,  setOpenYears]  = useState<Set<number>>(() => new Set([nowYear]))
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set([nowMonth]))

  function toggleYear(y: number) {
    setOpenYears(prev => { const s = new Set(prev); s.has(y) ? s.delete(y) : s.add(y); return s })
  }
  function toggleMonth(mk: string) {
    setOpenMonths(prev => { const s = new Set(prev); s.has(mk) ? s.delete(mk) : s.add(mk); return s })
  }

  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.gold, marginBottom: 16, fontFamily: S.josefin }}>過去のメモ</div>
      {yearGroups.length === 0 && (
        <div style={{ textAlign: 'center', color: S.muted, fontSize: 12, fontFamily: S.zen, padding: '20px 0' }}>まだ記録がありません</div>
      )}
      {yearGroups.map(yg => {
        const yOpen = openYears.has(yg.year)
        return (
          <div key={yg.year} style={{ marginBottom: 8 }}>
            {/* 年ヘッダー */}
            <div
              onClick={() => toggleYear(yg.year)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}
            >
              <span style={{ fontSize: 11, letterSpacing: '0.2em', color: S.gold, fontFamily: S.josefin }}>{yg.year}年</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform 0.2s', transform: yOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <polyline points="2,4 6,8 10,4" stroke={S.gold} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
              </svg>
            </div>

            {yOpen && yg.months.map(mg => {
              const mOpen = openMonths.has(mg.monthKey)
              return (
                <div key={mg.monthKey} style={{ marginLeft: 12 }}>
                  {/* 月ヘッダー */}
                  <div
                    onClick={() => toggleMonth(mg.monthKey)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}
                  >
                    <span style={{ fontSize: 10, letterSpacing: '0.15em', color: S.muted, fontFamily: S.josefin }}>{mg.label}　<span style={{ opacity: 0.5 }}>{mg.items.length}件</span></span>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform 0.2s', transform: mOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <polyline points="2,4 6,8 10,4" stroke={S.muted} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {mOpen && (
                    <div style={{ paddingTop: 10, paddingBottom: 4 }}>
                      {mg.items.map(m => {
                        const d = parseMemoDate(m.memo_date)
                        return (
                          <div key={m.id} style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 9, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.1em', marginBottom: 5 }}>{d.getDate()}日</div>
                            <div style={{ fontSize: 13, color: S.text, lineHeight: 1.75, fontFamily: S.zen }}>{m.text}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '20px 20px 0', borderBottom: `1px solid ${S.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold, fontFamily: S.josefin }}>{title}</div>
        {badge && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(109,186,142,0.08)', border: '1px solid rgba(109,186,142,0.2)', borderRadius: 2, fontSize: 9, color: 'rgba(109,186,142,0.7)', fontFamily: S.josefin, letterSpacing: '0.1em' }}>{badge}</div>
        )}
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 2, padding: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', color: S.muted, marginBottom: 6, fontFamily: S.josefin }}>{label}</div>
      <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 26, color: S.text }}>
        {unit === '¥' && <span style={{ fontSize: 13, color: S.muted, marginRight: 3 }}>¥</span>}
        {value}
        {unit !== '¥' && <span style={{ fontSize: 13, color: S.muted, marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  )
}
