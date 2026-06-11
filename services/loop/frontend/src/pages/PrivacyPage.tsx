import { useNavigate } from 'react-router-dom'

const S = {
  bg:      '#1a1816',
  surface: '#211f1d',
  gold:    '#c8a882',
  text:    '#e8e4dc',
  muted:   'rgba(232,228,220,0.55)',
  border:  'rgba(232,228,220,0.08)',
  josefin: "'Josefin Sans', sans-serif",
  zen:     "'Zen Kaku Gothic New', sans-serif",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontFamily: S.josefin,
        fontWeight: 200,
        fontSize: 13,
        letterSpacing: '0.2em',
        color: S.gold,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: `1px solid ${S.border}`,
      }}>{title}</h2>
      <div style={{ fontFamily: S.zen, fontSize: 14, color: S.muted, lineHeight: 1.9 }}>
        {children}
      </div>
    </section>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ color: S.text, fontWeight: 500 }}>{label}</span>
      <div style={{ marginTop: 2 }}>{children}</div>
    </div>
  )
}

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', background: S.bg, color: S.text }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: 40 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', color: S.muted,
              fontFamily: S.josefin, fontSize: 12, letterSpacing: '0.15em',
              cursor: 'pointer', padding: 0, marginBottom: 24,
            }}
          >← BACK</button>
          <div style={{ fontFamily: S.josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.3em', color: S.gold, marginBottom: 10 }}>
            CYGNUS
          </div>
          <h1 style={{ fontFamily: S.zen, fontWeight: 300, fontSize: 22, color: S.text, margin: 0 }}>
            プライバシーポリシー
          </h1>
          <div style={{ fontFamily: S.zen, fontSize: 13, color: S.muted, marginTop: 8 }}>
            制定日：2026年6月9日　最終更新：2026年6月9日
          </div>
        </div>

        {/* 前文 */}
        <div style={{
          background: S.surface, border: `1px solid ${S.border}`,
          borderRadius: 4, padding: '20px 24px', marginBottom: 36,
          fontFamily: S.zen, fontSize: 14, color: S.muted, lineHeight: 1.9,
        }}>
          陸浦圭太（屋号：Cygnus、以下「当社」）は、提供するサービス「Cygnus LOOP」および「Cygnus STUDIO」（以下総称して「本サービス」）において、利用者の個人情報及び事業データの取り扱いに関し、個人情報保護法その他関連法令を遵守し、本プライバシーポリシー（以下「本ポリシー」）を定めます。本サービスをご利用いただくことで、本ポリシーに同意いただいたものとみなします。
        </div>

        <Section title="1. 事業者情報">
          <Item label="屋号">Cygnus</Item>
          <Item label="代表者">陸浦圭太</Item>
          <Item label="お問い合わせ">privacy@cygnus.style</Item>
        </Section>

        <Section title="2. 取得する情報">
          <p style={{ marginBottom: 12 }}>当社は以下の情報を取得します。</p>
          <Item label="アカウント情報">
            氏名、メールアドレス、パスワード（ハッシュ化）、電話番号
          </Item>
          <Item label="サロン・事業情報">
            サロン名、所在地、営業時間、スタッフ構成、提供メニューおよびその料金
          </Item>
          <Item label="売上・施術データ">
            日次・月次の売上金額、施術件数、客単価、指名状況、物販売上
          </Item>
          <Item label="予約・顧客データ">
            顧客氏名・連絡先、来店履歴、予約情報、施術メモ
          </Item>
          <Item label="スタイリストポートフォリオ（STUDIO）">
            プロフィール、作品画像、経歴、スキルタグ
          </Item>
          <Item label="利用ログ">
            IPアドレス、ブラウザ情報、アクセス日時、操作履歴
          </Item>
          <Item label="決済関連">
            決済はStripe等の決済代行事業者が処理します。当社はカード番号を保持しません。
          </Item>
        </Section>

        <Section title="3. 利用目的">
          取得した情報は以下の目的に利用します。
          <ul style={{ marginTop: 10, paddingLeft: 20 }}>
            <li>本サービスの提供・運営・改善</li>
            <li>ユーザーサポート・お問い合わせへの対応</li>
            <li>料金請求・決済処理</li>
            <li>不正利用の防止・セキュリティ確保</li>
            <li>サービスの利用状況の統計分析（個人を特定しない形での集計）</li>
            <li>新機能・アップデートに関する通知</li>
            <li>下記「Cygnus IDと事業信用データの活用」に定める用途</li>
          </ul>
        </Section>

        <Section title="4. Cygnus IDと事業信用データの活用">
          <p style={{ marginBottom: 12 }}>
            本サービスへの登録時、各利用者には固有の識別子（<span style={{ color: S.text }}>Cygnus ID</span>）が付与されます。Cygnus IDには、継続的な利用を通じて蓄積される以下のデータが紐付きます。
          </p>
          <ul style={{ marginTop: 8, marginBottom: 14, paddingLeft: 20 }}>
            <li>売上の推移・安定性</li>
            <li>顧客継続率・新規獲得状況</li>
            <li>施術件数・稼働率</li>
            <li>サービス継続期間・プラン履歴</li>
          </ul>
          <p style={{ marginBottom: 12 }}>
            当社は将来的に、ユーザーの<span style={{ color: S.text }}>明示的な同意を得た上で</span>、上記データを統計的・匿名的に加工したものを金融機関・信用評価事業者等へ提供し、美容師・サロン経営者向けの与信評価・融資審査の参考情報として活用いただく構想を有しています。
          </p>
          <p>
            この機能は別途オプトイン型の同意取得フローを設けて提供します。同意なしに個人を特定できる形でのデータ提供は行いません。現時点では本機能は提供しておらず、提供開始前に改めてご説明・同意確認をいたします。
          </p>
        </Section>

        <Section title="5. 第三者提供">
          <p style={{ marginBottom: 12 }}>当社は以下の場合を除き、取得した個人情報を第三者に提供しません。</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>利用者本人の同意がある場合</li>
            <li>法令に基づく場合（裁判所・行政機関からの開示要請等）</li>
            <li>人の生命・身体・財産の保護のため緊急かつやむを得ない場合</li>
            <li>業務委託先（クラウドインフラ、決済代行等）への必要最小限の提供</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            業務委託先に対しては、当社と同等以上の個人情報保護水準を求め、適切な監督を行います。
          </p>
        </Section>

        <Section title="6. 利用するクラウドサービス・外部サービス">
          <Item label="Amazon Web Services (AWS)">
            サーバーインフラ・データベース・ファイルストレージとして利用。データは東京リージョン（ap-northeast-1）に保存。
          </Item>
          <Item label="Cloudflare R2">
            画像ファイルのストレージとして利用する場合があります。
          </Item>
          <Item label="Stripe">
            決済処理。Stripeのプライバシーポリシーが適用されます。
          </Item>
        </Section>

        <Section title="7. 安全管理措置">
          <ul style={{ paddingLeft: 20 }}>
            <li>通信の全経路SSL/TLS暗号化</li>
            <li>パスワードのbcryptハッシュ化</li>
            <li>JWT認証トークンによるアクセス制御</li>
            <li>AWS IAMによる最小権限原則の適用</li>
            <li>データベースの非公開サブネット配置</li>
            <li>定期的なバックアップ</li>
          </ul>
        </Section>

        <Section title="8. データの保持期間">
          <ul style={{ paddingLeft: 20 }}>
            <li>アカウント情報：退会後1年間保持後、削除</li>
            <li>売上・施術データ：退会後5年間保持（税務上の記録として）後、削除</li>
            <li>アクセスログ：90日間保持後、自動削除</li>
          </ul>
        </Section>

        <Section title="9. 開示・訂正・削除等の請求">
          <p>
            利用者は、当社に対して自己の個人情報の開示・訂正・削除・利用停止を請求することができます。お問い合わせ窓口（privacy@cygnus.style）へご連絡ください。本人確認の上、法令の定めに従い対応いたします。
          </p>
        </Section>

        <Section title="10. Cookieおよび類似技術">
          <p>
            本サービスはセッション管理のためにlocalStorageおよびCookieを使用します。広告目的のトラッキングは行っておりません。ブラウザの設定によりCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。
          </p>
        </Section>

        <Section title="11. 未成年者の利用">
          <p>
            本サービスは事業者向けサービスです。18歳未満の方の利用はご遠慮ください。
          </p>
        </Section>

        <Section title="12. ポリシーの変更">
          <p>
            当社は本ポリシーを適宜改定することがあります。重要な変更については、サービス内通知またはメールにてお知らせします。改定後の本ポリシーは、当該ページに掲載した時点から効力を生じるものとします。
          </p>
        </Section>

        <Section title="13. お問い合わせ">
          <p>個人情報の取り扱いに関するご質問・ご要望は下記までご連絡ください。</p>
          <div style={{ marginTop: 12, padding: '16px 20px', background: S.surface, borderRadius: 4, border: `1px solid ${S.border}` }}>
            <div>屋号：Cygnus　代表：陸浦圭太</div>
            <div>メール：privacy@cygnus.style</div>
          </div>
        </Section>

        <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 20, textAlign: 'center', fontFamily: S.zen, fontSize: 12, color: S.muted }}>
          © 2026 Cygnus (陸浦圭太). All rights reserved.
        </div>
      </div>
    </div>
  )
}
