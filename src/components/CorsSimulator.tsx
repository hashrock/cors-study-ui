import { useState, type ChangeEvent } from 'react'

type ExplanationMode = 'friendly' | 'strict'
type DomainRelation = 'same-origin' | 'subdomain' | 'same-site' | 'cross-origin'

type Explanation = {
  message: string
  details: string
}

type SimulationResult = {
  success: boolean
  friendly: Explanation
  strict: Explanation
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
    // 同一オリジンの場合、CORSチェックは不要
    if (domainRelation === 'same-origin') {
      return {
        success: true,
        friendly: {
          message: '成功: 同一オリジンなのでCORSチェックは行われません',
          details:
            'オリジン（プロトコル + ドメイン + ポート）が完全に一致しているため、ブラウザはCORSチェックをスキップします。\n\n具体例: あなたのサイト (https://myapp.com) が、同じサーバー上のAPI (https://myapp.com/api/data) を呼び出す場合、ブラウザはこれを「同じ場所」と判断し、制限なくアクセスできます。Access-Control-Allow-Originヘッダーは不要です。'
        },
        strict: {
          message: '成功: 同一オリジンポリシーにより制限なし',
          details:
            `仕様: Same-Origin Policy\nhttps://fetch.spec.whatwg.org/#http-cors-protocol\n\n同一オリジンの定義:\n• プロトコル (https): 一致 ✓\n• ドメイン (myapp.com): 一致 ✓\n• ポート (443): 一致 ✓\n\nこのため、CORSヘッダーは確認されず、リクエストは常に成功します。`
        }
      }
    }

    // クロスオリジンの場合のCORSロジック
    if (allowOrigin === 'none') {
      return {
        success: false,
        friendly: {
          message: 'ブラウザがストップ: サーバーが「OK」を言い忘れています',
          details:
            `${domainConfig.origin} → ${domainConfig.target} への ${domainRelation === 'subdomain' || domainRelation === 'same-site' ? 'サブドメイン間' : 'クロスオリジン'}リクエストです。\n\nレスポンスに Access-Control-Allow-Origin が無く、ブラウザは安全のため結果を隠しました。\n\n具体例: あなたの天気アプリが天気APIサーバーにリクエストを送信しましたが、APIサーバーが「このサイトからのアクセスを許可します」という合図（CORSヘッダー）を返さなかったため、ブラウザがデータの受け渡しをブロックしました。悪意のあるサイトが勝手にAPIを使うのを防ぐための仕組みです。\n\nサーバー側で許可するオリジンを明示する必要があります。`
        },
        strict: {
          message: 'ブロック: Access-Control-Allow-Originヘッダーがありません',
          details:
            `仕様: CORS (Cross-Origin Resource Sharing)\nhttps://fetch.spec.whatwg.org/#http-cors-protocol\n\nオリジン比較:\n• リクエスト元: ${domainConfig.origin}\n• リクエスト先: ${domainConfig.target}\n• 関係: ${domainConfig.label}\n\nサブドメインや同一サイトでもオリジンが異なればCORSが必要です。\nAccess-Control-Allow-Originヘッダーがないため、ブラウザがレスポンスをブロックしました。`
        }
      }
    }

    if (credentials === 'include' && allowOrigin === '*') {
      return {
        success: false,
        friendly: {
          message: 'ブラウザがストップ: Cookie付きリクエストに「*」は使えません',
          details:
            'credentials を include にすると「このサイトだけ許可」と応答する必要があります。\nワイルドカードのままだと信用できないためブラウザは結果を渡しません。\n\n具体例: あなたがログイン中のショッピングサイトで、カート情報を外部APIから取得しようとしています。Cookieに含まれるセッション情報も一緒に送る必要がありますが、APIサーバーが「誰でもOK(*)」という設定だと、悪意のあるサイトがあなたのCookieを使って勝手にリクエストできてしまいます。そのため、ブラウザは「特定のサイトだけ許可」という明示的な設定を要求します。'
        },
        strict: {
          message: 'ブロック: credentialsモードでワイルドカード(*)は使えません',
          details:
            `仕様: https://fetch.spec.whatwg.org/#http-cors-protocol\n\ncredentials: includeを使う場合、Access-Control-Allow-Originに具体的なオリジンを指定する必要があります。\nワイルドカード(*)は許可されません。\n\nまた、Access-Control-Allow-Credentials: true ヘッダーも必要です。`
        }
      }
    }

    return {
      success: true,
      friendly: {
        message: '成功: サーバーが許可したのでデータを受け取れました',
        details:
          `${domainConfig.origin} → ${domainConfig.target}\nレスポンスに Access-Control-Allow-Origin: ${allowOriginDisplay} が含まれているのでブラウザが受け入れました。\n${credentialDescription}\n\n具体例: あなたの天気アプリ（myapp.com）が天気API（weather-api.com）にリクエストを送信しました。APIサーバーは「myapp.comからのアクセスを許可します」というヘッダーを付けて天気データを返したため、ブラウザは安全と判断してデータをアプリに渡しました。これにより、ユーザーに天気情報を表示できます。`
      },
      strict: {
        message: '成功: CORSチェックを通過しました',
        details:
          `リクエスト元: ${domainConfig.origin}\nリクエスト先: ${domainConfig.target}\nAccess-Control-Allow-Origin: ${allowOriginDisplay}\ncredentials: ${credentials}\nmethod: ${method}\n\nすべての条件を満たしたため、ブラウザはレスポンスをアプリケーションに渡しました。`
      }
    }
  }

  const result = simulate()
  const explanation = result[explanationMode]

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
            <span className="arrow-line">→</span>
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
            <span className="arrow-line">←</span>
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
      </div>

      <div className={`result ${result.success ? 'success' : 'error'}`}>
        <div className="result-icon">{result.success ? '✓' : '✗'}</div>
        <div className="result-content">
          <div className="result-message">{explanation.message}</div>
          <div className="result-details">{explanation.details}</div>
        </div>
      </div>

      <div className="info-box">
        <strong>📚 仕様書リンク</strong>
        <p>
          <a href="https://fetch.spec.whatwg.org/#http-cors-protocol" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            Fetch Standard: CORS protocol
          </a>
        </p>
      </div>
    </div>
  )
}
