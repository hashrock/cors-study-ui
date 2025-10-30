import { useState, type ChangeEvent } from 'react'
import ReactMarkdown from 'react-markdown'

import type { ExplanationMode, ExplanationSet } from '../types/simulator'
import {
  getCspNoneExplanations,
  getCspSelfExplanations,
  getCspUnsafeInlineExplanations
} from '../explanations/csp'

type ScriptSrc = 'none' | 'self' | 'unsafe-inline' | 'unsafe-eval' | 'strict-dynamic'
type SimulationStatus = 'success' | 'warning' | 'error'

type SimulationResult = {
  status: SimulationStatus
  explanations: ExplanationSet
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
      return { status: 'warning', explanations: getCspNoneExplanations() }
    }

    if (scriptSrc === 'self') {
      return { status: 'success', explanations: getCspSelfExplanations() }
    }

    if (scriptSrc === 'unsafe-inline') {
      return { status: 'warning', explanations: getCspUnsafeInlineExplanations() }
    }

    if (scriptSrc === 'unsafe-eval') {
      const explanations: ExplanationSet = {
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
        },
        scenario: { message: '実例説明', details: `(unsafe-evalの実例は割愛)` },
        javascript: { message: 'JavaScript説明', details: `(unsafe-evalのJavaScript説明は割愛)` },
        charaboy: { message: 'チャラ男説明', details: `(unsafe-evalのチャラ男説明は割愛)` }
      }

      return { status: 'error', explanations }
    }

    if (scriptSrc === 'strict-dynamic') {
      const explanations: ExplanationSet = {
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
        },
        scenario: { message: '実例説明', details: `(strict-dynamicの実例は割愛)` },
        javascript: { message: 'JavaScript説明', details: `(strict-dynamicのJavaScript説明は割愛)` },
        charaboy: { message: 'チャラ男説明', details: `(strict-dynamicのチャラ男説明は割愛)` }
      }

      return { status: 'success', explanations }
    }

    const explanations: ExplanationSet = {
      friendly: { message: 'エラー', details: '想定外の設定です。' },
      strict: { message: 'エラー', details: '未対応のケースです。' },
      scenario: { message: 'エラー', details: '想定外の設定です。' },
      javascript: { message: 'エラー', details: '想定外の設定です。' },
      charaboy: { message: 'エラー', details: '想定外の設定です。' }
    }

    return { status: 'error', explanations }
  }

  const result = simulate()
  const explanation = result.explanations[explanationMode]

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
        <button
          type="button"
          className={explanationMode === 'scenario' ? 'active' : ''}
          onClick={() => setExplanationMode('scenario')}
        >
          実例説明モード
        </button>
        <button
          type="button"
          className={explanationMode === 'javascript' ? 'active' : ''}
          onClick={() => setExplanationMode('javascript')}
        >
          JavaScript説明モード
        </button>
        <button
          type="button"
          className={explanationMode === 'charaboy' ? 'active' : ''}
          onClick={() => setExplanationMode('charaboy')}
        >
          チャラ男説明モード
        </button>
      </div>

      <div className={resultClass}>
        <div className="result-icon">{resultIcon}</div>
        <div className="result-content">
          <div className="result-message">{explanation.message}</div>
          <div className="result-details markdown-content">
            <ReactMarkdown>{explanation.details}</ReactMarkdown>
          </div>
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
