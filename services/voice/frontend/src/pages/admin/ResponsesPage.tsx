import { useState } from 'react'
import { OrbitSVG } from './AdminLayout'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = '#C8A882'
const border  = '#E4E0D8'
const muted   = '#999'

const MOCK = [
  { id: 1, date: '06/17', staff: '田中 美咲', overall: 5, finish: 5, service: 5, comment: 'カラーの仕上がりがとても自然で嬉しかったです。また来ます！' },
  { id: 2, date: '06/17', staff: '佐藤 れな', overall: 4, finish: 4, service: 4, comment: '接客がとても丁寧でした。次回もよろしくお願いします。' },
  { id: 3, date: '06/16', staff: '田中 美咲', overall: 5, finish: 5, service: 4, comment: 'イメージ通りに仕上げてくれました。' },
  { id: 4, date: '06/15', staff: '山本 あい', overall: 4, finish: 3, service: 5, comment: '' },
  { id: 5, date: '06/14', staff: '鈴木 花',   overall: 3, finish: 3, service: 4, comment: 'もう少し相談の時間があると嬉しいです。' },
  { id: 6, date: '06/13', staff: '佐藤 れな', overall: 5, finish: 5, service: 5, comment: '最高でした！' },
]
const STAFFS = ['全員', '田中 美咲', '佐藤 れな', '山本 あい', '鈴木 花']

function Stars({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <svg key={n} viewBox="0 0 24 24" width="11" height="11"
          fill={n <= value ? '#F59E0B' : 'none'}
          stroke={n <= value ? '#F59E0B' : '#DDD'}
          strokeWidth="1.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ))}
    </div>
  )
}

export default function ResponsesPage() {
  const [staffFilter, setStaffFilter] = useState('全員')
  const filtered = staffFilter === '全員' ? MOCK : MOCK.filter(r => r.staff === staffFilter)

  return (
    <div style={{ padding: '20px 0 32px' }}>

      {/* Section label */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
          <OrbitSVG />
          <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1816' }}>Responses</span>
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted }}>{filtered.length}件</span>
        </div>
      </div>

      {/* Filter scroll */}
      <div style={{ overflowX: 'auto', padding: '0 20px 14px', scrollbarWidth: 'none' as const }}>
        <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
          {STAFFS.map(s => (
            <button key={s} onClick={() => setStaffFilter(s)} style={{
              padding: '7px 14px', whiteSpace: 'nowrap' as const,
              border: `1px solid ${staffFilter === s ? '#1a1816' : border}`,
              borderRadius: 4,
              background: staffFilter === s ? '#1a1816' : '#fff',
              color: staffFilter === s ? '#fff' : muted,
              fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        {filtered.map(r => (
          <div key={r.id} style={{
            background: '#fff', border: `1px solid ${border}`,
            borderLeft: `3px solid ${gold}`,
            borderRadius: 4, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: zen, fontWeight: 400, fontSize: 13, color: '#333' }}>{r.staff}</span>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted }}>{r.date}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: r.comment ? 12 : 0 }}>
              {[
                { label: '総合', value: r.overall },
                { label: '仕上がり', value: r.finish },
                { label: '接客', value: r.service },
              ].map(item => (
                <div key={item.label} style={{
                  background: '#F8F7F4', border: `1px solid ${border}`,
                  borderRadius: 4, padding: '8px 10px',
                }}>
                  <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: muted, letterSpacing: '0.08em', marginBottom: 5 }}>{item.label}</div>
                  <Stars value={item.value} />
                </div>
              ))}
            </div>
            {r.comment && (
              <p style={{
                fontFamily: zen, fontWeight: 300, fontSize: 13, color: '#555',
                lineHeight: 1.7, margin: 0,
                paddingTop: 10, borderTop: `1px solid ${border}`,
              }}>{r.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
