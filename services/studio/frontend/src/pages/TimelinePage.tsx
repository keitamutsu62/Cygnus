const S = {
  gold: '#c8a882', text: '#e8e4dc', muted: 'rgba(232,228,220,0.5)',
  border: 'rgba(232,228,220,0.08)', surface: '#211f1d', green: '#6dba8e',
  josefin: "'Josefin Sans', sans-serif", zen: "'Zen Kaku Gothic New', sans-serif",
}

// サロン在籍履歴はsalon_membershipsから取得予定（現在はスタブ）
const STUB_CAREER = [
  { period: '2024年4月 〜 現在', salon: 'Hair Salon Example', role: 'スタイリスト', current: true },
  { period: '2021年4月 〜 2024年3月', salon: 'Beauty Studio Sample', role: 'アシスタント', current: false },
]

export default function TimelinePage() {
  return (
    <div>
      <div style={{ padding: '24px 20px 8px' }}>
        <div style={{ fontSize: 18, fontWeight: 400, color: S.text, fontFamily: S.zen, marginBottom: 4 }}>
          キャリア
        </div>
        <div style={{ fontSize: 11, color: S.muted, fontFamily: S.josefin, letterSpacing: '0.1em' }}>
          在籍サロンの履歴
        </div>
      </div>

      {/* 累計サマリ */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold, fontFamily: S.josefin }}>Cumulative</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(109,186,142,0.08)', border: '1px solid rgba(109,186,142,0.2)', borderRadius: 2, fontSize: 9, color: 'rgba(109,186,142,0.7)', fontFamily: S.josefin, letterSpacing: '0.1em' }}>LOOP 連携予定</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 2, padding: 16 }}>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 6, fontFamily: S.josefin, letterSpacing: '0.1em' }}>累計施術</div>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 26, color: S.text }}>
              —<span style={{ fontSize: 13, color: S.muted, marginLeft: 2 }}>件</span>
            </div>
          </div>
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 2, padding: 16 }}>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 6, fontFamily: S.josefin, letterSpacing: '0.1em' }}>経験年数</div>
            <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 26, color: S.text }}>
              —<span style={{ fontSize: 13, color: S.muted, marginLeft: 2 }}>年</span>
            </div>
          </div>
        </div>
      </div>

      {/* タイムライン */}
      <div style={{ padding: '20px 0 0' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: S.gold, fontFamily: S.josefin, padding: '0 20px', marginBottom: 16 }}>Career History</div>
        {STUB_CAREER.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, padding: '0 20px 24px', position: 'relative' }}>
            {i < STUB_CAREER.length - 1 && (
              <div style={{ position: 'absolute', left: 23, top: 8, bottom: -8, width: 1, background: S.border }} />
            )}
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              border: `1px solid ${S.gold}`, background: c.current ? S.gold : '#1a1816',
              flexShrink: 0, marginTop: 4,
            }} />
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', color: S.muted, fontFamily: S.josefin, marginBottom: 4 }}>{c.period}</div>
              <div style={{ fontSize: 14, color: S.text, fontFamily: S.zen, marginBottom: 3 }}>{c.salon}</div>
              <div style={{ fontSize: 11, color: S.gold, fontFamily: S.zen }}>{c.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
