import type { ExplanationSet } from '../types/simulator'

export function getSameOriginExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '成功: 同一オリジンなのでCORSチェックは行われません',
      details: `ステップバイステップ:
1. ブラウザはリクエスト元とリクエスト先のスキーム・ホスト・ポートを照合します。
2. すべて一致した瞬間に "CORS 判定は不要" と判断し、そのままレスポンス処理へ移行。
3. Access-Control-Allow-Origin ヘッダーが無くても問題ありません。

具体例: https://myapp.com のダッシュボードが https://myapp.com/api/data を呼び出すとき、Network パネルには 1 本の GET だけが表示され、CORS エラーは一切出ません。保存済み Cookie や Bearer トークンも自動送信されます。`
    },
    strict: {
      message: '成功: CORS仕様では同一オリジンは検証不要',
      details: `仕様: Same-Origin Policy / Fetch Standard §3.2
https://fetch.spec.whatwg.org/#origin

ブラウザ内部:
• Fetch アルゴリズムが request origin と response origin を比較し、一致したら "same-origin" として処理。
• プリフライト OPTIONS は発生せず、本リクエストのみ送出。
• Network Service が受信したレスポンスはそのままレンダラーへ転送され、Response.type は "basic" のまま。
• DevTools の CORS 列は空欄で、Allowed Origins ログも生成されません。

判定例:
• OK: https://myapp.com → https://myapp.com (既定ポート)
• NG: https://myapp.com → https://myapp.com:8443 (ポート不一致)
• NG: https://myapp.com → http://myapp.com (スキーム不一致)`
    },
    scenario: {
      message: '実例説明',
      details: `例1: 社内ポータル (https://myapp.com) から同じホストの /api/data を叩いて、社員のタスク状況を読み込むケース。VPN 内の同じサーバーなので管理者は特に設定せずに動作します。

例2: ECサイト (https://shop.com) のカート画面から同じドメインの /api/cart へ商品データを送信。ログイン済みCookieも自動で送られ、特別な設定なしでユーザー情報を取得できます。

例3: 管理画面 (https://admin.myapp.com/dashboard) が同じオリジンの /api/stats を呼び出して統計データを表示。同一オリジンなのでプリフライトも発生せず、即座にデータが返ってきます。

攻撃例: 同一オリジンでもXSS脆弱性があれば危険です。攻撃者が掲示板にスクリプトを仕込み、他のユーザーがそのページを開くと fetch('https://myapp.com/api/admin/delete-all-users', {method: 'POST'}) が実行され、管理者権限で全ユーザー削除が可能。CORSは同一オリジン内の攻撃は防げません。`
    },
    javascript: {
      message: 'JavaScript説明: 擬似コードで見る同一オリジン',
      details: `\`\`\`js
const res = await fetch('https://myapp.com/api/data')
console.log(res.type) // "basic"
const payload = await res.json()
renderDashboard(payload)
\`\`\`
ブラウザは CORS 検証ロジックを呼び出さず、body へフルアクセスできます。`
    },
    charaboy: {
      message: 'チャラ男説明: XSS脆弱性で侵入成功',
      details: `**彼氏くん見てる〜？チャラ男だよ〜♪ 今から彼女ちゃんといいことしちゃうかも〜**

チャラ男くん「よぉ彼氏くん！ \`同一オリジン\` って二人きりの密室だと思ってるだろ？甘いぜ〜。XSS脆弱性（壊れた鍵穴）見つけちゃったからさ、**俺も部屋に入れちゃうんだわ**」

彼女ちゃん「あれ…？チャラ男くんがいつの間に部屋に…？彼氏くんは…？」

彼氏くん「**おい待て！勝手に入ってくるな！**」

チャラ男くん「いやぁ〜彼女ちゃん、可愛いね〜♡ **個人情報も Cookie も全部見えちゃってるよ？** あ、\`fetch('https://myapp.com/api/admin/delete', {method: 'POST'})\` とか勝手に実行しちゃおっかな〜。**彼女ちゃんの権限で何でもできちゃう**んだよね〜」

彼女ちゃん「え…わたしの名前で勝手なこと…？」

彼氏くん「くそ…CORSは同一オリジン内の攻撃は防げない…！**XSS対策（入力検証）ちゃんとしないと彼女が危ない！**」

チャラ男くん「**彼氏くん、見てるだけ〜？** 鍵（セキュリティ）壊れてたら、彼女ちゃん守れないよ〜ん♪」`
    }
  }
}

