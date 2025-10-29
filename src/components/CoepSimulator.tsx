import { useState, type ChangeEvent } from 'react'

type CoepPolicy = 'require-corp' | 'unsafe-none'
type CorpPolicy = 'cross-origin' | 'same-origin' | 'none'
type ResourceType = 'script' | 'img' | 'iframe'
type ExplanationMode = 'friendly' | 'strict'
type SimulationStatus = 'success' | 'warning' | 'error'
type Scenario = 'bank-ads' | 'news-cdn' | 'app-fonts'

type Explanation = {
  message: string
  details: string
}

type SimulationResult = {
  status: SimulationStatus
  friendly: Explanation
  strict: Explanation
}

const resourceExamples: Record<ResourceType, { file: string; label: string }> = {
  script: { file: 'evil.js', label: 'script (JavaScript)' },
  img: { file: 'ad.png', label: 'img (画像)' },
  iframe: { file: 'widget.html', label: 'iframe' }
}

const scenarios = {
  'bank-ads': {
    origin: 'mybank.com',
    originLabel: '銀行サイト',
    target: 'sketchy-ads.com',
    targetLabel: '広告サーバー',
    description: '金融サイトが外部広告を表示する（セキュリティリスク高）'
  },
  'news-cdn': {
    origin: 'news.com',
    originLabel: 'ニュースサイト',
    target: 'cdn.example.com',
    targetLabel: '画像CDN',
    description: 'メディアサイトがCDNから画像を配信'
  },
  'app-fonts': {
    origin: 'myapp.com',
    originLabel: 'Webアプリ',
    target: 'fonts.googleapis.com',
    targetLabel: 'Googleフォント',
    description: 'WebアプリがGoogle Fontsを使用'
  }
}

