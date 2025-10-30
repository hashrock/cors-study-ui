import { useState, type ChangeEvent } from 'react'
import ReactMarkdown from 'react-markdown'

import { CurvedArrow } from './CurvedArrow'
import type { ExplanationMode, ExplanationSet } from '../types/simulator'
import {
  getSameOriginExplanations,
  getCorsBlockedExplanations,
  getCredentialsWildcardExplanations,
  getCorsSuccessExplanations
} from '../explanations/cors'

type DomainRelation = 'same-origin' | 'subdomain' | 'same-site' | 'cross-origin'

type SimulationResult = {
  success: boolean
  explanations: ExplanationSet
}

const domainConfigs = {
  'same-origin': {
    origin: 'https://myapp.com',
    target: 'https://myapp.com',
    label: '同一オリジン'
  },
  'subdomain': {
    origin: 'https://myapp.com',
    target: 'https://api.myapp.com',
    label: 'サブドメイン'
  },
  'same-site': {
    origin: 'https://myapp.com',
    target: 'https://shop.myapp.com',
    label: '同一サイト（異なるサブドメイン）'
  },
  'cross-origin': {
    origin: 'https://myapp.com',
    target: 'https://weather-api.com',
    label: '完全に異なるドメイン'
  }
}

export function CorsSimulator() {
  const [domainRelation, setDomainRelation] = useState<DomainRelation>('cross-origin')
  const [allowOrigin, setAllowOrigin] = useState<'*' | 'myapp.com' | 'none'>('none')
  const [credentials, setCredentials] = useState<'include' | 'same-origin' | 'omit'>('omit')
  const [method, setMethod] = useState<'GET' | 'POST'>('GET')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('friendly')
  const [activePopover, setActivePopover] = useState<'request' | 'response' | null>(null)

  const domainConfig = domainConfigs[domainRelation]

  const allowOriginDisplay =
    allowOrigin === 'none' ? '(なし)' : allowOrigin === '*' ? '*' : 'https://myapp.com'

  const credentialDescriptions = {
    omit: {
      short: 'Cookieを送らずに呼び出します',
      detail: 'クロスオリジンリクエストでCookieや認証情報を送信しません。公開APIの呼び出しに適しています。'
    },
    'same-origin': {
      short: '同一オリジンのときだけCookieを送信します',
      detail: '同一オリジンのリクエストでのみCookieを送信します。デフォルトの動作です。'
    },
    include: {
      short: '常にCookieや認証情報を送信します',
      detail: 'クロスオリジンでもCookieや認証情報を含めます。サーバー側でAccess-Control-Allow-Credentials: trueが必要です。'
    }
  }

  const credentialDescription = credentialDescriptions[credentials].short

  const domainRelationDescriptions = {
    'same-origin': {
      detail: 'プロトコル、ドメイン、ポートがすべて一致。CORSチェックは不要です。',
      example: '例: https://myapp.com → https://myapp.com'
    },
    'subdomain': {
      detail: 'サブドメインが異なるため、CORSが必要です。',
      example: '例: 本体サイトからAPIサーバーへのアクセス'
    },
    'same-site': {
      detail: '同じ登録可能ドメインですが、サブドメインが異なるためCORSが必要です。',
      example: '例: ECサイト本体とショッピングカートシステム間の通信'
    },
    'cross-origin': {
      detail: '完全に異なるドメイン間の通信。CORSが必須です。',
      example: '例: 自社サイトから外部API（天気、地図など）へのアクセス'
    }
  }

  const allowOriginDescriptions = {
    'none': {
      detail: 'CORSヘッダーなし。クロスオリジンリクエストはブロックされます。'
    },
    'myapp.com': {
      detail: '特定のオリジンのみを許可。最も安全な設定です。'
    },
    '*': {
      detail: 'すべてのオリジンを許可。公開APIに使用しますが、credentials: includeとは併用できません。'
    }
  }

  const methodDescriptions = {
    'GET': {
      detail: 'データの取得。シンプルリクエストとして扱われます（カスタムヘッダーがない場合）。'
    },
    'POST': {
      detail: 'データの送信。Content-Typeによってはプリフライトリクエストが発生します。'
    }
  }

  const simulate = (): SimulationResult => {
    if (domainRelation === 'same-origin') {
      return { success: true, explanations: getSameOriginExplanations() }
    }

    if (allowOrigin === 'none') {
      return {
        success: false,
        explanations: getCorsBlockedExplanations(domainConfig, domainRelation)
      }
    }

    if (credentials === 'include' && allowOrigin === '*') {
      return {
        success: false,
        explanations: getCredentialsWildcardExplanations(domainConfig)
      }
    }

    return {
      success: true,
      explanations: getCorsSuccessExplanations(domainConfig, allowOriginDisplay, credentials, method)
    }
  }

  const result = simulate()
  const explanation = result.explanations[explanationMode]

  const requestPopover = [
    `${domainConfig.origin} → ${domainConfig.target}`,
    `関係: ${domainConfig.label}`,
    `HTTP ${method} リクエスト`,
    `credentials: ${credentials} — ${credentialDescription}`
  ]

  const responsePopover = (() => {
    if (domainRelation === 'same-origin') {
      return [
        '同一オリジンなのでCORSチェックは不要',
        'ブラウザは制限なくレスポンスをアプリに渡します'
      ]
    }

    if (allowOrigin === 'none') {
      return [
        `${domainConfig.label}のリクエストなのでCORSが必要です`,
        'レスポンスヘッダーに Access-Control-Allow-Origin がありません',
        'ブラウザはセキュリティ上の理由でレスポンスをブロックします'
      ]
    }

    if (credentials === 'include' && allowOrigin === '*') {
      return [
        'Access-Control-Allow-Origin が "*" なので credentials: include と矛盾',
        '具体的なオリジンを指定しないとブラウザはレスポンスを拒否します'
      ]
    }

    return [
      `Access-Control-Allow-Origin: ${allowOriginDisplay}`,
      '条件を満たしたのでブラウザがレスポンスをアプリに渡します'
    ]
  })()

  return (
    <div className="simulator">
      <h2>CORS シミュレーター</h2>
      <p className="description">
        {domainConfig.origin} から {domainConfig.target} へAPIリクエストを送信（{domainConfig.label}）
      </p>

      <div className="controls">
        <div className="control-group">
          <label>
            <span>ドメイン関係</span>
            <span className="hint">リクエスト元とリクエスト先の関係を選択</span>
            <select
              value={domainRelation}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const value = event.target.value
                if (value === 'same-origin' || value === 'subdomain' || value === 'same-site' || value === 'cross-origin') {
                  setDomainRelation(value)
                }
              }}
            >
              <option value="same-origin">同一オリジン (myapp.com → myapp.com)</option>
              <option value="subdomain">サブドメイン (myapp.com → api.myapp.com)</option>
              <option value="same-site">同一サイト (myapp.com → shop.myapp.com)</option>
              <option value="cross-origin">クロスオリジン (myapp.com → weather-api.com)</option>
            </select>
          </label>
          <div className="option-description">
            {domainRelationDescriptions[domainRelation].detail}
            <br/>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>
              {domainRelationDescriptions[domainRelation].example}
            </span>
          </div>
        </div>
      </div>

      <div className="visualization">
        <div className="site-box origin">
          <div className="site-name">{domainConfig.origin.replace('https://', '')}</div>
          <div className="site-label">リクエスト元</div>
          <div className="box-section">
            <div className="section-title">送信リクエスト</div>
            <code className="code-block interactive">
              fetch('{domainConfig.target}/data', {'{'}<br/>
              &nbsp;&nbsp;credentials: 
              <select
                className="code-select"
                value={credentials}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const value = event.target.value
                  if (value === 'omit' || value === 'same-origin' || value === 'include') {
                    setCredentials(value)
                  }
                }}
              >
                <option value="omit">omit (Cookieを送らない)</option>
                <option value="same-origin">same-origin (同一オリジンのみ)</option>
                <option value="include">include (常に送る)</option>
              </select>,<br/>
              &nbsp;&nbsp;method: 
              <select
                className="code-select"
                value={method}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const value = event.target.value
                  if (value === 'GET' || value === 'POST') {
                    setMethod(value)
                  }
                }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select><br/>
              {'}'})
            </code>
          </div>
        </div>

        <div className="flow-arrows">
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
            <span className="arrow-label">HTTP Request</span>
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
            className={`flow-arrow response ${result.success ? 'success' : 'error'} ${
              activePopover === 'response' ? 'active' : ''
            }`}
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
              color={result.success ? '#48bb78' : '#f56565'}
            />
            <span className="arrow-label">HTTP Response</span>
            {activePopover === 'response' && (
              <div className="arrow-popover">
                {responsePopover.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
          </button>
        </div>

        <div className="site-box target">
          <div className="site-name">{domainConfig.target.replace('https://', '')}</div>
          <div className="site-label">リクエスト先サーバー</div>
          <div className="box-section">
            <div className="section-title">レスポンスヘッダー</div>
            <code className="code-block interactive">
              Access-Control-Allow-Origin:<br/>
              <select
                className="code-select"
                value={allowOrigin}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const value = event.target.value
                  if (value === 'none' || value === 'myapp.com' || value === '*') {
                    setAllowOrigin(value)
                  }
                }}
              >
                <option value="none">なし (CORS無効)</option>
                <option value="myapp.com">https://myapp.com</option>
                <option value="*">* (全てのオリジンを許可)</option>
              </select>
            </code>
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="control-group">
          <label>
            <span>現在の設定</span>
          </label>
          <div className="option-description">
            <strong>credentials: {credentials}</strong><br/>
            {credentialDescriptions[credentials].detail}
          </div>
          <div className="option-description">
            <strong>method: {method}</strong><br/>
            {methodDescriptions[method].detail}
          </div>
          <div className="option-description">
            <strong>Access-Control-Allow-Origin: {allowOriginDisplay}</strong><br/>
            {allowOriginDescriptions[allowOrigin].detail}
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

      <div className={`result ${result.success ? 'success' : 'error'}`}>
        <div className="result-icon">{result.success ? '✓' : '✗'}</div>
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
          <a href="https://fetch.spec.whatwg.org/#http-cors-protocol" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            Fetch Standard: CORS protocol
          </a>
        </p>
        <p>
          <a href="https://developer.mozilla.org/ja/docs/Web/HTTP/CORS" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            MDN Web Docs: CORS 解説
          </a>
        </p>
        <p>
          <a href="https://www.w3.org/TR/cors/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            W3C Recommendation: Cross-Origin Resource Sharing
          </a>
        </p>
        <p>
          <a href="https://www.youtube.com/watch?v=Ka8vG5miEr8" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            YouTube: Fireship - CORS in 100 Seconds
          </a>
        </p>
        <p>
          <a href="https://httptoolkit.com/will-it-cors/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            他のシミュレーションツール: Will It CORS?
          </a>
        </p>
      </div>

      <div className="faq-section">
        <h3>よくある質問 (FAQ)</h3>

        <div className="faq-item">
          <div className="faq-question">Q. サブドメイン間（api.example.com → example.com）の通信でもCORSが必要ですか？</div>
          <div className="faq-answer">
            はい、必要です。サブドメインが異なれば別オリジンと見なされ、CORSヘッダーが必要になります。<code>document.domain</code>を使って回避する古い方法もありますが、非推奨です。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. プリフライトリクエストとは何ですか？</div>
          <div className="faq-answer">
            カスタムヘッダーや特定のContent-Type（application/json等）を使う場合、ブラウザは本リクエストの前にOPTIONSメソッドで「このリクエストを送っていいか」を確認します。これがプリフライトリクエストです。サーバーは<code>Access-Control-Allow-Methods</code>や<code>Access-Control-Allow-Headers</code>で許可を返す必要があります。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. CORSエラーが出たらどうすればいいですか？</div>
          <div className="faq-answer">
            サーバー側で適切な<code>Access-Control-Allow-Origin</code>ヘッダーを設定する必要があります。開発中は<code>*</code>で全て許可し、本番環境では特定のオリジンのみを許可するのが一般的です。Node.jsならcorsミドルウェア、他の言語でもCORSライブラリが利用できます。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. localhost同士でもCORSエラーが出るのはなぜ？</div>
          <div className="faq-answer">
            ポート番号が異なれば別オリジンです。例えば<code>http://localhost:3000</code>から<code>http://localhost:5000</code>へのリクエストはクロスオリジンとなり、CORSヘッダーが必要です。
          </div>
        </div>
      </div>
    </div>
  )
}
