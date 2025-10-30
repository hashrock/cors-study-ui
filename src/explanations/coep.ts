import type { ExplanationSet } from '../types/simulator'

type ScenarioConfig = {
  origin: string
  target: string
  originLabel: string
  targetLabel: string
}

type ResourceType = 'script' | 'img' | 'iframe'

const resourceExamples: Record<ResourceType, { file: string }> = {
  script: { file: 'evil.js' },
  img: { file: 'ad.png' },
  iframe: { file: 'widget.html' }
}

export function getCoepUnsafeNoneExplanations(
  scenario: ScenarioConfig,
  resourceType: ResourceType
): ExplanationSet {
  const resourceExample = resourceExamples[resourceType]

  return {
    friendly: {
      message: '読み込みOKだけど注意: COEPを無効にすると守りが弱くなります',
      details: `COEP を送らない (unsafe-none) 場合、ブラウザは従来どおり外部リソースを読み込みますが、「このページはクロスオリジン隔離されていません」と記録します。その結果、SharedArrayBuffer や高精度タイマーのような機能は保護のため自動的に無効になります。

ステップバイステップ:
1. 親ページが <${resourceType}> タグで ${scenario.target} からリソースを要求します。
2. ブラウザは COEP ヘッダーが無いことを確認し、従来モード(legacy mode)で renderer を起動します。
3. リソースはそのまま描画されますが、window.crossOriginIsolated === false のため高機能 API は利用不可です。

具体例: ニュースサイト (news.com) が CDN から画像を表示する際にはこれで十分動作しますが、WebAssembly で動画処理を行いたい場合や Figma のようなアプリを作りたい場合は COEP を有効化しないと SharedArrayBuffer が使えません。`
    },
    strict: {
      message: '読み込み成功 (警告付き): COEP無効のため制限なし',
      details: `HTTPヘッダー: Cross-Origin-Embedder-Policy absent (unsafe-none 既定)

ブラウザ内部の挙動:
• renderer process は crossOriginIsolation モードに入らず、同一プロセス内で他オリジンと混在します。
• その結果、SharedArrayBuffer, Performance.now の高精度化, Atomics.wait などが自動的に封印されます。
• DevTools > Application > Security タブでは "Not isolated" と表示されます。
• Spectre などのサイドチャネルを防ぐ追加防御は有効化されません。

この状態でもリソースを描画できますが、クロスオリジン隔離を前提とした API は呼び出し時に TypeError (Requires cross-origin isolated context) を投げます。`
    },
    scenario: {
      message: '実例説明',
      details: `例1: 一般的なニュースサイトがCDNから画像を配信。COEP無しでも通常の閲覧には問題ありませんが、SharedArrayBufferを使った高度な機能は利用できません。

例2: ブログサイトが外部の広告スクリプトを読み込み。COEP無効のため、広告は表示されますが、高精度タイマーなどのAPI制限により、一部の最適化機能が使えません。

例3: ECサイトが商品画像を外部CDNから取得。買い物には支障ありませんが、WebAssemblyで3D表示などを行いたい場合はCOEP設定が必要になります。

攻撃例: Spectreのようなサイドチャネル攻撃のリスクが残ります。COEP無しでは、悪意あるスクリプトが同じプロセス内のメモリ情報を推測できる可能性があります。`
    },
    javascript: {
      message: 'JavaScript説明: COEP無効時の動作',
      details: `\`\`\`html
<!-- HTTPヘッダー: COEP無し -->
<${resourceType} src="https://${scenario.target}/${resourceExample.file}"></${resourceType}>

<script>
// SharedArrayBufferは使えない
console.log(window.crossOriginIsolated) // false
try {
  new SharedArrayBuffer(1024)
} catch (e) {
  console.error('SharedArrayBuffer使えません:', e)
}
</script>
\`\`\`

COEP無しでは高機能APIが制限されます。`
    },
    charaboy: {
      message: 'チャラ男説明: COEP無しは無防備',
      details: `**彼氏くん見てる〜？COEP無しとかセキュリティ甘々〜♪**

チャラ男くん「よっ彼氏くん！COEP設定してないから、**俺みたいな外部スクリプト（怪しい広告）が彼女ちゃん（ブラウザ）のメモリを覗き見できちゃうかも**〜。Spectreとか使えばね♡」

彼女ちゃん「え…？メモリって覗かれちゃうの…？」

彼氏くん「まずい…COEP無しだと、同じプロセスで動いてる他のコードが見えてしまう可能性がある！」

チャラ男くん「SharedArrayBufferとか高精度タイマーは使えないけど、**サイドチャネル攻撃で彼女ちゃんの秘密（機密データ）を推測できるかもね〜**。でも彼氏くんがCOEP設定してくれたら、俺は別プロセスに隔離されちゃうんだよなぁ…残念♡ じゃーね〜」

彼氏くん「**COEP設定して、クロスオリジン隔離しないと！**」`
    }
  }
}