export function CoepSimulator() {
  const [scenario, setScenario] = useState<Scenario>('bank-ads')
  const [coep, setCoep] = useState<CoepPolicy>('unsafe-none')
  const [corp, setCorp] = useState<CorpPolicy>('none')
  const [resourceType, setResourceType] = useState<ResourceType>('script')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('friendly')
  const [activePopover, setActivePopover] = useState<'request' | 'response' | null>(null)

  const currentScenario = scenarios[scenario]

  const handleCoepChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'unsafe-none' || value === 'require-corp') {
      setCoep(value)
    }
  }

  const handleCorpChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'none' || value === 'same-origin' || value === 'cross-origin') {
      setCorp(value)
    }
  }

  const handleResourceTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'script' || value === 'img' || value === 'iframe') {
      setResourceType(value)
    }
  }

  const simulate = (): SimulationResult => {
    if (coep === 'unsafe-none') {
      return {
        status: 'warning',
        friendly: {
          message: '読み込みOKだけど注意: COEPを無効にすると守りが弱くなります',
          details:
            `COEP を送らない (unsafe-none) 場合、ブラウザは従来どおり外部リソースを読み込みますが、「このページはクロスオリジン隔離されていません」と記録します。その結果、SharedArrayBuffer や高精度タイマーのような機能は保護のため自動的に無効になります。\n\nステップバイステップ:\n1. 親ページが <${resourceType}> タグで ${currentScenario.target} からリソースを要求します。\n2. ブラウザは COEP ヘッダーが無いことを確認し、従来モード(legacy mode)で renderer を起動します。\n3. リソースはそのまま描画されますが、window.crossOriginIsolated === false のため高機能 API は利用不可です。\n\n具体例: ニュースサイト (news.com) が CDN から画像を表示する際にはこれで十分動作しますが、WebAssembly で動画処理を行いたい場合や Figma のようなアプリを作りたい場合は COEP を有効化しないと SharedArrayBuffer が使えません。\n\n擬似コード:\n\`\`\`html\n<!-- COEPヘッダーが無いレスポンス -->\n<img src="https://${currentScenario.target}/${resourceExample.file}" alt="embedded resource" />\n<!-- window.crossOriginIsolated は false -->\n\`\`\`\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy\n・Chrome Developers: https://web.dev/coop-coep/\n・YouTube: Chrome Developers「Get ready for cross-origin isolation」https://www.youtube.com/watch?v=2V3ZY5Gx9-w`
        },
        strict: {
          message: '読み込み成功 (警告付き): COEP無効のため制限なし',
          details:
            `HTTPヘッダー: Cross-Origin-Embedder-Policy absent (unsafe-none 既定)\n\nブラウザ内部の挙動:\n• renderer process は crossOriginIsolation モードに入らず、同一プロセス内で他オリジンと混在します。\n• その結果、SharedArrayBuffer, Performance.now の高精度化, Atomics.wait などが自動的に封印されます。\n• DevTools > Application > Security タブでは "Not isolated" と表示されます。\n• Spectre などのサイドチャネルを防ぐ追加防御は有効化されません。\n\nこの状態でもリソースを描画できますが、クロスオリジン隔離を前提とした API は呼び出し時に TypeError (Requires cross-origin isolated context) を投げます。`
        }
      }
    }

    if (coep === 'require-corp') {
      if (corp === 'none') {
        return {
          status: 'error',
          friendly: {
            message: 'ブロック: サーバー側が「共有OK」を明示していません',
            details:
              `COEP: require-corp を宣言すると、親ページは「外部リソースもセキュリティ契約に同意してね」とブラウザに指示します。ところが ${currentScenario.target} から返ってきたレスポンスに Cross-Origin-Resource-Policy (CORP) ヘッダーが無かったため、ブラウザは描画前にロードを止めました。\n\nブラウザの流れ:\n1. 親ページ (https://${currentScenario.origin}) が HTTP ヘッダーで COEP: require-corp を送出。\n2. ブラウザが埋め込みリソースを取得し、レスポンスヘッダーに CORP を探します。\n3. 見つからなかったので「安全とは証明されていない」と判断し、コンソールに “The resource has been blocked due to a disallowed Cross-Origin-Resource-Policy” を記録しつつリソースを破棄します。\n\n具体例: 銀行サイトがリアルタイムチャート描画のために SharedArrayBuffer + WebAssembly を使いたくなり COEP を有効化したところ、広告配信サーバーのスクリプトが CORP を返していなかったため、ブラウザが広告の読み込みをブロックしました。結果的に外部スクリプトから機密データが覗かれるリスクを防げます。\n\n擬似コード (レスポンスヘッダー例):\n\`\`\`http\nHTTP/1.1 200 OK\nContent-Type: application/javascript\n// ❌ CORP ヘッダーが無いためブロック\n\`\`\`\n\n対処法:\n• リソース提供側で Cross-Origin-Resource-Policy: cross-origin または same-site を付与\n• もしくは親ページが require-corp を解除する (ただし SharedArrayBuffer は使えなくなる)\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy\n・W3C Fetch: https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header\n・YouTube: Jake Archibald「Making your site cross-origin isolated」https://www.youtube.com/watch?v=R8g0R48dUGo`
          },
        strict: {
          message: 'ブロック: Cross-Origin-Resource-Policyヘッダーがありません',
          details:
            `HTTP要求:\n• Request Mode: "cors-with-forced-preflight"\n• Embedder Policy: require-corp\n\nブラウザ内部の挙動:\n1. COEP enforcement ステップで、レスポンスヘッダーを走査して Cross-Origin-Resource-Policy を取得しようとします。\n2. ヘッダーが absent の場合、network stack は FetchResponse の状態を "blocked" に変更し、renderer へ空レスポンス (status 0) を返します。\n3. DevTools の Console には "Blocked by Cross-Origin-Embedder-Policy" が赤文字で表示され、Network パネルでは (blocked:other) と記録されます。\n\n結果として DOM にスクリプト/画像は挿入されず、window.crossOriginIsolated は true のまま維持されます。`
        }
      }
      }

      if (corp === 'same-origin') {
        return {
          status: 'error',
          friendly: {
            message: 'ブロック: 「同一オリジン専用」の設定なので拒否されました',
            details:
              `リソース提供側が Cross-Origin-Resource-Policy: same-origin を返しているため、「同じオリジン以外は読み込ませないで」と宣言しています。親ページは ${currentScenario.origin}、リソースは ${currentScenario.target} と別オリジンなので、ブラウザはロードを止めました。\n\nステップ:\n1. 親ページが require-corp を宣言し、リソースのレスポンスに CORP: same-origin が付与されています。\n2. ブラウザは「リクエスト元 (${currentScenario.origin}) とレスポンスオリジン (${currentScenario.target}) が一致しない」ことを検知し、CORP の条件違反としてリソースをブロック。\n3. コンソールには “Cross-Origin-Resource-Policy: same-origin” によるブロックが表示されます。\n\n擬似コード:\n\`\`\`http\nHTTP/1.1 200 OK\nCross-Origin-Resource-Policy: same-origin\n\n// ❌ 親ページが別オリジンなので block\n\`\`\`\n\n解決するには、共有しても安全と判断できる場合に限り CORP: cross-origin へ更新します。`
          },
        strict: {
          message: 'ブロック: Cross-Origin-Resource-Policy: same-origin は別オリジンを拒否',
          details:
            `仕様: https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header\n\n検証手順:\n• request origin = ${currentScenario.origin}\n• resource origin = ${currentScenario.target}\n• CORP header = same-origin\n\nFetch アルゴリズムは CORP を評価し、same-origin の場合には request origin !== resource origin であれば network error を投げます。結果として Response.type は "error" になり、HTML parser もリソース挿入を停止します。COEP による隔離状態は維持されます。`
        }
      }
      }

      if (corp === 'cross-origin') {
        return {
          status: 'success',
          friendly: {
            message: '成功: CORPヘッダーがあるので安全に読み込めました',
            details:
              `COEP: require-corp (親) + CORP: cross-origin (子) の組み合わせにより、ブラウザは「双方で合意済み」と判断してリソースを描画します。これでページは crossOriginIsolated === true のまま外部リソースを使えます。\n\nステップ:\n1. 親ページが COEP: require-corp を送信。\n2. リソースレスポンスに Cross-Origin-Resource-Policy: cross-origin が含まれていることをブラウザが確認。\n3. 結果として DOM にリソースが挿入され、SharedArrayBuffer や WebAssembly などの高機能 API も継続利用できます。\n\n具体例: Web アプリ (https://myapp.com) が Google Fonts (fonts.googleapis.com) からフォントを読み込み、同時に WebAssembly で画像処理を行うケース。Google Fonts は CORP: cross-origin を付与しているため、COEP を有効化してもフォントが正常に読み込まれます。\n\n擬似コード (レスポンスヘッダー):\n\`\`\`http\nHTTP/2 200 OK\nCross-Origin-Resource-Policy: cross-origin\nCross-Origin-Embedder-Policy: require-corp (親ページ)\n\`\`\`\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy\n・spec: https://wicg.github.io/cross-origin-embedder-policy/#requirements-on-embedded-resources`
          },
          strict: {
            message: '読み込み成功: CORPヘッダーが要件を満たしています',
            details:
              `Cross-Origin-Embedder-Policy: require-corp\nCross-Origin-Resource-Policy: cross-origin\n\nブラウザ内部では CORP チェックが pass し、fetch response オブジェクトの type = "cors" で renderer に配信されます。crossOriginIsolated フラグが true のまま維持されるため、SharedArrayBuffer、Atomics、AudioWorklet などの高機能 API が解禁されます。DevTools の Security パネルにも "Isolated" と表示されます。`
          }
        }
      }
    }

    return {
      status: 'error',
      friendly: {
        message: 'エラー',
        details: '想定外の組み合わせです。'
      },
      strict: {
        message: 'エラー',
        details: '未対応のケースです。'
      }
    }
  }

  const result = simulate()
  const explanation = result[explanationMode]
  const resourceExample = resourceExamples[resourceType]

  const requestPopover = [
    `${currentScenario.origin} → ${currentScenario.target}`,
    `タグ: <${resourceType}> (${resourceExample.label})`,
    `COEP (${currentScenario.origin}): ${coep}`
  ]

  const responsePopover = (() => {
    if (coep === 'unsafe-none') {
      return [
        'COEP: unsafe-none なので CORP ヘッダーなしでも読み込み可能',
        'ただし安全強化機能は無効のままです'
      ]
    }

    if (corp === 'none') {
      return [
        'CORP ヘッダーが無いためブラウザはリソースを拒否',
        'COEP: require-corp の条件を満たしていません'
      ]
    }

    if (corp === 'same-origin') {
      return [
        'Cross-Origin-Resource-Policy: same-origin',
        `別オリジン (${currentScenario.origin}) からのアクセスなのでブロックされます`
      ]
    }

    return [
      `Cross-Origin-Resource-Policy: ${corp}`,
      '要件を満たしたのでリソースを安全に組み込めます'
    ]
  })()

  const responseArrowStatus = result.status
  const responseArrowClass = `flow-arrow response ${responseArrowStatus} ${
    activePopover === 'response' ? 'active' : ''
  }`

  const resultClass = `result ${result.status}`
  const resultIcon = result.status === 'success' ? '✓' : result.status === 'warning' ? '⚠' : '✗'

  return (
    <div className="simulator">
      <h2>COEP シミュレーター</h2>
      <p className="description">
        {currentScenario.origin} が {currentScenario.target} からリソース（script/img/iframe）を読み込む
      </p>

      <div className="controls">
        <div className="control-group">
          <label>
            <span>シナリオ選択</span>
            <span className="hint">ドメイン間の関係を選択</span>
            <select
              value={scenario}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const value = event.target.value
                if (value === 'bank-ads' || value === 'news-cdn' || value === 'app-fonts') {
                  setScenario(value)
                }
              }}
            >
              <option value="bank-ads">銀行サイト ← 広告サーバー</option>
              <option value="news-cdn">ニュースサイト ← 画像CDN</option>
              <option value="app-fonts">Webアプリ ← Googleフォント</option>
            </select>
          </label>
          <div className="option-description">
            {currentScenario.description}
          </div>
        </div>
      </div>

      <div className="visualization embedded">
        <div className="parent-container">
          <div className="parent-header">
            <div className="parent-info">
              <div className="site-name">{currentScenario.origin}</div>
              <div className="site-label">{currentScenario.originLabel}</div>
            </div>
            <div className="box-section">
              <div className="section-title">COEP設定</div>
              <code className="code-block interactive">
                Cross-Origin-Embedder-Policy:<br/>
                <select className="code-select" value={coep} onChange={handleCoepChange}>
                  <option value="unsafe-none">unsafe-none</option>
                  <option value="require-corp">require-corp</option>
                </select>
              </code>
            </div>
          </div>

          <div className="embedded-content">
            <div className="embedded-item">
              <div className="box-section">
                <div className="section-title">埋め込みタグ</div>
                <code className="code-block interactive">
                  {'<'}
                  <select
                    className="code-select"
                    value={resourceType}
                    onChange={handleResourceTypeChange}
                  >
                    <option value="script">script</option>
                    <option value="img">img</option>
                    <option value="iframe">iframe</option>
                  </select>
                  <br/>
                  &nbsp;&nbsp;src="https://{currentScenario.target}/{resourceExample.file}"
                  <br/>
                  {' />'}
                </code>
              </div>
            </div>

            <div className="flow-arrows" style={{ minWidth: '150px' }}>
              <button
                type="button"
                className={`flow-arrow request ${activePopover === 'request' ? 'active' : ''}`}
                onMouseEnter={() => setActivePopover('request')}
                onMouseLeave={() => setActivePopover(null)}
                onFocus={() => setActivePopover('request')}
                onBlur={() => setActivePopover(null)}
                onClick={() =>
                  setActivePopover((current) => (current === 'request' ? null : 'request'))
                }
              >
                <span className="arrow-line">→</span>
                <span className="arrow-label">Request</span>
                {activePopover === 'request' && (
                  <div className="arrow-popover">
                    {requestPopover.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                )}
              </button>

              <button
                type="button"
                className={responseArrowClass}
                onMouseEnter={() => setActivePopover('response')}
                onMouseLeave={() => setActivePopover(null)}
                onFocus={() => setActivePopover('response')}
                onBlur={() => setActivePopover(null)}
                onClick={() =>
                  setActivePopover((current) => (current === 'response' ? null : 'response'))
                }
              >
                <span className="arrow-line">←</span>
                <span className="arrow-label">Response</span>
                {activePopover === 'response' && (
                  <div className="arrow-popover">
                    {responsePopover.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                )}
              </button>
            </div>

            <div className="embedded-item">
              <div className={`site-box target ${scenario === 'bank-ads' ? 'danger' : ''}`} style={{ margin: 0 }}>
                <div className="site-name">{currentScenario.target}</div>
                <div className="site-label">{currentScenario.targetLabel}</div>
                <div className="box-section">
                  <div className="section-title">CORP設定</div>
                  <code className="code-block interactive">
                    Cross-Origin-Resource-Policy:<br/>
                    <select className="code-select" value={corp} onChange={handleCorpChange}>
                      <option value="none">(なし)</option>
                      <option value="same-origin">same-origin</option>
                      <option value="cross-origin">cross-origin</option>
                    </select>
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
          <a href="https://html.spec.whatwg.org/multipage/origin.html#coep" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            HTML Standard: Cross-Origin-Embedder-Policy
          </a>
        </p>
        <p>
          <a href="https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            MDN: Cross-Origin-Embedder-Policy 解説
          </a>
        </p>
        <p>
          <a href="https://web.dev/why-coop-coep/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            web.dev: Why you need COOP and COEP
          </a>
        </p>
        <p>
          <a href="https://www.youtube.com/watch?v=2V3ZY5Gx9-w" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            YouTube: Cross-origin isolation (Chrome Developers)
          </a>
        </p>
        <p>
          <a href="https://securityheaders.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            他の検証ツール: Security Headers (COEP/COOP検査可)
          </a>
        </p>
      </div>

      <div className="info-box" style={{ marginTop: '1rem' }}>
        <strong>💡 なぜCOEPが必要？</strong>
        <p>Spectre などの投機的実行攻撃を防ぐために、ブラウザは「同じプロセスに不審なコードを混在させない」仕組みを求めます。COEP + CORP によって、信用できるリソースだけを読み込ませ、window.crossOriginIsolated を true にして高機能APIを安全に開放します。</p>
      </div>

      <div className="faq-section">
        <h3>よくある質問 (FAQ)</h3>

        <div className="faq-item">
          <div className="faq-question">Q. COEPを有効にすると何ができるようになりますか？</div>
          <div className="faq-answer">
            <code>SharedArrayBuffer</code>やhigh-precision timersなど、セキュリティ上のリスクがある高機能APIが使えるようになります。これらはWebAssemblyで高速な処理を行う際に必要です。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. 外部CDNの画像が読み込めなくなりました</div>
          <div className="faq-answer">
            COEP: require-corpを設定すると、外部リソースにはCORPヘッダーが必要です。CDN側で<code>Cross-Origin-Resource-Policy: cross-origin</code>を設定してもらうか、画像に<code>crossorigin</code>属性を付けて、CORSヘッダーで許可を得る必要があります。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. COEPとCORSの違いは？</div>
          <div className="faq-answer">
            CORSはfetchやXHRでのデータ取得を制御します。COEPは&lt;script&gt;、&lt;img&gt;、&lt;iframe&gt;などの埋め込みリソースを制御します。両方を組み合わせることで、より安全なサイトを構築できます。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. credentialless属性とは？</div>
          <div className="faq-answer">
            iframeに指定できる実験的な属性で、Cookie や Authorization ヘッダーを完全に省いてリソースを読み込みます。Chrome 110 以降で試験的に実装されており、COEP: require-corp の代わりに cross-origin isolation を確保する手段として提案されています。仕様ドラフト: https://wicg.github.io/credentiallessness/
          </div>
        </div>
      </div>
    </div>
  )
}
