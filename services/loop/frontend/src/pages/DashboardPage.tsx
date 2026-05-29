import AppLayout from '../components/AppLayout'
import { getSalonName } from '../lib/auth'

export default function DashboardPage() {
  const zen    = "'Zen Kaku Gothic New', sans-serif"
  const josefin = "'Josefin Sans', sans-serif"
  const muted  = 'rgba(232,228,220,0.55)'
  const salonName = getSalonName()

  return (
    <AppLayout>
      <div style={{ padding: '14px 20px 24px' }}>
        <div style={{ fontSize: 12, color: muted, fontFamily: zen, marginBottom: 4 }}>おはようございます</div>
        <div style={{ fontSize: 17, fontWeight: 400, color: '#e8e4dc', fontFamily: zen }}>{salonName}</div>

        <div style={{
          marginTop: 24,
          padding: 20,
          background: '#211f1d',
          borderRadius: 2,
          border: '1px solid rgba(232,228,220,0.08)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: muted, fontFamily: josefin, fontWeight: 100, letterSpacing: '0.2em', marginBottom: 12 }}>
            COMING SOON
          </div>
          <div style={{ fontSize: 13, color: muted, fontFamily: zen, lineHeight: 1.8 }}>
            ダッシュボードは現在制作中です。<br />
            在庫管理はボトムナビの「在庫」から確認できます。
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