export function getCoepCorpNoneExplanations(
  scenario: ScenarioConfig
): ExplanationSet {
  return {
    friendly: {
      message: 'ブロック: サーバー側が「共有OK」を明示していません',
      details: `COEP: require-corp を宣言すると、親ページは「外部リソースもセキュリティ契約に同意してね」とブラウザに指示します。ところが ${scenario.target} から返ってきたレスポンスに Cross-Origin-Resource-Policy (CORP) ヘッダーが無かったため、ブラウザは描画前にロードを止めました。

ブラウザの流れ:
1. 親ページ (https://${scenario.origin}) が HTTP ヘッダーで COEP: require-corp を送出。
2. ブラウザが埋め込みリソースを取得し、レスポンスヘッダーに CORP を探します。
3. 見つからなかったので「安全とは証明されていない」と判断し、コンソールに "The resource has been blocked due to a disallowed Cross-Origin-Resource-Policy" を記録しつつリソースを破棄します。

具体例: 銀行サイトがリアルタイムチャート描画のために SharedArrayBuffer + WebAssembly を使いたくなり COEP を有効化したところ、広告配信サーバーのスクリプトが CORP を返していなかったため、ブラウザが広告の読み込みをブロックしました。結果的に外部スクリプトから機密データが覗かれるリスクを防げます。`
    },
    strict: {
      message: 'ブロック: Cross-Origin-Resource-Policyヘッダーがありません',
      details: `HTTP要求:
• Request Mode: "cors-with-forced-preflight"
• Embedder Policy: require-corp

ブラウザ内部の挙動:
1. COEP enforcement ステップで、レスポンスヘッダーを走査して Cross-Origin-Resource-Policy を取得しようとします。
2. ヘッダーが absent の場合、network stack は FetchResponse の状態を "blocked" に変更し、renderer へ空レスポンス (status 0) を返します。
3. DevTools の Console には "Blocked by Cross-Origin-Embedder-Policy" が赤文字で表示され、Network パネルでは (blocked:other) と記録されます。

結果として DOM にスクリプト/画像は挿入されず、window.crossOriginIsolated は true のまま維持されます。`
    },
    scenario: {
      message: '実例説明',
      details: `例1: 金融機関サイトがCOEPを有効化して高速チャート表示を実装。外部広告サーバーがCORP未設定だったため広告がブロックされ、広告収益は減ったが、セキュリティは大幅に向上。

例2: WebAssembly採用のオンライン画像編集サイトがCOEP設定。外部CDNの画像がCORP無しでブロックされ、CDN側に設定追加を依頼して解決。

例3: ゲーム配信サイトがSharedArrayBufferを使用したくてCOEP導入。サードパーティのチャットウィジェットがCORP未対応でブロック。ウィジェット提供元に対応を求めるか、別のウィジェットに変更。

攻撃例（防御成功）: チャラ男くん（怪しいスクリプト）がCORP無しで読み込まれようとするが、COEP設定により彼女ちゃん（ブラウザ）の部屋（プロセス）への侵入を阻止。機密情報へのアクセスを防げます。`
    },
    javascript: {
      message: 'JavaScript説明: CORP無しでブロック',
      details: `\`\`\`http
<!-- 親ページのHTTPヘッダー -->
Cross-Origin-Embedder-Policy: require-corp

<!-- 外部リソースのレスポンス -->
HTTP/1.1 200 OK
Content-Type: application/javascript
<!-- ❌ CORP ヘッダーが無いためブロック -->
\`\`\`

\`\`\`javascript
// コンソールエラー
// Blocked by Cross-Origin-Embedder-Policy

console.log(window.crossOriginIsolated) // true (維持される)
\`\`\`

CORPヘッダーを追加すれば読み込めるようになります。`
    },
    charaboy: {
      message: 'チャラ男説明: CORP無しで門前払い',
      details: `**彼氏くん見てる〜？COEP設定されて入れなくなったわ〜**

チャラ男くん「ちっ…彼氏くんが \`COEP: require-corp\` 設定しやがって。**俺（外部スクリプト）はCORPヘッダー持ってないから、彼女ちゃん（ブラウザ）の部屋に入れてもらえないんだわ**〜」

彼女ちゃん「え…？チャラ男くんが入ってこようとしてたの…？」

彼氏くん「そうだ。**COEP設定したから、ちゃんとCORPヘッダーで身元証明できるリソースしか入れない**。彼女を守れる」

チャラ男くん「くっそ〜。**もし彼氏くんがCOEP無効にしてたら、俺も同じプロセスで動いて、彼女ちゃんのメモリ覗けたのに**…。SharedArrayBuffer使いたいからって、セキュリティ強化しちゃうとか、マジ固いわ〜。じゃーね〜」

彼女ちゃん「COEP設定すると…守られるの…？」

彼氏くん「ああ。**信頼できるリソースだけを読み込んで、クロスオリジン隔離できる**んだ」`
    }
  }
}

