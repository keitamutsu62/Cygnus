import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { OrbitSVG } from './AdminLayout'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const gold    = '#C8A882'
const border  = '#E4E0D8'
const muted   = '#999'

interface StoredStaff { id: number; name: string; role: string; photo: string | null; overall: number; count: number }

function loadStaffById(id: string): StoredStaff | null {
  try {
    const stored = localStorage.getItem('cygnus_staffs')
    if (!stored) return null
    const list: StoredStaff[] = JSON.parse(stored)
    return list.find(s => String(s.id) === id) ?? null
  } catch { return null }
}

const MOCK_ANALYSIS: Record<string, { finish: number; service: number; comments: string[]; analysis: { good: string[]; improve: string[]; advice: string[] } }> = {
  '1': {
    finish: 4.7, service: 4.9,
    comments: ['カラーの仕上がりがとても自然で嬉しかったです。また来ます！', 'イメージ通りに仕上げてくれました。', 'カウンセリングが丁寧で安心できました。', '施術中の説明がわかりやすかったです。', '待ち時間が少し長かったです。'],
    analysis: {
      good: ['カウンセリングが丁寧で、顧客のイメージを正確に把握できている', 'カラーの仕上がりに対する満足度が非常に高い', '施術中のコミュニケーションが自然で安心感を与えている'],
      improve: ['予約時間の管理が課題で、待ち時間に関するコメントが散見される'],
      advice: ['施術前の所要時間の目安を伝えることで待ち時間への不満を軽減できる', 'カラーの色持ちに関するホームケアアドバイスを加えると満足度がさらに向上する'],
    }
  },
  '2': {
    finish: 4.6, service: 4.4,
    comments: ['接客がとても丁寧でした。', '技術は高いと思いますが、もう少し会話が弾むといいな。', '最高でした！', '少し無口な印象でした。'],
    analysis: {
      good: ['技術面（仕上がり）への評価が高く、スキルへの信頼度が高い', '丁寧な接客でリピート意向が強い顧客が多い'],
      improve: ['施術中の会話・コミュニケーションに物足りなさを感じる顧客が複数いる', '接客スコアが仕上がりスコアより低く、バランスに課題がある'],
      advice: ['施術中に顧客の好みを引き出す質問を1〜2個意識的に入れると会話が自然に生まれる', '施術後の次回提案を添えると関係構築につながる'],
    }
  },
  '3': {
    finish: 4.2, service: 4.5,
    comments: ['笑顔が素敵でした。', 'もう少し施術の丁寧さがあると嬉しいです。', '接客は明るくて良かったです。'],
    analysis: {
      good: ['笑顔や明るい雰囲気が顧客に好印象を与えている', '接客・コミュニケーションのスコアが高い'],
      improve: ['仕上がりスコアが接客スコアより低く、技術面のレベルアップが必要'],
      advice: ['シャンプーやブローなどの基本技術を繰り返し練習し、丁寧さの精度を上げることが優先課題', '先輩スタイリストの施術観察を積極的に行う'],
    }
  },
  '4': {
    finish: 4.0, service: 4.2,
    comments: ['もう少し相談の時間があると嬉しいです。', '丁寧にやってくれました。'],
    analysis: {
      good: ['丁寧さへのポジティブなフィードバックがある'],
      improve: ['カウンセリング・相談時間が不足していると感じる顧客がいる', '回答数がまだ少なく、傾向の把握に時間が必要'],
      advice: ['カウンセリング時に「今日はどんな仕上がりにしたいですか？」と明確に確認する習慣をつける'],
    }
  },
}

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

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(true)

  const staff = loadStaffById(id ?? '')
  if (!staff) return <div style={{ padding: 20, color: muted, fontFamily: josefin }}>Not found</div>

  const mockData = MOCK_ANALYSIS[id ?? ''] ?? null
  const finish  = mockData?.finish  ?? staff.overall
  const service = mockData?.service ?? staff.overall
  const comments = mockData?.comments ?? []

  async function handleAnalyze() {
    setAnalyzing(true)
    await new Promise(r => setTimeout(r, 1800))
    setAnalyzing(false)
    setAnalyzed(true)
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Back */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px',
        background: '#fff', borderBottom: `1px solid ${border}`,
      }}>
        <button onClick={() => navigate('/admin/staffs')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#666" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: muted }}>Staff Detail</span>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Profile card */}
        <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '20px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
            background: '#F0EDE6', border: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: josefin, fontWeight: 100, fontSize: 22, color: '#888',
          }}>{staff.name[0]}</div>
          <div>
            <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 17, color: '#1a1816', marginBottom: 3 }}>{staff.name}</div>
            <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, letterSpacing: '0.08em', marginBottom: 8 }}>{staff.role}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stars value={staff.overall} size={15} />
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 14, color: '#1a1816' }}>{staff.overall}</span>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted }}>/ {staff.count}件</span>
            </div>
          </div>
        </div>

        {/* Score bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <OrbitSVG />
          <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1816' }}>Scores</span>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '16px 18px', marginBottom: 20 }}>
          {[
            { label: '総合満足度', value: staff.overall },
            { label: '仕上がり',   value: finish },
            { label: '接客',       value: service },
          ].map((item, i) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < 2 ? 14 : 0 }}>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, width: 72, flexShrink: 0 }}>{item.label}</span>
              <div style={{ flex: 1, height: 3, background: '#F0EDE6', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(item.value / 5) * 100}%`, background: gold, borderRadius: 2 }} />
              </div>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 13, color: '#1a1816', width: 24, textAlign: 'right' as const }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* AI Analysis */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <OrbitSVG />
            <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1816' }}>AI Analysis</span>
          </div>
          <button onClick={handleAnalyze} disabled={analyzing} style={{
            background: 'none', border: `1px solid ${border}`, borderRadius: 4, padding: '5px 12px',
            fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const,
            color: analyzing ? muted : '#555', cursor: analyzing ? 'default' : 'pointer',
          }}>
            {analyzing ? '分析中…' : '再分析'}
          </button>
        </div>

        {analyzing ? (
          <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '32px 18px', textAlign: 'center' as const }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '2px solid #E4E0D8', borderTopColor: gold,
              animation: 'spin 0.8s linear infinite', margin: '0 auto 10px',
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, letterSpacing: '0.1em' }}>ANALYZING…</span>
          </div>
        ) : analyzed ? (
          <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
            {[
              { key: 'good',    label: 'GOOD',    color: '#6dba8e', items: mockData?.analysis.good    ?? [] },
              { key: 'improve', label: 'IMPROVE', color: '#E07060', items: mockData?.analysis.improve ?? [] },
              { key: 'advice',  label: 'ADVICE',  color: gold,      items: mockData?.analysis.advice  ?? [] },
            ].map((section, si) => (
              <div key={section.key} style={{
                padding: '16px 18px',
                borderBottom: si < 2 ? `1px solid ${border}` : 'none',
                borderLeft: `3px solid ${section.color}`,
              }}>
                <div style={{ fontFamily: josefin, fontWeight: 200, fontSize: 10, letterSpacing: '0.2em', color: section.color, marginBottom: 10 }}>{section.label}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
                  {section.items.map((item, i) => (
                    <li key={i} style={{ fontFamily: zen, fontWeight: 300, fontSize: 13, color: '#444', lineHeight: 1.65, paddingLeft: 12, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: 6, width: 4, height: 4, borderRadius: '50%', background: section.color, display: 'block' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div style={{ padding: '10px 18px', background: '#FAFAF8' }}>
              <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, color: '#CCC', letterSpacing: '0.08em' }}>{staff.count}件のコメントをもとに生成 · 参考としてご活用ください</span>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '28px 18px', textAlign: 'center' as const, marginBottom: 20 }}>
            <p style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, color: muted, marginBottom: 16, letterSpacing: '0.08em' }}>コメントからAIがフィードバックを分析します</p>
            <button onClick={handleAnalyze} style={{
              padding: '11px 28px', background: '#1a1816', border: 'none', borderRadius: 4, cursor: 'pointer',
              fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#fff',
            }}>Analyze</button>
          </div>
        )}

        {/* Comments */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <OrbitSVG />
          <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1816' }}>Comments</span>
        </div>
        {comments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
            {comments.map((c, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '12px 16px' }}>
                <p style={{ fontFamily: zen, fontWeight: 300, fontSize: 13, color: '#555', margin: 0, lineHeight: 1.65 }}>{c}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, padding: '24px 18px', textAlign: 'center' as const }}>
            <p style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, color: '#CCC', margin: 0, letterSpacing: '0.1em' }}>まだコメントはありません</p>
          </div>
        )}
      </div>
    </div>
  )
}
