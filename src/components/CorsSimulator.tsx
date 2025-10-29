import { useState, type ChangeEvent } from 'react'

import { CurvedArrow } from './CurvedArrow'

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
            `ステップバイステップ:\n1. ブラウザはリクエスト元 (${domainConfig.origin}) とリクエスト先 (${domainConfig.target}) のスキーム・ホスト・ポートを比較します。\n2. すべて一致すると判断した瞬間に、CORS検証フェーズをスキップして通常のHTTPレスポンス処理に進みます。\n3. レスポンスヘッダーにAccess-Control-Allow-Originがなくても問題ありません。\n\n具体例: https://myapp.com のダッシュボードが同じサーバー上の API (https://myapp.com/api/data) を呼び出すとき、DevTools の Network パネルには 1 本の GET リクエストだけが記録され、CORS エラーは表示されません。保存されている Cookie や Bearer トークンも自動的に送信されます。\n\n擬似コード:\n\`\`\`js\nconst response = await fetch('https://myapp.com/api/data', {\n  credentials: 'same-origin',\n  headers: { Accept: 'application/json' }\n})\nconst payload = await response.json()\nrenderDashboard(payload)\n\`\`\`\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/Security/Same-origin_policy\n・WHATWG Fetch Standard (Origins): https://fetch.spec.whatwg.org/#origin\n・YouTube: Google Chrome Developers「What is the Same-Origin Policy?」https://www.youtube.com/watch?v=G6IcmJd4Uo0`
        },
        strict: {
          message: '成功: 同一オリジンポリシーにより制限なし',
          details:
            `仕様: Same-Origin Policy\nhttps://fetch.spec.whatwg.org/#origin\n\nブラウザ内部の挙動:\n• Navigation/Fetch スタックで request origin と response origin を比較し、一致が確認できると "same-origin" フラグが立ちます。\n• CORS プリフライト (OPTIONS) は発生せず、本リクエストのみを送出します。\n• Network Service がレスポンスを受信すると即座にレンダラープロセスへ転送し、JavaScript から Response.body/JSON へ同期アクセスできます。\n• DevTools の CORS 列にはチェックマークが付かず、Allowed origins の検証ログも生成されません。\n\n同一オリジン判定の例:\n• OK: https://myapp.com → https://myapp.com (既定ポート 443)\n• NG: https://myapp.com → https://myapp.com:8443 (ポート不一致で別オリジン扱い)\n• NG: https://myapp.com → http://myapp.com (スキーム不一致)\n\nよって、Access-Control-Allow-* ヘッダーは検証対象にならず、ブラウザはレスポンスを無加工でアプリに公開します。`
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
            `${domainConfig.origin} から ${domainConfig.target} への ${domainRelation === 'subdomain' || domainRelation === 'same-site' ? 'サブドメイン間リクエスト' : 'クロスオリジンリクエスト'} を試みましたが、サーバーが「このレスポンスはどのサイトに渡して良いか」を明示しなかったため、ブラウザは安全のためJavaScript側へ結果を渡しません。\n\nブラウザの流れ:\n1. ${method === 'POST' ? 'まずOPTIONSプリフライトで「本番リクエストを送って良いか」を確認しようとしますが、' : 'HTTP本リクエストを送信し、'}レスポンスヘッダーを検査します。\n2. Access-Control-Allow-Origin が見つからず、Chromium系ブラウザはネットワークサービス内でレスポンスを「opaque」状態にし、レンダラーへはステータスのみ渡します。\n3. JavaScript側で fetch を await すると、Response.ok は false になり、body は読み取れません。コンソールには “Blocked by CORS policy” が表示されます。\n\n具体例: 天気アプリ (https://myapp.com) が https://weather-api.com の天気情報を取得したいときに、weather-api.com が CORS 設定を忘れると、ユーザーの画面には何も表示されず、開発者ツールの Console に CORS エラーが残ります。\n\n擬似コード:\n\`\`\`js\ntry {\n  const res = await fetch('${domainConfig.target}/forecast')\n  const data = await res.json() // ← CORSでブロックされ読み込めない\n  showWeather(data)\n} catch (error) {\n  console.error('CORSエラー', error)\n}\n\`\`\`\n\nサーバーで行うべきこと:\n• 返却レスポンスに Access-Control-Allow-Origin: ${allowOrigin === 'none' ? 'https://myapp.com' : allowOriginDisplay} を追加\n• 必要に応じて Access-Control-Allow-Methods や Access-Control-Allow-Headers も追加\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/CORS/Errors/CORSMissingAllowOrigin\n・W3C Fetch Standard: https://fetch.spec.whatwg.org/#cors-protocol-and-credentials\n・YouTube: Web Dev Simplified「How CORS Works」https://www.youtube.com/watch?v=4KHiSt0oLJ0\n・他のシミュレーター: Will It CORS? https://httptoolkit.com/will-it-cors/`
        },
        strict: {
          message: 'ブロック: Access-Control-Allow-Originヘッダーがありません',
          details:
            `仕様: CORS (Cross-Origin Resource Sharing)\nhttps://fetch.spec.whatwg.org/#http-cors-protocol\n\nブラウザ内部の挙動:\n• Network Service はレスポンスヘッダーを確認し、Access-Control-Allow-Origin が absent の場合に「CORS検証失敗」と記録します。\n• レンダラープロセスにはレスポンスヘッダーのみが渡り、body は "blocked by CORB/CORS" として破棄されます。\n• fetch API は resolved しますが、Response.type は "opaque" となり、response.status は 0、ブラウザコンソールにエラーが出力されます。\n• プリフライト (OPTIONS) が発生した場合、サーバーが 200 を返しても本リクエストはヘッダー欠落で遮断されます。\n\n検証ポイント:\n• リクエスト元: ${domainConfig.origin}\n• リクエスト先: ${domainConfig.target}\n• 同一サイト? ${domainRelation === 'same-site' || domainRelation === 'subdomain' ? 'Yes (ただしオリジンは異なるためCORS必須)' : 'No (完全に別オリジン)'}\n\nAccess-Control-Allow-Origin が欠落している限り、ブラウザはセキュリティサンドボックスを維持し、レスポンスデータをJavaScriptに公開しません。`
        }
      }
    }

    if (credentials === 'include' && allowOrigin === '*') {
      return {
        success: false,
        friendly: {
          message: 'ブラウザがストップ: Cookie付きリクエストに「*」は使えません',
          details:
            `credentials を include にすると、ブラウザは「クッキーや認証トークンが含まれている＝個人情報が紐づく可能性がある」と判断し、「誰でも受け取ってよい」というワイルドカード (*) を拒否します。\n\nブラウザの流れ:\n1. fetch は Request.credentials = 'include' を設定し、Cookie や Authorization ヘッダーを同梱します。\n2. Network Service がレスポンスヘッダーの Access-Control-Allow-Origin を確認した時点で * を検知すると、「資格情報を含むリクエストとは両立しない」と判断してエラーにします。\n3. コンソールには “The value of the 'Access-Control-Allow-Origin' header in the response must not be '*' when the request's credentials mode is 'include'.” が表示されます。\n\n具体例: ログイン中のショッピングサイト (https://myapp.com) がユーザーのカートAPI (https://api.myapp.com) を呼び出し、Cookie に入っているセッショントークンも送信します。API が Access-Control-Allow-Origin: * を返すと、攻撃者サイトも同じレスポンスを読み取れてしまうためブラウザが遮断します。\n\n擬似コード:\n\`\`\`js\nconst response = await fetch('${domainConfig.target}/cart', {\n  credentials: 'include',\n  headers: { 'Content-Type': 'application/json' }\n})\n// ↑ レスポンスはCORS違反としてブロックされ、response.okはfalseになります\n\`\`\`\n\n修正ガイド:\n• Access-Control-Allow-Origin を https://myapp.com のように具体的なオリジンへ変更\n• 併せて Access-Control-Allow-Credentials: true を送出\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials\n・WHATWG Fetch Standard (Credentials mode): https://fetch.spec.whatwg.org/#cors-protocol-and-credentials\n・YouTube: Hussein Nasser「CORS in Depth」https://www.youtube.com/watch?v=Ka8vG5miEr8`
        },
        strict: {
          message: 'ブロック: credentialsモードでワイルドカード(*)は使えません',
          details:
            `仕様: https://fetch.spec.whatwg.org/#cors-protocol-and-credentials\n\nブラウザ内部の挙動:\n• Fetch アルゴリズムは credentials mode が "include" の場合、レスポンス検証時に Access-Control-Allow-Origin が "*" であることを検知するとエラーを投げます。\n• Access-Control-Allow-Credentials: true が存在しても、Allow-Origin: * とは組み合わせられません。\n• Response.type は "opaque" に変換され、JavaScript から body へアクセスできません。status は 0 として扱われます。\n• DevTools の Network パネルではステータス 200 が見えるものの、"Provisional headers are shown" の警告が表示され、CORS error 列が赤くなります。\n\n回避策:\n• Access-Control-Allow-Origin をリクエスト元の正確なオリジン (${domainConfig.origin}) に設定\n• Access-Control-Allow-Credentials: true を追加\n• 必要に応じて Vary: Origin を付与し、複数オリジンを許可する際のキャッシュ分離を維持\n\nこの検証はブラウザ側で強制されるため、クライアントコード側で回避することはできません。`
        }
      }
    }

    return {
      success: true,
      friendly: {
        message: '成功: サーバーが許可したのでデータを受け取れました',
        details:
          `ブラウザとサーバーが以下の手順で握手し、データが安全に届きました。\n1. ${method === 'POST' ? 'OPTIONS プリフライトで利用可能なメソッドやヘッダーを確認し、サーバーが 204/200 を返答。' : 'シンプルリクエスト (GET) として直接送信。'}\n2. 本リクエストに対し、サーバーが Access-Control-Allow-Origin: ${allowOriginDisplay} を含めて応答。\n3. ブラウザはレスポンスヘッダーを検証し、「このアプリからのアクセスが許可されている」と判断してJavaScriptへデータを渡します。\n\n具体例: 天気アプリ (https://myapp.com) が https://weather-api.com へアクセスし、API が Access-Control-Allow-Origin: https://myapp.com を返したため、画面に最新の気温が表示できました。credentials 設定: ${credentialDescription}\n\n擬似コード:\n\`\`\`js\nconst response = await fetch('${domainConfig.target}/data', {\n  method: '${method}',\n  credentials: '${credentials}',\n  headers: {\n    'Content-Type': 'application/json'\n  }\n})\nif (!response.ok) throw new Error('CORS失敗')\nconst json = await response.json()\nrenderWeather(json)\n\`\`\`\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/HTTP/CORS\n・WHATWG Fetch Standard: https://fetch.spec.whatwg.org/#cors-protocol\n・YouTube: Fireship「CORS in 100 Seconds」https://www.youtube.com/watch?v=Ka8vG5miEr8\n・関連ツール: https://github.com/whatwg/fetch#cors-protocol (仕様サンプル)`
      },
      strict: {
        message: '成功: CORSチェックを通過しました',
        details:
          `ブラウザ内部の検証ログ:\n• Request Origin = ${domainConfig.origin}\n• Response Header Access-Control-Allow-Origin = ${allowOriginDisplay}\n• credentials mode = ${credentials}\n• Access-Control-Allow-Credentials = ${credentials === 'include' ? 'true (このデモではサーバーが返していると想定)' : '不要'}\n• Vary: Origin を確認し、キャッシュポイズニングを回避\n\nFetch Algorithm:\n1. (必要に応じて) preflight result をキャッシュに保存。\n2. CORS検証が成功すると ResponseType = "cors" となり、body がストリームとして JavaScript に公開されます。\n3. DevTools の Network パネルでは「(from disk cache)」などの情報と共に CORS 列が緑色で表示されます。\n\n最終結果: ブラウザはレスポンスをアプリケーションに渡し、Service Worker やメインスレッドで自由に処理できます。`
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