export function getCoepCorpSameOriginExplanations(
  scenario: ScenarioConfig
): ExplanationSet {
  return {
    friendly: {
      message: 'ブロック: 「同一オリジン専用」の設定なので拒否されました',
      details: `リソース提供側が Cross-Origin-Resource-Policy: same-origin を返しているため、「同じオリジン以外は読み込ませないで」と宣言しています。親ページは ${scenario.origin}、リソースは ${scenario.target} と別オリジンなので、ブラウザはロードを止めました。

ステップ:
1. 親ページが require-corp を宣言し、リソースのレスポンスに CORP: same-origin が付与されています。
2. ブラウザは「リクエスト元 (${scenario.origin}) とレスポンスオリジン (${scenario.target}) が一致しない」ことを検知し、CORP の条件違反としてリソースをブロック。
3. コンソールには "Cross-Origin-Resource-Policy: same-origin" によるブロックが表示されます。

解決するには、共有しても安全と判断できる場合に限り CORP: cross-origin へ更新します。`
    },
    strict: {
      message: 'ブロック: Cross-Origin-Resource-Policy: same-origin は別オリジンを拒否',
      details: `仕様: https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header

検証手順:
• request origin = ${scenario.origin}
• resource origin = ${scenario.target}
• CORP header = same-origin

Fetch アルゴリズムは CORP を評価し、same-origin の場合には request origin !== resource origin であれば network error を投げます。結果として Response.type は "error" になり、HTML parser もリソース挿入を停止します。COEP による隔離状態は維持されます。`
    },
    scenario: {
      message: '実例説明',
      details: `例1: 社内システム (intranet.company.com) が外部APIサーバー (api.external.com) からデータ取得を試みたが、API側がCORP: same-originを設定していたためブロック。API提供元と交渉してcross-originに変更。

例2: マルチドメイン構成のサービスで、メインサイト (service.com) がAPIドメイン (api.service.com) のリソースを読み込もうとしたが、CORP: same-originでブロック。サブドメインでもオリジンが異なるため失敗。

例3: CDN (cdn.example.com) がセキュリティのためCORP: same-originを設定。利用サイト (mysite.com) からの画像読み込みが全てブロックされ、CDN設定の見直しが必要に。

攻撃例（防御成功）: チャラ男くん（悪意あるサイト evil.com）が彼女ちゃん（ブラウザ）を使って、保護されたAPI (secure-api.com) のデータを盗もうとするが、CORP: same-originで守られているため失敗。`
    },
    javascript: {
      message: 'JavaScript説明: same-originによるブロック',
      details: `\`\`\`http
<!-- リソースのレスポンスヘッダー -->
HTTP/1.1 200 OK
Cross-Origin-Resource-Policy: same-origin
<!-- ❌ 親ページが別オリジンなので block -->
\`\`\`

\`\`\`javascript
// ${scenario.origin} から ${scenario.target} へのリクエスト
// コンソールエラー:
// Blocked by Cross-Origin-Resource-Policy: same-origin

// 解決策: CORP を cross-origin に変更
\`\`\`

same-originは同じオリジンからのアクセスのみ許可します。`
    },
    charaboy: {
      message: 'チャラ男説明: same-originで完全ガード',
      details: `**彼氏くん見てる〜？same-originとか固すぎ！**

チャラ男くん「いやぁ〜、リソース側が \`CORP: same-origin\` 設定してるから、**俺（別オリジンからのリクエスト）は完全に締め出されたわ**〜。同じオリジンからしか読み込めないとか、ガチガチすぎるだろ」

彼女ちゃん「same-originって…？」

彼氏くん「**同じオリジンからのアクセスしか許可しない**設定だ。サブドメインが違っても別オリジン扱いだから、めちゃくちゃ厳しい」

チャラ男くん「くっそ〜。**彼女ちゃんのブラウザ経由でそのリソース見ようと思ったのに**、same-originで完全ブロックかよ。せめて \`cross-origin\` にしてくれれば、俺も覗けたのになぁ〜♡」

彼女ちゃん「守られてる…の…？」

彼氏くん「ああ。**機密性の高いAPIやデータはsame-originで守るのが鉄則**だ」

チャラ男くん「チッ…**今回は無理だけど、設定ミスってcross-originにしちゃったら、その瞬間にデータもらっちゃうからな**〜♡ じゃーね〜」`
    }
  }
}