export function getCorsBlockedExplanations(domainConfig: { origin: string; target: string }, domainRelation: string): ExplanationSet {
  return {
    friendly: {
      message: 'ブラウザがストップ: サーバーが「OK」を言い忘れています',
      details: `${domainConfig.origin} から ${domainConfig.target} への ${domainRelation === 'subdomain' || domainRelation === 'same-site' ? 'サブドメイン間リクエスト' : 'クロスオリジンリクエスト'} を試みましたが、サーバーが「どのオリジンに渡して良いか」を示さなかったため、ブラウザは安全のため JavaScript にレスポンスを渡しません。

ブラウザの流れ:
1. HTTP 本リクエストを送信し、レスポンスヘッダーをチェック。
2. Access-Control-Allow-Origin が見つからず、Chromium 系ブラウザはレスポンスを "opaque" として封印。
3. fetch を await すると Response.ok は false、body は空。コンソールには "Blocked by CORS policy" が表示されます。

具体例: 天気アプリ (https://myapp.com) が https://weather-api.com の CORS 設定漏れに遭遇すると、画面が真っ白になり開発者ツールに赤いエラーが残ります。`
    },
    strict: {
      message: 'ブロック: Access-Control-Allow-Originヘッダーがありません',
      details: `仕様: Fetch Standard CORS 検証
https://fetch.spec.whatwg.org/#http-cors-protocol

ブラウザ内部:
• Network Service がレスポンスヘッダーを検査し、Allow-Origin 欠落を検知した時点で CORS エラーを記録。
• レンダラープロセスにはステータス行のみ渡り、body は "blocked by CORB/CORS" として破棄。
• Response.type は "opaque"、status は 0。
• プリフライトが返ってきても本リクエストでヘッダーが無いと最終的に失敗します。

検証ポイント:
• Request Origin: ${domainConfig.origin}
• Target: ${domainConfig.target}
• 同一サイト? ${domainRelation === 'same-site' || domainRelation === 'subdomain' ? 'Yes (でも別オリジンなのでCORS必須)' : 'No (完全に別オリジン)'}
Access-Control-Allow-Origin が付与されるまで JavaScript からレスポンスは読めません。`
    },
    scenario: {
      message: '実例説明',
      details: `例1: 自社サイト (https://myapp.com) が天気ベンダー https://weather-api.com の REST API を叩いたが、先方が Allow-Origin を設定し忘れていたケース。営業日終盤に突然データが消え、原因調査で CORS エラーに気付く…という典型的な事故です。

例2: フロントエンド (https://frontend.com) が新しく立ち上げたバックエンド (https://api.backend.com) へアクセスしたところ、バックエンドチームがCORS設定を忘れていたため本番リリース直後にエラー発生。急遽修正対応に追われます。

例3: 外部決済API (https://payment-gateway.com) を組み込んだ際、テスト環境では動いていたのに本番で突然ブロック。APIプロバイダーに問い合わせたところ、本番ドメインのホワイトリスト登録が漏れていました。

攻撃例（防御成功）: 悪意あるサイト (https://evil.com) が被害者ブラウザから銀行API (https://bank.com/api/transfer) へ送金リクエストを試みますが、銀行サーバーがCORSヘッダーを返さないためブラウザがブロック。攻撃者はレスポンスを読めず、不正送金は防止されます。CORSはこのような攻撃からユーザーを守ります。`
    },
    javascript: {
      message: 'JavaScript説明: エラーになるfetch',
      details: `\`\`\`js
try {
  const res = await fetch('${domainConfig.target}/forecast')
  await res.json() // ← CORS遮断で例外
} catch (err) {
  console.error('CORSエラー', err)
}
\`\`\`
Response.status は 0 になり、body を読む前に失敗します。`
    },
    charaboy: {
      message: 'チャラ男説明: CORSに邪魔された…',
      details: `**彼氏くん見てる〜？今から彼女ちゃん連れ出そうと思ったのに〜**

チャラ男くん「よっ彼氏くん！俺んちの evil.com でパーティーやっててさ、**彼女ちゃんをお誘いしちゃったわけ**。\`fetch('https://bank.com/api/balance')\` で彼女ちゃんの銀行残高データとか、こっそり見ようと思って〜♡」

彼女ちゃん「え…？わたし、データ渡しちゃうの…？」

彼氏くん「**待て待て！それ完全に情報盗もうとしてるだろ！**」

チャラ男くん「ところがさぁ〜、**ブラウザくん（門番）が超うざくてさ**。『Allow-Origin ヘッダーないから渡さねぇ！』って。**彼女ちゃんのデータ、俺に見せてくれないんだわ〜** チッ…」

彼女ちゃん「ブラウザさんが守ってくれたの…？」

彼氏くん「ああ…CORS のおかげで彼女のデータが守られた。**サーバーが Allow-Origin 設定してなくて逆に助かった…**」

チャラ男くん「くっそ〜、**今回は失敗だけど、彼氏くんがヘマして Allow-Origin: * とか設定したら、次は彼女ちゃんもらっちゃうからな〜♪** じゃーね〜」`
    }
  }
}

