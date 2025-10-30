import { useState, type ChangeEvent } from 'react'

import { CurvedArrow } from './CurvedArrow'

type ExplanationMode =
  | 'friendly'
  | 'strict'
  | 'one-liner'
  | 'step'
  | 'scenario'
  | 'javascript'
  | 'charaboy'
type DomainRelation = 'same-origin' | 'subdomain' | 'same-site' | 'cross-origin'

type Explanation = {
  message: string
  details: string
}

type SimulationResult = {
  success: boolean
  explanations: Record<ExplanationMode, Explanation>
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
      const explanations: Record<ExplanationMode, Explanation> = {
        friendly: {
          message: '成功: 同一オリジンなのでCORSチェックは行われません',
          details:
            `ステップバイステップ:\n1. ブラウザはリクエスト元 (${domainConfig.origin}) とリクエスト先 (${domainConfig.target}) のスキーム・ホスト・ポートを照合します。\n2. すべて一致した瞬間に "CORS 判定は不要" と判断し、そのままレスポンス処理へ移行。\n3. Access-Control-Allow-Origin ヘッダーが無くても問題ありません。\n\n具体例: https://myapp.com のダッシュボードが https://myapp.com/api/data を呼び出すとき、Network パネルには 1 本の GET だけが表示され、CORS エラーは一切出ません。保存済み Cookie や Bearer トークンも自動送信されます。`
        },
        strict: {
          message: '成功: CORS仕様では同一オリジンは検証不要',
          details:
            `仕様: Same-Origin Policy / Fetch Standard §3.2\nhttps://fetch.spec.whatwg.org/#origin\n\nブラウザ内部:\n• Fetch アルゴリズムが request origin と response origin を比較し、一致したら "same-origin" として処理。\n• プリフライト OPTIONS は発生せず、本リクエストのみ送出。\n• Network Service が受信したレスポンスはそのままレンダラーへ転送され、Response.type は "basic" のまま。\n• DevTools の CORS 列は空欄で、Allowed Origins ログも生成されません。\n\n判定例:\n• OK: https://myapp.com → https://myapp.com (既定ポート)\n• NG: https://myapp.com → https://myapp.com:8443 (ポート不一致)\n• NG: https://myapp.com → http://myapp.com (スキーム不一致)`
        },
        'one-liner': {
          message: '雑に一言: 同じ家の中だからノーチェックで通過！',
          details:
            '送り先も myapp.com なので、ブラウザは「身内同士の受け渡しね」とゲートを素通りさせます。特別なヘッダーは一切いりません。'
        },
        step: {
          message: 'ステップ表示: Nextを押すたびの画面イメージ',
          details:
            `Next① アドレスバーのドメインと送信先を比べて緑の OK ランプが点灯。\nNext② CORS ゲートがスライドして開き、リクエストがそのままレスポンスレーンへ進入。\nNext③ DevTools Network に GET /api/data が 1 行表示され、レスポンスパネルがスッと展開。`
        },
        scenario: {
          message: '実例説明: 社内ダッシュボードが社内APIを呼ぶ',
          details:
            '社内ポータル (https://myapp.com) から同じホストの /api/data を叩いて、社員のタスク状況を読み込むケース。VPN 内の同じサーバーなので管理者は特に設定せずに動作します。'
        },
        javascript: {
          message: 'JavaScript説明: 擬似コードで見る同一オリジン',
          details:
            `\`\`\`js\nconst res = await fetch('https://myapp.com/api/data')\nconsole.log(res.type) // "basic"\nconst payload = await res.json()\nrenderDashboard(payload)\n\`\`\`\nブラウザは CORS 検証ロジックを呼び出さず、body へフルアクセスできます。`
        },
        charaboy: {
          message: 'チャラ男説明: 安心の同じ部屋トーク',
          details:
            `俺くん「同じサイト内なのにエラー出ないんだけど？」\nチャラ男くん「そりゃ同じ家の部屋で荷物渡す感じっしょ。管理人(ブラウザ)も身分証いらないんだわ〜」\n彼女ちゃん「鍵もかけなくていいの？」\nチャラ男くん「家族しかいないからそのままでOK♪」\n俺くん「説明軽いのに妙に納得した…！」`
        }
      }

      return { success: true, explanations }
    }

    if (allowOrigin === 'none') {
      const explanations: Record<ExplanationMode, Explanation> = {
        friendly: {
          message: 'ブラウザがストップ: サーバーが「OK」を言い忘れています',
          details:
            `${domainConfig.origin} から ${domainConfig.target} への ${domainRelation === 'subdomain' || domainRelation === 'same-site' ? 'サブドメイン間リクエスト' : 'クロスオリジンリクエスト'} を試みましたが、サーバーが「どのオリジンに渡して良いか」を示さなかったため、ブラウザは安全のため JavaScript にレスポンスを渡しません。\n\nブラウザの流れ:\n1. ${method === 'POST' ? 'まずOPTIONSプリフライトで「本番リクエスト送っていい？」と確認。' : 'HTTP 本リクエストを送信し、'}レスポンスヘッダーをチェック。\n2. Access-Control-Allow-Origin が見つからず、Chromium 系ブラウザはレスポンスを "opaque" として封印。\n3. fetch を await すると Response.ok は false、body は空。コンソールには “Blocked by CORS policy” が表示されます。\n\n具体例: 天気アプリ (https://myapp.com) が https://weather-api.com の CORS 設定漏れに遭遇すると、画面が真っ白になり開発者ツールに赤いエラーが残ります。`
        },
        strict: {
          message: 'ブロック: Access-Control-Allow-Originヘッダーがありません',
          details:
            `仕様: Fetch Standard CORS 検証\nhttps://fetch.spec.whatwg.org/#http-cors-protocol\n\nブラウザ内部:\n• Network Service がレスポンスヘッダーを検査し、Allow-Origin 欠落を検知した時点で CORS エラーを記録。\n• レンダラープロセスにはステータス行のみ渡り、body は "blocked by CORB/CORS" として破棄。\n• Response.type は "opaque"、status は 0。\n• プリフライトが返ってきても本リクエストでヘッダーが無いと最終的に失敗します。\n\n検証ポイント:\n• Request Origin: ${domainConfig.origin}\n• Target: ${domainConfig.target}\n• 同一サイト? ${domainRelation === 'same-site' || domainRelation === 'subdomain' ? 'Yes (でも別オリジンなのでCORS必須)' : 'No (完全に別オリジン)'}\nAccess-Control-Allow-Origin が付与されるまで JavaScript からレスポンスは読めません。`
        },
        'one-liner': {
          message: '雑に一言: 合言葉が無いから門前払い！',
          details:
            'サーバーが Access-Control-Allow-Origin を返さなかったので、「どのサイトに渡していいか分からん」とブラウザが結果を封印しました。'
        },
        step: {
          message: 'ステップ表示: Nextで見るブロックの瞬間',
          details:
            `Next① リクエスト矢印がサーバーに到達し、レスポンスが戻ってくる。\nNext② 検査ゲートのライトが赤に変わり、「Allow-Origin なし」の警告アイコンが点滅。\nNext③ レスポンス矢印が霧のように消え、コンソール側に赤いトースト「Blocked by CORS policy」。`
        },
        scenario: {
          message: '実例説明: 外部天気APIが設定漏れ',
          details:
            '自社サイト (https://myapp.com) が天気ベンダー https://weather-api.com の REST API を叩いたが、先方が Allow-Origin を設定し忘れていたケース。営業日終盤に突然データが消え、原因調査で CORS エラーに気付く…という典型的な事故です。'
        },
        javascript: {
          message: 'JavaScript説明: エラーになるfetch',
          details:
            `\`\`\`js\ntry {\n  const res = await fetch('${domainConfig.target}/forecast')\n  await res.json() // ← CORS遮断で例外\n} catch (err) {\n  console.error('CORSエラー', err)\n}\n\`\`\`\nResponse.status は 0 になり、body を読む前に失敗します。`
        },
        charaboy: {
          message: 'チャラ男説明: クラブの合言葉を忘れた彼女ちゃん',
          details:
            `彼女ちゃん「ねぇねぇ、入れてもらえなかった…」\nチャラ男くん「そりゃ店長(サーバー)が『この子OK』って言う札を出してないからね。俺が一言もらっておくって言ったのに〜」\n俺くん「つまり Allow-Origin が無いってことか」\n彼女ちゃん「次はちゃんと札用意してもらう！」`
        }
      }

      return { success: false, explanations }
    }

    if (credentials === 'include' && allowOrigin === '*') {
      const explanations: Record<ExplanationMode, Explanation> = {
        friendly: {
          message: 'ブラウザがストップ: Cookie付きリクエストに「*」は使えません',
          details:
            `credentials を include にすると「認証情報付き」と判断され、"誰でもOK" を意味する * とは両立しません。\n\nブラウザの流れ:\n1. fetch が Cookie や Authorization ヘッダーを同梱してリクエスト送信。\n2. レスポンス検証で Access-Control-Allow-Origin: * を検知した瞬間にエラー扱い。\n3. コンソールに “must not be '*' when the request's credentials mode is 'include'” が表示され、レスポンス body は遮断されます。\n\n具体例: ログイン中のショッピングサイト (https://myapp.com) が https://api.myapp.com/cart を呼び出し、セッショントークン付きでアクセス。API が Allow-Origin: * を返してしまうと、攻撃者サイトにも同じレスポンスが渡る恐れがあるためブラウザが止めます。`
        },
        strict: {
          message: 'ブロック: credentialsモードでワイルドカード(*)は使えません',
          details:
            `仕様: Fetch Standard CORS credentials ルール\nhttps://fetch.spec.whatwg.org/#cors-protocol-and-credentials\n\nブラウザ内部:\n• credentials mode = "include" のとき、レスポンス検証で Allow-Origin が "*" だと失敗扱い。\n• Access-Control-Allow-Credentials: true があっても * とはセットにできません。\n• Response.type は "opaque"、status は 0。DevTools には 200 のように見えても、CORS 列に赤いアイコンが表示されます。\n\n回避策:\n• Allow-Origin を ${domainConfig.origin} のように具体的なオリジンへ変更。\n• 併せて Access-Control-Allow-Credentials: true を返却。\n• Vary: Origin を付与してキャッシュを分離するのが推奨です。`
        },
        'one-liner': {
          message: '雑に一言: クッキー抱えてるのに「誰でもどうぞ」は危険だから拒否！',
          details:
            '認証情報を送るモードで * を見ると、ブラウザは「それ配ったら大事故だよね」と判断してレスポンスを封印します。'
        },
        step: {
          message: 'ステップ表示: Nextで見る拒否の流れ',
          details:
            `Next① Cookie 付きリクエストが青い矢印でサーバーに到達。\nNext② レスポンスが戻ると検査ゲートが黄色に点滅し、「* と credentials はNG」とポップアップ。\nNext③ 矢印が透明になって消え、コンソール領域に黄色い警告バナーが出現。`
        },
        scenario: {
          message: '実例説明: 会員カートAPIの設定ミス',
          details:
            '会員制 EC (https://myapp.com) が api.myapp.com/cart を呼び出すが、開発者がテスト用に Allow-Origin: * を置きっぱなしにしていたケース。include モードのため本番環境で突然 CORS エラーが爆発し、急遽ヘッダー修正に追われます。'
        },
        javascript: {
          message: 'JavaScript説明: include + * の擬似コード',
          details:
            `\`\`\`js\nconst res = await fetch('${domainConfig.target}/cart', {\n  credentials: 'include'\n})\nconsole.log(res.type) // "opaque"\nconsole.log(res.status) // 0\n// body を読もうとすると TypeError になる\n\`\`\`\nAllow-Origin を具体化するまでデータは取得できません。`
        },
        charaboy: {
          message: 'チャラ男説明: VIP客なのにフリーパスを渡されて拒否',
          details:
            `チャラ男くん「俺くん、そのVIPカード(クッキー)持ってんのに『入場は誰でもOK〜』って札出されたら危なくね？」\n俺くん「確かに…他の人も入れてしまうし」\n彼女ちゃん「VIPなら専用ゲートでお願いしたい〜！」\nチャラ男くん「そうそう、店長が『俺くん限定でOK』って言ってくれたらスムーズよ♪」`
        }
      }

      return { success: false, explanations }
    }

    const explanations: Record<ExplanationMode, Explanation> = {
      friendly: {
        message: '成功: サーバーが許可したのでデータを受け取れました',
        details:
          `ブラウザとサーバーが以下の手順で握手しました。\n1. ${method === 'POST' ? 'OPTIONS プリフライトで利用可能なメソッド・ヘッダーを確認。' : 'シンプルリクエスト (GET) として直接送信。'}\n2. 本リクエストに対し、サーバーが Access-Control-Allow-Origin: ${allowOriginDisplay} を返却。\n3. ブラウザはレスポンスヘッダーを検証し、「このアプリからのアクセスは許可済み」と判断して JavaScript へデータを渡します。\n\n具体例: 天気アプリ (https://myapp.com) が https://weather-api.com へアクセスし、Allow-Origin: https://myapp.com と Allow-Credentials: ${credentials === 'include' ? 'true' : '不要'} が返ったので、画面に最新の気温が表示されました。`
      },
      strict: {
        message: '成功: CORSチェックを通過しました',
        details:
          `ブラウザ内部ログ:\n• Request Origin = ${domainConfig.origin}\n• Access-Control-Allow-Origin = ${allowOriginDisplay}\n• credentials mode = ${credentials}\n• Access-Control-Allow-Credentials = ${credentials === 'include' ? 'true (想定)' : 'not required'}\n• Vary: Origin を確認し、キャッシュ汚染を防止。\n\nFetch アルゴリズムはプリフライト結果をキャッシュし、検証成功後は Response.type = "cors" のストリームを JavaScript に公開します。DevTools Network の CORS 列は緑色で「Allowed」と表示されます。`
      },
      'one-liner': {
        message: '雑に一言: サーバーが「君OK！」と言ってくれたので無事ゲット！',
        details:
          `Access-Control-Allow-Origin: ${allowOriginDisplay} が届いたおかげで、ブラウザがニコッと頷きデータを手渡してくれました。`
      },
      step: {
        message: 'ステップ表示: Nextで見る成功アニメーション',
        details:
          `Next① リクエストがサーバーに届き、レスポンスがライト付きで帰還。\nNext② 検査ゲートが緑に光り、「Allow-Origin = ${allowOriginDisplay}」の吹き出し。\nNext③ データボックスがブラウザ側にスライドし、画面にグラフが描画される。`
      },
      scenario: {
        message: '実例説明: 外部API連携が正常動作',
        details:
          '社内天気ウィジェット (https://myapp.com) が気象ベンダー https://weather-api.com/data を叩き、相手サーバーが適切な Allow-Origin と Allow-Credentials を返したため、利用者に気温と降水確率を届けられたパターンです。'
      },
      javascript: {
        message: 'JavaScript説明: 正しく許可されたfetch',
        details:
          `\`\`\`js\nconst response = await fetch('${domainConfig.target}/data', {\n  method: '${method}',\n  credentials: '${credentials}'\n})\nif (!response.ok) throw new Error('CORS failed')\nconst json = await response.json()\nrenderWeather(json)\n\`\`\`\nResponse.type は "cors" になり、body を自由に扱えます。`
      },
      charaboy: {
        message: 'チャラ男説明: 店長公認で入店できた！',
        details:
          `彼女ちゃん「やったー！ちゃんと中に入れたよ」\nチャラ男くん「店長(サーバー)が『この子たちはOK！』ってスタンプ押してくれたからね〜」\n俺くん「Allow-Origin のおかげか。安心した！」\nチャラ男くん「次はクッキー付きなら店長に『Credentials true で！』って頼もうぜ♪」`
      }
    }

    return { success: true, explanations }
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
          className={explanationMode === 'one-liner' ? 'active' : ''}
          onClick={() => setExplanationMode('one-liner')}
        >
          雑に一言説明モード
        </button>
        <button
          type="button"
          className={explanationMode === 'step' ? 'active' : ''}
          onClick={() => setExplanationMode('step')}
        >
          ステップ説明モード
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