export function getCoepCorpCrossOriginExplanations(
  _scenario: ScenarioConfig
): ExplanationSet {
  return {
    friendly: {
      message: '成功: CORPヘッダーがあるので安全に読み込めました',
      details: `COEP: require-corp (親) + CORP: cross-origin (子) の組み合わせにより、ブラウザは「双方で合意済み」と判断してリソースを描画します。これでページは crossOriginIsolated === true のまま外部リソースを使えます。

ステップ:
1. 親ページが COEP: require-corp を送信。
2. リソースレスポンスに Cross-Origin-Resource-Policy: cross-origin が含まれていることをブラウザが確認。
3. 結果として DOM にリソースが挿入され、SharedArrayBuffer や WebAssembly などの高機能 API も継続利用できます。

具体例: Web アプリ (https://myapp.com) が Google Fonts (fonts.googleapis.com) からフォントを読み込み、同時に WebAssembly で画像処理を行うケース。Google Fonts は CORP: cross-origin を付与しているため、COEP を有効化してもフォントが正常に読み込まれます。`
    },
    strict: {
      message: '読み込み成功: CORPヘッダーが要件を満たしています',
      details: `Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin

ブラウザ内部では CORP チェックが pass し、fetch response オブジェクトの type = "cors" で renderer に配信されます。crossOriginIsolated フラグが true のまま維持されるため、SharedArrayBuffer、Atomics、AudioWorklet などの高機能 API が解禁されます。DevTools の Security パネルにも "Isolated" と表示されます。`
    },
    scenario: {
      message: '実例説明',
      details: `例1: オンライン画像編集サービスがWebAssemblyで高速処理を実現。COEP設定し、CDN側もCORP: cross-originで対応。SharedArrayBufferを使った並列処理が可能に。

例2: 3Dモデリングサイトが外部ライブラリとフォントを使用。全てのリソースがCORP: cross-originを返すため、COEP有効化後も問題なく動作。

例3: ビデオ会議アプリがSharedArrayBufferで音声処理。外部のアイコンCDNやフォントCDNが全てCORP対応しているため、スムーズに実装完了。

攻撃例（適切な設定）: チャラ男くん（外部リソース）でも、CORP: cross-originで「共有OK」と明示されていれば読み込まれます。ただし、COEP設定によりプロセス隔離されているため、他のデータへのアクセスは防がれます。セキュリティと機能性のバランスが取れた状態です。`
    },
    javascript: {
      message: 'JavaScript説明: 正しく許可されたリソース読み込み',
      details: `\`\`\`http
<!-- 親ページのHTTPヘッダー -->
Cross-Origin-Embedder-Policy: require-corp

<!-- リソースのレスポンスヘッダー -->
HTTP/2 200 OK
Cross-Origin-Resource-Policy: cross-origin
\`\`\`

\`\`\`javascript
// 正常に読み込まれる
console.log(window.crossOriginIsolated) // true

// SharedArrayBufferが使える！
const sab = new SharedArrayBuffer(1024)
console.log('SharedArrayBuffer作成成功:', sab)

// 高精度タイマーも使える
console.log(performance.now()) // 高精度
\`\`\`

COEP + CORP の組み合わせで安全に高機能APIを利用できます。`
    },
    charaboy: {
      message: 'チャラ男説明: 適切な設定で共存',
      details: `**彼氏くん見てる〜？今回は正当な方法で入ったよ〜**

チャラ男くん「いやぁ〜彼氏くん、**俺（外部リソース）もちゃんとCORP: cross-origin持ってきたから、彼女ちゃん（ブラウザ）に受け入れてもらえたわ**〜。COEP: require-corpの要件満たしてるからね♪」

彼女ちゃん「え…？でも入ってきて大丈夫なの…？」

彼氏くん「ああ。**CORPヘッダーで「共有していいよ」って明示してるから**、正当なリソースとして扱える。でも、**プロセス隔離はされてるから、他のデータには触れない**」

チャラ男くん「そうそう♪ 俺は正規のフォントとかライブラリだから、**ちゃんと身元証明（CORP）持ってるんだよね**〜。でもさ、**プロセス分離されてるから、彼女ちゃんの機密データには手が出せないんだわ**。残念〜」

彼女ちゃん「プロセス分離…？」

彼氏くん「**別の部屋に隔離されてるようなもの**だ。必要なリソースは使えるけど、機密情報には触れさせない」

チャラ男くん「**彼氏くん、COEP設定マジ固いけど、正しい設定だわ**。SharedArrayBufferとか高機能API使えて便利だもんな〜。じゃ、ちゃんと仕事してくるわ〜♪」`
    }
  }
}
