import { OrbitSVG } from './AdminLayout'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = '#C8A882'
const border  = '#E4E0D8'
const muted   = '#999'

const MOCK_STAFFS = [
  { name: '田中 美咲', overall: 4.8, count: 32 },
  { name: '佐藤 れな', overall: 4.5, count: 28 },
  { name: '山本 あい', overall: 4.3, count: 21 },
  { name: '鈴木 花',   overall: 4.1, count: 15 },
]

const MOCK_COMMENTS = [
  { staff: '田中 美咲', date: '06/17', rating: 5, comment: 'カラーの仕上がりがとても自然で嬉しかったです。また来ます！' },
  { staff: '佐藤 れな', date: '06/17', rating: 4, comment: '接客がとても丁寧でした。施術中も話しかけてくれて安心できました。' },
  { staff: '田中 美咲', date: '06/16', rating: 5, comment: 'イメージ通りに仕上げてくれました。' },
]

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <svg key={n} viewBox="0 0 24 24" width={size} height={size}
          fill={n <= Math.round(value) ? '#F59E0B' : 'none'}
          stroke={n <= Math.round(value) ? '#F59E0B' : '#DDD'}
          strokeWidth="1.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ))}
    </div>
  )
}

function SectionLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '24px 0 10px' }}>
      <OrbitSVG />
      <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1816' }}>{label}</span>
      {sub && <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, letterSpacing: '0.05em' }}>{sub}</span>}
    </div>
  )
}

export default function DashboardPage() {
  const totalResponses = MOCK_STAFFS.reduce((s, st) => s + st.count, 0)
  const avgOverall = (MOCK_STAFFS.reduce((s, st) => s + st.overall * st.count, 0) / totalResponses).toFixed(1)

  return (
    <div style={{ padding: '20px 20px 32px' }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
        <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '18px 18px' }}>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: muted, marginBottom: 10 }}>今月の回答数</div>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 38, color: '#1a1816', lineHeight: 1 }}>{totalResponses}</div>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, marginTop: 4 }}>responses</div>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '18px 18px' }}>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: muted, marginBottom: 10 }}>平均総合評価</div>
          <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 38, color: '#1a1816', lineHeight: 1 }}>{avgOverall}</div>
          <div style={{ marginTop: 6 }}><Stars value={parseFloat(avgOverall)} /></div>
        </div>
      </div>

      {/* Staff ranking */}
      <SectionLabel label="Staff Ranking" sub="· 今月" />
      <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden' }}>
        {MOCK_STAFFS.map((st, i) => (
          <div key={st.name} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 18px',
            borderBottom: i < MOCK_STAFFS.length - 1 ? `1px solid ${border}` : 'none',
          }}>
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 13, color: '#ccc', width: 14 }}>{i + 1}</span>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: '#F0EDE6', border: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: josefin, fontWeight: 100, fontSize: 13, color: '#888',
            }}>{st.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 14, color: '#1a1816', marginBottom: 4 }}>{st.name}</div>
              <Stars value={st.overall} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 16, color: '#1a1816' }}>{st.overall}</span>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: muted }}>{st.count}件</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent comments */}
      <SectionLabel label="Recent Comments" />
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        {MOCK_COMMENTS.map((c, i) => (
          <div key={i} style={{
            background: '#fff', border: `1px solid ${border}`,
            borderLeft: `3px solid ${gold}`,
            borderRadius: 4, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: zen, fontWeight: 400, fontSize: 13, color: '#555' }}>{c.staff}</span>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted }}>{c.date}</span>
            </div>
            <Stars value={c.rating} />
            <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 14, color: '#444', marginTop: 8, lineHeight: 1.7 }}>{c.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
