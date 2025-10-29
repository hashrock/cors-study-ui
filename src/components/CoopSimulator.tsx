import { useState, type ChangeEvent } from 'react'

import { CurvedArrow } from './CurvedArrow'

type SocialPolicy = 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin'
type BankPolicy = 'unsafe-none' | 'same-origin'
type ExplanationMode = 'friendly' | 'strict'
type SimulationStatus = 'success' | 'warning' | 'error'

type Explanation = {
  message: string
  details: string
}

type SimulationResult = {
  status: SimulationStatus
  friendly: Explanation
  strict: Explanation
  openerAccess: string
}

export function CoopSimulator() {
  const [coopSocial, setCoopSocial] = useState<SocialPolicy>('unsafe-none')
  const [coopBank, setCoopBank] = useState<BankPolicy>('unsafe-none')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('friendly')
  const [activePopover, setActivePopover] = useState<'request' | 'response' | null>(null)

  const handleCoopSocialChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'unsafe-none' || value === 'same-origin-allow-popups' || value === 'same-origin') {
      setCoopSocial(value)
    }
  }

  const handleCoopBankChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === 'unsafe-none' || value === 'same-origin') {
      setCoopBank(value)
    }
  }

  const simulate = (): SimulationResult => {
    const isSocialVulnerable = coopSocial === 'unsafe-none'
    const isBankVulnerable = coopBank === 'unsafe-none'

    if (isSocialVulnerable && isBankVulnerable) {
      return {
        status: 'error',
        friendly: {
          message: '危険: 攻撃者が元タブを書き換えられます',
          details:
            `social.com も mybank.com も COOP ヘッダーを送らないため、ブラウザは両タブを同じ browsing context group (BCG) に入れたままにします。その結果、攻撃者のフィッシングスクリプトが window.opener を通じて元タブの URL を自由に書き換えられます。\n\n攻撃の流れ:\n1. ユーザーが SNS (social.com) で銀行リンクをクリック。\n2. 搭載された悪性広告 (evil-phishing.com) が window.open で mybank.com を開く。\n3. 新しく開いたタブは mybank.com を表示しますが、元タブからは依然として window.opener でアクセス可能。\n4. 攻撃スクリプトが window.opener.location = 'https://evil-phishing.com/fake-login' を実行すると、ユーザーが戻った元タブは偽ログイン画面に変化します。\n\n擬似コード:\n\`\`\`js\n// 攻撃者がSNS内で動かすスクリプト\nconst popup = window.open('https://mybank.com', '_blank')\nif (popup) {\n  // 数秒後に元タブを偽サイトへリダイレクト\n  setTimeout(() => {\n    window.opener.location = 'https://evil-phishing.com/fake'\n  }, 2000)\n}\n\`\`\`\n\n被害: ユーザーは正規タブだと思い込み、ログインIDやワンタイムパスワードを入力してしまいます。COOP を設定すれば、ブラウザが BCG を分離し、この攻撃ベクトルを断ち切れます。\n\n参考リンク:\n・MDN: https://developer.mozilla.org/ja/docs/Web/Security/Tabnabbing\n・OWASP: https://owasp.org/www-community/attacks/Reverse_Tabnabbing`
        },
        strict: {
          message: '危険: タブナビング攻撃が可能です',
          details:
            `ブラウザ内部では opener と新規タブが同じ browsing context group を共有し続けます。COOP が absent のため、Chromium/Firefox ともに window.opener は null に書き換えられません。renderer プロセス間で postMessage や location への参照が許可されるため、tabnabbing が成立します。\n\nDevTools > Network ではレスポンスヘッダーに COOP が存在せず、Console にも警告は表示されません。セキュリティ監査ツール (Lighthouse) は “Reverse tabnabbing vulnerability” として検出します。`
        },
        openerAccess: 'window.opener !== null (アクセス可能)'
      }
    }

    if (coopSocial === 'same-origin') {
      return {
        status: 'success',
        friendly: {
          message: '安全: social.com が別タブとの橋を切りました',
          details:
            `COOP: same-origin を送ると、ブラウザは「このレスポンスと同じオリジンでない限り、同じ BCG に入れないで」と解釈します。そのため、social.com から開かれた mybank.com のタブとは橋が切られ、window.opener は自動的に null になります。\n\nユーザー体験:\n1. SNS がレスポンスヘッダーに Cross-Origin-Opener-Policy: same-origin を追加。\n2. リンクをクリックすると新しいタブは完全に独立したコンテキストに配置されます。\n3. 元タブに戻っても、攻撃者スクリプトが window.opener へアクセスしようとすると null になっており、偽サイトへの差し替えができません。\n\n擬似コード (レスポンスヘッダー):\n\`\`\`http\nHTTP/2 200 OK\nCross-Origin-Opener-Policy: same-origin\n\`\`\`\n\n副作用: 別オリジンのウィンドウ間で window.open + window.opener に頼った正規機能は使えなくなるものの、セキュリティが大きく向上します。\n\n関連リンク: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy`
        },
        strict: {
          message: '安全: COOP: same-origin で分離済み',
          details:
            `レスポンスヘッダー: Cross-Origin-Opener-Policy: same-origin\n\nブラウザ内部:\n• opener document と新タブは異なる browsing context group に移されます。\n• window.opener, window.open の透過アクセスが遮断され、document.referrer も空文字になります。\n• DevTools > Application > Frames で opener が null であることを確認可能。\n\nCOOP enforcement の結果、攻撃者による reverse tabnabbing が成立しなくなります。`
        },
        openerAccess: 'window.opener === null (アクセス不可)'
      }
    }

    if (coopSocial === 'same-origin-allow-popups') {
      return {
        status: 'success',
        friendly: {
          message: '安全: 同一オリジンのポップアップだけを許可しています',
          details:
            `same-origin-allow-popups は「自分と同じオリジンで開くポップアップだけ旧来の連携を維持し、それ以外は遮断」というバランス重視の設定です。social.com → mybank.com のように別オリジンを開いた場合は自動的に分離され、攻撃者が window.opener を使えません。一方、同一オリジン (例: 自社のヘルプセンター) を新しいタブで開いた場合は相互通信が継続します。\n\n擬似コード (レスポンスヘッダー):\n\`\`\`http\nCross-Origin-Opener-Policy: same-origin-allow-popups\n\`\`\`\n\nこの設定は、サードパーティ連携が多いSNSで「内部ツールは従来どおり動かしたいが、外部リンク経由の攻撃は防ぎたい」というケースに向いています。`
        },
        strict: {
          message: '安全: COOP: same-origin-allow-popups で保護',
          details:
            `COOP enforcement:\n• opener と開かれたウィンドウの origin を比較。\n• 一致しない場合は same-origin と同様に browsing context group を分離し、window.opener を null に設定。\n• 一致する場合は既存の接続を維持 (window.opener が残る)。\n\nブラウザは SecurityContext の isolation 状態を判定に利用し、DevTools の Frames タブで opener が null になる様子を確認できます。`
        },
        openerAccess: 'window.opener === null (アクセス不可)'
      }
    }

    if (coopBank === 'same-origin') {
      return {
        status: 'success',
        friendly: {
          message: '安全: mybank.com が自ら窓を閉じました',
          details:
            `銀行サイト側が COOP: same-origin を返すと、「自分と同じオリジンだけを同じグループに残す」というルールが新タブ側で適用されます。social.com から開かれても、mybank.com のレスポンスが届いた瞬間にブラウザが window.opener を null に上書きし、攻撃者による逆タブナビングを遮断します。\n\n擬似コード (レスポンスヘッダー):\n\`\`\`http\nHTTP/2 200 OK\nCross-Origin-Opener-Policy: same-origin\n\`\`\`\n\nUX: 正規の銀行サイトはそのまま表示されますが、元タブからの制御が完全に切断されます。ユーザーが戻ったときも安心して利用できます。`
        },
        strict: {
          message: '安全: mybank.com の COOP 設定で遮断',
          details:
            `レスポンスヘッダー: Cross-Origin-Opener-Policy: same-origin\n\nrenderer 振る舞い:\n• 新タブ側 (mybank.com) がレスポンスヘッダーを受信した時点で opener を検査。\n• origin が異なるため、window.opener を即座に null に設定し、BCG を再配置。\n• これ以降 open() 元のタブから postMessage や location 変更ができなくなります。\n\nConsole には特別なログは出ませんが、window.opener を確認すると null が返り、COOP の効果を検証できます。`
        },
        openerAccess: 'window.opener === null (アクセス不可)'
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
      },
      openerAccess: 'window.opener === null'
    }
  }

  const result = simulate()
  const explanation = result[explanationMode]

  const requestPopover = [
    'social.com → mybank.com',
    "window.open('https://mybank.com', '_blank')",
    `COOP (social.com): ${coopSocial}`
  ]

  const responsePopover = (() => {
    if (result.status === 'error') {
      return [
        'COOP が無いので window.opener が残ったまま',
        '攻撃者は元タブを偽ページに差し替え可能'
      ]
    }

    if (coopSocial === 'same-origin') {
      return [
        'social.com の COOP: same-origin',
        '別オリジンのタブは同じコンテキストにならず window.opener は null'
      ]
    }

    if (coopSocial === 'same-origin-allow-popups') {
      return [
        'social.com の COOP: same-origin-allow-popups',
        '同一オリジン以外の window.opener は切断されます'
      ]
    }

    if (coopBank === 'same-origin') {
      return [
        'mybank.com の COOP: same-origin',
        '新しいタブ側で window.opener を自ら無効化しました'
      ]
    }

    return [
      'COOP 設定により window.opener は null',
      '別オリジン間の操作は遮断されています'
    ]
  })()

  const responseArrowStatus = result.status
  const responseArrowClass = `flow-arrow response ${responseArrowStatus} ${
    activePopover === 'response' ? 'active' : ''
  }`

  const resultClass = `result ${result.status}`
  const resultIcon = result.status === 'success' ? '✓' : result.status === 'warning' ? '⚠' : '✗'

  const coopSocialDescriptions = {
    'unsafe-none': '制限なし。別オリジンのウィンドウとwindow.openerで相互アクセス可能（危険）。',
    'same-origin-allow-popups': '同一オリジンのポップアップのみopenerを保持。別オリジンとは分離されます。',
    'same-origin': '最も厳格。別オリジンとは完全に分離され、window.openerがnullになります。'
  }

  const coopBankDescriptions = {
    'unsafe-none': '制限なし。開いた側のwindow.openerがそのまま残ります。',
    'same-origin': '厳格。開いた側のwindow.openerを強制的にnullにして、外部からのアクセスを遮断。'
  }

  return (
    <div className="simulator">
      <h2>COOP シミュレーター</h2>
      <p className="description">
        タブナビング攻撃: SNSサイトのリンクから銀行サイトを開く
      </p>

      <div className="controls">
        <div className="control-group">
          <label>
            <span>social.com の COOP 設定</span>
            <select
              className="code-select"
              value={coopSocial}
              onChange={handleCoopSocialChange}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <option value="unsafe-none">unsafe-none</option>
              <option value="same-origin-allow-popups">same-origin-allow-popups</option>
              <option value="same-origin">same-origin</option>
            </select>
          </label>
          <div className="option-description">
            {coopSocialDescriptions[coopSocial]}
          </div>
        </div>

        <div className="control-group">
          <label>
            <span>mybank.com の COOP 設定</span>
            <select
              className="code-select"
              value={coopBank}
              onChange={handleCoopBankChange}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <option value="unsafe-none">unsafe-none</option>
              <option value="same-origin">same-origin</option>
            </select>
          </label>
          <div className="option-description">
            {coopBankDescriptions[coopBank]}
          </div>
        </div>
      </div>

      <div className="visualization coop">
        <div className="window-group">
          <div className="site-box origin">
            <div className="site-name">social.com</div>
            <div className="site-label">SNSサイト (元のタブ)</div>
            <div className="box-section">
              <div className="section-title">レスポンスヘッダー</div>
              <code className="code-block interactive">
                Cross-Origin-Opener-Policy:<br/>
                <select
                  className="code-select"
                  value={coopSocial}
                  onChange={handleCoopSocialChange}
                >
                  <option value="unsafe-none">unsafe-none</option>
                  <option value="same-origin-allow-popups">same-origin-allow-popups</option>
                  <option value="same-origin">same-origin</option>
                </select>
              </code>
            </div>
          </div>

          <div className="arrow-down">
            <CurvedArrow direction="down" color="#667eea" />
            <div className="arrow-label">リンククリック</div>
          </div>

          <div className="site-box danger">
            <div className="site-name">evil-phishing.com</div>
            <div className="site-label">フィッシングサイト（social.com内の広告）</div>
            <code className="code-block">
              window.open(<br/>
              &nbsp;&nbsp;'https://mybank.com',<br/>
              &nbsp;&nbsp;'_blank'<br/>
              )
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
            <span className="arrow-label">新しいタブを開く</span>
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
            <CurvedArrow direction="backward" color={
              result.status === 'success'
                ? '#48bb78'
                : result.status === 'warning'
                ? '#ed8936'
                : '#f56565'
            } />
            <span className="arrow-label">window.opener</span>
            {activePopover === 'response' && (
              <div className="arrow-popover">
                {responsePopover.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
          </button>
        </div>

        <div className="window-group">
          <div className="site-box target">
            <div className="site-name">mybank.com</div>
            <div className="site-label">正規の銀行サイト (新しいタブ)</div>
            <div className="box-section">
              <div className="section-title">レスポンスヘッダー</div>
              <code className="code-block interactive">
                Cross-Origin-Opener-Policy:<br/>
                <select
                  className="code-select"
                  value={coopBank}
                  onChange={handleCoopBankChange}
                >
                  <option value="unsafe-none">unsafe-none</option>
                  <option value="same-origin">same-origin</option>
                </select>
              </code>
            </div>
          </div>

          <div className="site-box danger">
            <div className="site-name">evil-phishing.com</div>
            <div className="site-label">攻撃者のスクリプト</div>
            <code className="code-block">
              if (window.opener) {'{'}<br/>
              &nbsp;&nbsp;window.opener.location = 'https://evil-phishing.com/fake'<br/>
              {'}'}
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
          <div className="result-opener">
            <strong>window.opener の状態:</strong> {result.openerAccess}
          </div>
        </div>
      </div>

      <div className="info-box">
        <strong>📚 仕様書リンク</strong>
        <p>
          <a href="https://html.spec.whatwg.org/multipage/origin.html#cross-origin-opener-policies" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            HTML Standard: Cross-Origin-Opener-Policy
          </a>
        </p>
        <p>
          <a href="https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            MDN: COOP ヘッダー
          </a>
        </p>
        <p>
          <a href="https://web.dev/coop-coep/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            web.dev: COOP/COEP 解説
          </a>
        </p>
        <p>
          <a href="https://www.youtube.com/watch?v=0sOVC_9JK9M" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            YouTube: Tabnabbing Explained (Secura)
          </a>
        </p>
        <p>
          <a href="https://securityheaders.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            他の検証ツール: SecurityHeaders.com (COOP確認可)
          </a>
        </p>
      </div>

      <div className="info-box" style={{ marginTop: '1rem' }}>
        <strong>💡 タブナビング攻撃とは？</strong>
        <p>ユーザーがリンクをクリックして新しいタブで正規サイトを開いている間に、攻撃者が元のタブを偽サイトに差し替える攻撃です。ターゲットが元のタブに戻った際、既にセッションが始まっていると勘違いしてログイン情報を入力してしまいます。COOP を導入するとブラウザが自動的にタブ同士を分離し、この攻撃を物理的に成立させなくします。</p>
      </div>

      <div className="faq-section">
        <h3>よくある質問 (FAQ)</h3>

        <div className="faq-item">
          <div className="faq-question">Q. same-origin-allow-popupsとsame-originの違いは？</div>
          <div className="faq-answer">
            <code>same-origin-allow-popups</code>は同一オリジンのポップアップに対してwindow.openerを保持します。<code>same-origin</code>はより厳格で、別オリジンのウィンドウとは完全に分離されます。一般的には<code>same-origin</code>の方が安全です。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. window.openerがnullになると何が起こりますか？</div>
          <div className="faq-answer">
            新しいタブから元のタブにアクセスできなくなります。つまり、<code>window.opener.location</code>で元のタブのURLを変更したり、DOMを操作したりできなくなります。これによりタブナビング攻撃を防げます。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. target="_blank"にrel="noopener"を付けるのと同じですか？</div>
          <div className="faq-answer">
            似ていますが、COOPの方がより強力です。<code>rel="noopener"</code>はJavaScript側で設定しますが、COOPはHTTPヘッダーで設定するため、HTMLを改ざんされても保護されます。両方設定するのが最も安全です。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. COOPを設定すると既存の機能が壊れませんか？</div>
          <div className="faq-answer">
            別オリジンのウィンドウと<code>window.opener</code>や<code>window.open()</code>の戻り値を使った通信をしている場合、それらは動作しなくなります。OAuth認証フローなど、ポップアップウィンドウを使う機能には影響が出る可能性があるため、テストが必要です。
          </div>
        </div>
      </div>
    </div>
  )
}
