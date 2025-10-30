import { useState, type ChangeEvent } from 'react'
import ReactMarkdown from 'react-markdown'

import type { ExplanationMode, ExplanationSet } from '../types/simulator'
import {
  getIframeSandboxNoneExplanations,
  getIframeSandboxAllowScriptsExplanations,
  getIframeSandboxAllowSameOriginExplanations,
  getIframeSandboxAllowBothExplanations
} from '../explanations/iframe'

type SandboxOption = 'none' | 'allow-scripts' | 'allow-same-origin' | 'allow-scripts-same-origin'
type SimulationStatus = 'success' | 'warning' | 'error'

type SimulationResult = {
  status: SimulationStatus
  explanations: ExplanationSet
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
        explanations: getIframeSandboxNoneExplanations()
      }
    }

    if (sandbox === 'allow-scripts') {
      return {
        status: 'warning',
        explanations: getIframeSandboxAllowScriptsExplanations()
      }
    }

    if (sandbox === 'allow-same-origin') {
      return {
        status: 'warning',
        explanations: getIframeSandboxAllowSameOriginExplanations()
      }
    }

    if (sandbox === 'allow-scripts-same-origin') {
      return {
        status: 'error',
        explanations: getIframeSandboxAllowBothExplanations()
      }
    }

    return {
      status: 'error',
      explanations: {
        friendly: { message: 'エラー', details: '想定外の設定です。' },
        strict: { message: 'エラー', details: '未対応のケースです。' },
        scenario: { message: 'エラー', details: '未対応のケースです。' },
        javascript: { message: 'エラー', details: '未対応のケースです。' },
        charaboy: { message: 'エラー', details: '未対応のケースです。' }
      }
    }
  }

  const result = simulate()
  const explanation = result.explanations[explanationMode]

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
        <button
          type="button"
          className={explanationMode === 'scenario' ? 'active' : ''}
          onClick={() => setExplanationMode('scenario')}
        >
          実例
        </button>
        <button
          type="button"
          className={explanationMode === 'javascript' ? 'active' : ''}
          onClick={() => setExplanationMode('javascript')}
        >
          JavaScript
        </button>
        <button
          type="button"
          className={explanationMode === 'charaboy' ? 'active' : ''}
          onClick={() => setExplanationMode('charaboy')}
        >
          チャラ男
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