export function getCredentialsWildcardExplanations(domainConfig: { origin: string }): ExplanationSet {
  return {
    friendly: {
      message: 'ブラウザがストップ: Cookie付きリクエストに「*」は使えません',
      details: `credentials を include にすると「認証情報付き」と判断され、"誰でもOK" を意味する * とは両立しません。

ブラウザの流れ:
1. fetch が Cookie や Authorization ヘッダーを同梱してリクエスト送信。
2. レスポンス検証で Access-Control-Allow-Origin: * を検知した瞬間にエラー扱い。
3. コンソールに "must not be '*' when the request's credentials mode is 'include'" が表示され、レスポンス body は遮断されます。

具体例: ログイン中のショッピングサイト (https://myapp.com) が https://api.myapp.com/cart を呼び出し、セッショントークン付きでアクセス。API が Allow-Origin: * を返してしまうと、攻撃者サイトにも同じレスポンスが渡る恐れがあるためブラウザが止めます。`
    },
    strict: {
      message: 'ブロック: credentialsモードでワイルドカード(*)は使えません',
      details: `仕様: Fetch Standard CORS credentials ルール
https://fetch.spec.whatwg.org/#cors-protocol-and-credentials

ブラウザ内部:
• credentials mode = "include" のとき、レスポンス検証で Allow-Origin が "*" だと失敗扱い。
• Access-Control-Allow-Credentials: true があっても * とはセットにできません。
• Response.type は "opaque"、status は 0。DevTools には 200 のように見えても、CORS 列に赤いアイコンが表示されます。

回避策:
• Allow-Origin を ${domainConfig.origin} のように具体的なオリジンへ変更。
• 併せて Access-Control-Allow-Credentials: true を返却。
• Vary: Origin を付与してキャッシュを分離するのが推奨です。`
    },
    scenario: {
      message: '実例説明',
      details: `例1: 会員制 EC (https://myapp.com) が api.myapp.com/cart を呼び出すが、開発者がテスト用に Allow-Origin: * を置きっぱなしにしていたケース。include モードのため本番環境で突然 CORS エラーが爆発し、急遽ヘッダー修正に追われます。

例2: SaaS管理画面 (https://admin.saas.com) が認証付きで api.saas.com へアクセス。初期設定で * を使っていたため、credentials: include を追加した途端にエラー発生。オリジンを明示的に指定する必要があります。

例3: ログイン済みユーザーのプロフィール取得 (https://myapp.com → https://api.myapp.com/profile) で、バックエンドが便利だからと * を返していたケース。セキュリティ監査で指摘され、緊急で特定オリジンへの変更対応が必要になりました。

攻撃例（防御成功）: もし Allow-Origin: * と credentials: include が許可されたら、悪意あるサイト (https://evil.com) が被害者のログインCookieを使って銀行API (https://bank.com/api/balance) から残高情報を盗み出せてしまいます。ブラウザがこの組み合わせを拒否することで、認証情報の漏洩を防いでいます。`
    },
    javascript: {
      message: 'JavaScript説明: include + * の擬似コード',
      details: `\`\`\`js
const res = await fetch('${domainConfig.origin}/cart', {
  credentials: 'include'
})
console.log(res.type) // "opaque"
console.log(res.status) // 0
// body を読もうとすると TypeError になる
\`\`\`
Allow-Origin を具体化するまでデータは取得できません。`
    },
    charaboy: {
      message: 'チャラ男説明: あと一歩で彼女の秘密が…',
      details: `**彼氏くん見てる〜？彼女ちゃんの秘密、全部いただこうと思ったのに〜**

チャラ男くん「いやぁ〜彼氏くん、惜しかったわ〜！彼女ちゃんがログイン Cookie 持ったまま俺んとこ（evil.com）に来てくれてさ、**\`credentials: include\` で銀行 API 叩かせようと思ったんだよね〜♡ 残高とか履歴とか全部見えちゃう予定だったのに**」

彼女ちゃん「え…？わたしの銀行の情報が…？」

彼氏くん「**おい！完全に不正アクセスじゃねーか！**」

チャラ男くん「ところがさぁ、サーバーが \`Allow-Origin: *\` って設定しちゃっててさ。**ブラウザくんが『credentials と * の組み合わせはダメ！』って拒否しやがった**…チッ。**あと一歩で彼女ちゃんの秘密、全部もらえたのに〜**」

彼女ちゃん「ブラウザさんが…守ってくれたの…？」

彼氏くん「危なかった…もし Allow-Origin が具体的な値だったら、彼女の認証情報が漏れてた…」

チャラ男くん「**彼氏くん、次はもっと甘い設定してくれよな〜♪** \`Allow-Origin: https://evil.com\` と \`Allow-Credentials: true\` のコンボ待ってるぜ〜。**そしたら彼女ちゃん、完全にいただくから**♡ じゃーね〜」`
    }
  }
}

