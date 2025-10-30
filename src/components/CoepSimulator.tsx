import { useState, type ChangeEvent } from 'react'
import ReactMarkdown from 'react-markdown'

import { CurvedArrow } from './CurvedArrow'
import type { ExplanationMode, ExplanationSet } from '../types/simulator'
import {
  getCoepUnsafeNoneExplanations,
  getCoepCorpNoneExplanations,
  getCoepCorpSameOriginExplanations,
  getCoepCorpCrossOriginExplanations
} from '../explanations/coep'

type CoepPolicy = 'require-corp' | 'unsafe-none'
type CorpPolicy = 'cross-origin' | 'same-origin' | 'none'
type ResourceType = 'script' | 'img' | 'iframe'
type SimulationStatus = 'success' | 'warning' | 'error'
type Scenario = 'bank-ads' | 'news-cdn' | 'app-fonts'

type SimulationResult = {
  status: SimulationStatus
  explanations: ExplanationSet
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
    const scenarioConfig = {
      origin: currentScenario.origin,
      target: currentScenario.target,
      originLabel: currentScenario.originLabel,
      targetLabel: currentScenario.targetLabel
    }

    if (coep === 'unsafe-none') {
      return {
        status: 'warning',
        explanations: getCoepUnsafeNoneExplanations(scenarioConfig, resourceType)
      }
    }

    if (coep === 'require-corp') {
      if (corp === 'none') {
        return {
          status: 'error',
          explanations: getCoepCorpNoneExplanations(scenarioConfig)
        }
      }

      if (corp === 'same-origin') {
        return {
          status: 'error',
          explanations: getCoepCorpSameOriginExplanations(scenarioConfig)
        }
      }

      if (corp === 'cross-origin') {
        return {
          status: 'success',
          explanations: getCoepCorpCrossOriginExplanations(scenarioConfig)
        }
      }
    }

    return {
      status: 'error',
      explanations: {
        friendly: { message: 'エラー', details: '想定外の組み合わせです。' },
        strict: { message: 'エラー', details: '未対応のケースです。' },
        scenario: { message: 'エラー', details: '想定外の組み合わせです。' },
        javascript: { message: 'エラー', details: '想定外の組み合わせです。' },
        charaboy: { message: 'エラー', details: '想定外の組み合わせです。' }
      }
    }
  }

  const result = simulate()
  const explanation = result.explanations[explanationMode]
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
                  &nbsp;&nbsp;src="https://{currentScenario.target}/{resourceExamples[resourceType].file}"
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
                <CurvedArrow direction="forward" color="#63b3ed" />
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
                <CurvedArrow
                  direction="backward"
                  color={
                    result.status === 'success'
                      ? '#48bb78'
                      : result.status === 'warning'
                      ? '#ed8936'
                      : '#f56565'
                  }
                />
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
