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

export default function TermsPage() {
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
            利用規約
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
          本利用規約（以下「本規約」）は、陸浦圭太（屋号：Cygnus、以下「当社」）が提供する「Cygnus LOOP」「Cygnus STUDIO」（以下総称して「本サービス」）の利用条件を定めるものです。本サービスにご登録いただくことで、本規約に同意いただいたものとみなします。
        </div>

        <Section title="第1条（定義）">
          <ul style={{ paddingLeft: 20 }}>
            <li>「本サービス」：当社が運営するCygnus LOOP（サロン経営支援SaaS）およびCygnus STUDIO（スタイリストポートフォリオサービス）</li>
            <li>「ユーザー」：本サービスに登録した個人または法人</li>
            <li>「サロンオーナー」：Cygnus LOOPに事業者として登録したユーザー</li>
            <li>「スタッフ」：サロンオーナーから招待を受けて登録したユーザー</li>
            <li>「Cygnus ID」：本サービス登録時に付与される固有識別子</li>
            <li>「事業データ」：本サービスの利用を通じて蓄積される売上・施術・顧客・在庫等のデータ</li>
          </ul>
        </Section>

        <Section title="第2条（利用登録）">
          <p style={{ marginBottom: 10 }}>本サービスは、以下の方を対象としています。</p>
          <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
            <li>美容サロン・ヘアサロン・ネイルサロン等の経営者・スタッフ</li>
            <li>フリーランス美容師・スタイリスト</li>
            <li>18歳以上の方</li>
          </ul>
          <p>
            登録に際しては、真実・正確な情報を入力してください。虚偽情報による登録が判明した場合、当社は予告なくアカウントを停止または削除することができます。
          </p>
        </Section>

        <Section title="第3条（Cygnus IDと事業信用スコア）">
          <p style={{ marginBottom: 12 }}>
            登録時に発行されるCygnus IDは、単なる識別子にとどまらず、継続利用を通じて事業実績の証明として機能することを目指しています。具体的には以下を想定しています。
          </p>
          <ul style={{ paddingLeft: 20, marginBottom: 14 }}>
            <li>売上の安定性・成長性の可視化</li>
            <li>顧客継続率・新規集客力の記録</li>
            <li>技術・サービス提供実績の蓄積</li>
          </ul>
          <p style={{ marginBottom: 12 }}>
            当社は将来的に、ユーザーの個別同意を取得した上で、上記データの統計的・匿名化処理済みのものを金融機関・信用情報機関・フィンテック事業者等に提供し、美容師・サロン経営者が従来の信用情報だけでは困難だった資金調達・融資を受けやすくなる環境の構築を目指します。
          </p>
          <p>
            この機能の提供にあたっては、別途個別の同意フローを設けます。強制的なデータ提供は行いません。
          </p>
        </Section>

        <Section title="第4条（料金・支払い）">
          <p style={{ marginBottom: 10 }}>
            本サービスの料金はプランページに掲載のとおりです。料金は月額制とし、登録月から課金が開始されます。
          </p>
          <ul style={{ paddingLeft: 20 }}>
            <li>支払いはクレジットカードによる自動更新（Stripe経由）とします</li>
            <li>月途中の解約による日割り返金は行いません</li>
            <li>料金改定は30日前までに通知します</li>
            <li>無料トライアル期間は別途定める場合があります</li>
          </ul>
        </Section>

        <Section title="第5条（禁止事項）">
          <p style={{ marginBottom: 10 }}>ユーザーは以下の行為を行ってはなりません。</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>虚偽情報の入力・登録</li>
            <li>他のユーザーのアカウントの不正使用</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>本サービスを通じて取得した他者の個人情報の無断利用・転売</li>
            <li>本サービスのリバースエンジニアリング・解析・改変</li>
            <li>競合サービスの開発を目的とした情報収集</li>
            <li>法令または公序良俗に反する行為</li>
            <li>当社または第三者の知的財産権・名誉・プライバシーを侵害する行為</li>
          </ul>
        </Section>

        <Section title="第6条（データの取り扱いと権利）">
          <p style={{ marginBottom: 12 }}>
            ユーザーが本サービスに入力した事業データ（売上、顧客情報、施術記録等）の所有権はユーザーに帰属します。ユーザーは当社に対し、サービス提供・改善・統計分析を目的とした利用許諾を付与するものとします。
          </p>
          <p style={{ marginBottom: 12 }}>
            当社はユーザーの事業データを個人が特定できない形に加工した上で、サービス品質の向上・業界分析・ベンチマーク提供等に活用することがあります。
          </p>
          <p style={{ marginBottom: 12 }}>
            当社は将来的に、匿名化・統計化処理を施したデータを、以下に例示する第三者に対して商業目的で提供することがあります。
          </p>
          <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
            <li>金融機関・フィンテック事業者（美容師・サロン向け与信・融資判断への活用）</li>
            <li>美容材料ディーラー・メーカー（施術トレンド・商材需要の分析）</li>
            <li>人材・採用関連事業者（スタイリストのスキル・実績データの活用）</li>
            <li>その他、当社が適切と判断する事業者</li>
          </ul>
          <p style={{ marginBottom: 12 }}>
            上記の第三者提供は、特定個人が識別できないよう加工したデータのみを対象とします。個人を識別できる形でのデータ提供を行う場合は、別途個別の明示的な同意（オプトイン）を取得します。また、商業的なデータ提供への参加を希望しない場合は、サービス設定画面からいつでも拒否することができます（拒否してもサービスの利用には影響しません）。
          </p>
          <p>
            退会時にはデータのエクスポートを申請することができます（CSV形式）。エクスポート後、当社はプライバシーポリシーに定める保持期間の経過後にデータを削除します。
          </p>
        </Section>

        <Section title="第7条（知的財産権）">
          <p>
            本サービスのシステム、デザイン、ロゴ、コンテンツ等に関する知的財産権はすべて当社に帰属します。ユーザーは、本サービスの利用に必要な範囲を超えて複製・転用・二次利用することはできません。
          </p>
        </Section>

        <Section title="第8条（免責事項）">
          <ul style={{ paddingLeft: 20 }}>
            <li>当社は、本サービスの継続的な提供を努力義務とし、メンテナンス・障害・不可抗力による一時停止について損害賠償責任を負いません</li>
            <li>ユーザーが本サービスを通じて行った経営判断の結果について、当社は責任を負いません</li>
            <li>ユーザー間のトラブルについて、当社は関与する義務を負いません</li>
            <li>当社の損害賠償責任は、直近3ヶ月分の利用料金を上限とします</li>
          </ul>
        </Section>

        <Section title="第9条（退会・アカウント削除）">
          <p style={{ marginBottom: 10 }}>
            ユーザーはいつでも退会申請を行うことができます。退会後は当月末でサービスの利用が終了します。
          </p>
          <p>
            以下の場合、当社は事前通知なくアカウントを停止・削除することができます。
          </p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>本規約に違反した場合</li>
            <li>料金の未払いが継続した場合</li>
            <li>反社会的勢力であることが判明した場合</li>
            <li>その他、当社が不適切と判断した場合</li>
          </ul>
        </Section>

        <Section title="第10条（サービスの変更・終了）">
          <p>
            当社は、事業上の理由により、本サービスの内容を変更または終了することがあります。終了する場合は、可能な限り60日前までに通知します。サービス終了に伴うデータの取り扱いについては、別途案内いたします。
          </p>
        </Section>

        <Section title="第11条（規約の変更）">
          <p>
            当社は本規約を変更することがあります。重要な変更については30日前までにサービス内または登録メールアドレスへ通知します。変更後も継続して本サービスをご利用いただいた場合、変更後の規約に同意いただいたものとみなします。
          </p>
        </Section>

        <Section title="第12条（準拠法・管轄裁判所）">
          <p>
            本規約は日本法に準拠します。本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </Section>

        <Section title="お問い合わせ">
          <div style={{ padding: '16px 20px', background: S.surface, borderRadius: 4, border: `1px solid ${S.border}` }}>
            <div>屋号：Cygnus　代表：陸浦圭太</div>
            <div>メール：legal@cygnus.style</div>
          </div>
        </Section>

        <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 20, textAlign: 'center', fontFamily: S.zen, fontSize: 12, color: S.muted }}>
          © 2026 Cygnus (陸浦圭太). All rights reserved.
        </div>
      </div>
    </div>
  )
}
