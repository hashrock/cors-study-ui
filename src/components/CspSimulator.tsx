import { useState, type ChangeEvent } from 'react'

type ExplanationMode = 'friendly' | 'strict'
type ScriptSrc = 'none' | 'self' | 'unsafe-inline' | 'unsafe-eval' | 'strict-dynamic'
type ResourceType = 'script' | 'style' | 'img'
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

const resourceExamples = {
  script: {
    internal: '<script>alert("Hello")</script>',
    external: '<script src="https://cdn.example.com/lib.js"></script>',
    inline: '<button onclick="doSomething()">Click</button>',
    eval: 'eval("malicious code")'
  },
  style: {
    internal: '<style>body { color: red; }</style>',
    external: '<link href="https://cdn.example.com/style.css">',
    inline: '<div style="color: red">Text</div>'
  },
  img: {
    internal: '<img src="/local-image.png">',
    external: '<img src="https://example.com/image.png">'
  }
}

export function CspSimulator() {
  const [scriptSrc, setScriptSrc] = useState<ScriptSrc>('none')
  const [resourceType, setResourceType] = useState<ResourceType>('script')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('friendly')

  const handleScriptSrcChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'none' || value === 'self' || value === 'unsafe-inline' || value === 'unsafe-eval' || value === 'strict-dynamic') {
      setScriptSrc(value)
    }
  }

  const handleResourceTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'script' || value === 'style' || value === 'img') {
      setResourceType(value)
    }
  }

  const simulate = (): SimulationResult => {
    if (scriptSrc === 'none') {
      return {
        status: 'error',
        friendly: {
          message: 'ブロック: CSPが設定されていないため、すべてのリソースが読み込まれます',
          details:
            'Content-Security-Policyヘッダーがない場合、インラインスクリプト、外部スクリプト、eval()など、すべてが実行されます。\nXSS攻撃に対して無防備な状態です。'
        },
        strict: {
          message: 'セキュリティリスク: CSP未設定',
          details:
            '仕様: Content-Security-Policyヘッダーが存在しない場合、ブラウザはすべてのリソースを許可します。\nhttps://www.w3.org/TR/CSP3/\n\nリスク: 攻撃者がインラインスクリプトやeval()を使ったXSS攻撃を実行可能です。'
        }
      }
    }

    if (scriptSrc === 'self') {
      return {
        status: 'success',
        friendly: {
          message: '成功: 同一オリジンのスクリプトのみ許可',
          details:
            "script-src 'self' を設定すると、同じオリジンからのスクリプトのみが実行されます。\nインラインスクリプトやeval()、外部CDNのスクリプトはブロックされます。"
        },
        strict: {
          message: 'CSP有効: 同一オリジンのみ許可',
          details:
            `仕様: script-src 'self' は、同一オリジンからのスクリプトリソースのみを許可します。\nhttps://www.w3.org/TR/CSP3/#directive-script-src\n\n効果:\n• 同一オリジンのスクリプトファイル: ✓ 許可\n• インラインスクリプト (<script>): ✗ ブロック\n• eval(), new Function(): ✗ ブロック\n• 外部CDN (https://cdn.example.com): ✗ ブロック`
        }
      }
    }

    if (scriptSrc === 'unsafe-inline') {
      return {
        status: 'warning',
        friendly: {
          message: '警告: インラインスクリプトを許可（推奨されません）',
          details:
            "script-src 'unsafe-inline' を設定すると、HTML内のインラインスクリプトが実行されます。\nXSS攻撃のリスクが高まるため、本番環境では避けるべきです。"
        },
        strict: {
          message: 'CSP弱体化: unsafe-inlineは非推奨',
          details:
            `仕様: 'unsafe-inline' キーワードは、インラインスクリプト、イベントハンドラ、javascript: URIを許可します。\nhttps://www.w3.org/TR/CSP3/#unsafe-inline\n\nW3C警告: "The 'unsafe-inline' keyword is a significant security risk, as it allows the execution of inline scripts and event handlers."\n\n影響:\n• <script>alert('XSS')</script>: ✓ 実行される\n• <button onclick="...">: ✓ 実行される\n• eval(): ✗ 依然としてブロック（unsafe-evalが必要）`
        }
      }
    }

    if (scriptSrc === 'unsafe-eval') {
      return {
        status: 'error',
        friendly: {
          message: '危険: eval()を許可（極めて危険）',
          details:
            "script-src 'unsafe-eval' を設定すると、eval()やnew Function()が使えるようになります。\n文字列をコードとして実行できるため、XSS攻撃のリスクが極めて高くなります。"
        },
        strict: {
          message: 'セキュリティリスク: unsafe-evalは危険',
          details:
            `仕様: 'unsafe-eval' キーワードは、eval()、new Function()、setTimeout(string)などのテキストからJavaScriptへの変換を許可します。\nhttps://www.w3.org/TR/CSP3/#unsafe-eval\n\nW3C警告: "The 'unsafe-eval' keyword is a significant security risk."\n\n攻撃例:\n• eval(userInput): ユーザー入力を直接実行\n• new Function(attackerCode): 攻撃者のコードを実行\n• setTimeout("alert('XSS')", 0): 文字列を実行\n\nこれらはすべてXSS攻撃に悪用される可能性があります。`
        }
      }
    }

    if (scriptSrc === 'strict-dynamic') {
      return {
        status: 'success',
        friendly: {
          message: '推奨: strict-dynamic で安全にスクリプトを動的読み込み',
          details:
            "script-src 'strict-dynamic' を nonce や hash と組み合わせると、信頼されたスクリプトが他のスクリプトを動的に読み込むことを許可します。\n最も安全なCSP設定の一つです。"
        },
        strict: {
          message: 'ベストプラクティス: strict-dynamicを使用',
          details:
            `仕様: 'strict-dynamic' は、nonceまたはhashで信頼されたスクリプトが、新しいスクリプトを動的に作成・読み込みすることを許可します。\nhttps://www.w3.org/TR/CSP3/#strict-dynamic\n\n使用例:\nContent-Security-Policy: script-src 'nonce-r4nd0m' 'strict-dynamic'\n\n効果:\n• nonce付きスクリプトから document.createElement('script'): ✓ 許可\n• 非nonce付きインラインスクリプト: ✗ ブロック\n• ホワイトリストを無視: CDNのホワイトリストは不要\n\nこれにより、ホワイトリスト管理の複雑さを回避しつつ、セキュリティを維持できます。`
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

      <div className="visualization">
        <div className="site-box origin">
          <div className="site-name">myapp.com</div>
          <div className="site-label">あなたのWebサイト</div>
          <div className="box-section">
            <div className="section-title">レスポンスヘッダー</div>
            <code className="code-block">
              Content-Security-Policy:<br/>
              {cspHeader}
            </code>
          </div>
        </div>

        <div className="site-box target">
          <div className="site-name">ブラウザの挙動</div>
          <div className="site-label">CSPによる制限</div>
          <div className="box-section">
            <div className="section-title">スクリプト実行例</div>
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
    </div>
  )
}