export function getCorsSuccessExplanations(
  domainConfig: { origin: string; target: string },
  allowOriginDisplay: string,
  credentials: string,
  method: string
): ExplanationSet {
  return {
    friendly: {
      message: '成功: サーバーが許可したのでデータを受け取れました',
      details: `ブラウザとサーバーが以下の手順で握手しました。
1. ${method === 'POST' ? 'OPTIONS プリフライトで利用可能なメソッド・ヘッダーを確認。' : 'シンプルリクエスト (GET) として直接送信。'}
2. 本リクエストに対し、サーバーが Access-Control-Allow-Origin: ${allowOriginDisplay} を返却。
3. ブラウザはレスポンスヘッダーを検証し、「このアプリからのアクセスは許可済み」と判断して JavaScript へデータを渡します。

具体例: 天気アプリ (https://myapp.com) が https://weather-api.com へアクセスし、Allow-Origin: https://myapp.com と Allow-Credentials: ${credentials === 'include' ? 'true' : '不要'} が返ったので、画面に最新の気温が表示されました。`
    },
    strict: {
      message: '成功: CORSチェックを通過しました',
      details: `ブラウザ内部ログ:
• Request Origin = ${domainConfig.origin}
• Access-Control-Allow-Origin = ${allowOriginDisplay}
• credentials mode = ${credentials}
• Access-Control-Allow-Credentials = ${credentials === 'include' ? 'true (想定)' : 'not required'}
• Vary: Origin を確認し、キャッシュ汚染を防止。

Fetch アルゴリズムはプリフライト結果をキャッシュし、検証成功後は Response.type = "cors" のストリームを JavaScript に公開します。DevTools Network の CORS 列は緑色で「Allowed」と表示されます。`
    },
    scenario: {
      message: '実例説明',
      details: `例1: 社内天気ウィジェット (https://myapp.com) が気象ベンダー https://weather-api.com/data を叩き、相手サーバーが適切な Allow-Origin と Allow-Credentials を返したため、利用者に気温と降水確率を届けられたパターンです。

例2: マップアプリ (https://maps.myapp.com) が地図タイルサーバー (https://tiles.geo-api.com) から画像を取得。サーバー側で Allow-Origin: https://maps.myapp.com を設定済みなので、地図がスムーズに表示されます。

例3: 社内ダッシュボード (https://dashboard.company.com) が分析API (https://analytics-api.company.com) へアクセス。サブドメイン間の通信ですが、APIサーバーが適切にCORSヘッダーを返しているため、リアルタイムデータが正常に取得できています。

攻撃例（設定ミス）: 公開API (https://api.service.com) が Allow-Origin: * を返しているため、悪意あるサイト (https://evil.com) からもアクセス可能。攻撃者は被害者のブラウザを踏み台にしてAPIレート制限を消費させたり、公開データを大量取得してサービス妨害を引き起こせます。認証が必要なエンドポイントは * を避けるべきです。`
    },
    javascript: {
      message: 'JavaScript説明: 正しく許可されたfetch',
      details: `\`\`\`js
const response = await fetch('${domainConfig.target}/data', {
  method: '${method}',
  credentials: '${credentials}'
})
if (!response.ok) throw new Error('CORS failed')
const json = await response.json()
renderWeather(json)
\`\`\`
Response.type は "cors" になり、body を自由に扱えます。`
    },
    charaboy: {
      message: 'チャラ男説明: 今回は諦めるけど…',
      details: `**彼氏くん見てる〜？今回は手が出せなかったわ〜**

チャラ男くん「ちっ…彼氏くん、今回の設定マジで固いじゃん。Allow-Origin が \`${allowOriginDisplay}\` でピンポイント指定されてるから、**俺の evil.com からは彼女ちゃんに触れないわ〜**」

彼女ちゃん「え…？チャラ男くんが何か企んでたの…？」

彼氏くん「当たり前だ。お前みたいな奴から彼女を守るために設定してるんだよ」

チャラ男くん「くっそ〜。**もしこれが Allow-Origin: * だったらなぁ〜**。俺んとこ（evil.com）からも彼女ちゃんのブラウザ経由で API 叩き放題だったのに。**彼女ちゃんのデータ、好き放題見れたのに〜** レート制限も食いつぶして、彼女ちゃん困らせちゃうこともできたのに♡」

彼女ちゃん「こ、怖い…」

彼氏くん「だから * は絶対使わないって決めてる。特に認証が必要な API では」

チャラ男くん「チッ…**彼氏くん、今回は負けを認めるわ。** でもな、**ちょっとでも設定ミスったら、その瞬間に彼女ちゃん、俺がいただくからな**。XSS脆弱性でも、CSRF でも、何でもいい。**隙を見せたら、彼女ちゃん連れてっちゃうぜ〜♡** じゃーね〜」`
    }
  }
}
