import { useState, type ChangeEvent } from 'react'

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
            'social.com と mybank.com のどちらも COOP を設定していないため、window.opener が生きています。\n攻撃者は social.com のタブを偽ページに差し替えて認証情報を盗めます。'
        },
        strict: {
          message: '危険: タブナビング攻撃が可能です',
          details:
            'window.open で開いたタブ同士が同一プロセスのまま共有され、evil-phishing.com が window.opener にアクセスできます。'
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
            'COOP: same-origin を設定すると別オリジンのウィンドウとは分離されるため、攻撃者は元のタブに触れません。'
        },
        strict: {
          message: '安全: COOP: same-origin で分離済み',
          details:
            'social.com が COOP: same-origin を送出しているため、違うオリジンの window.opener は null になります。'
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
            'same-origin-allow-popups は “自分と同じオリジンのウィンドウ” だけ window.opener を保ちます。\nmybank.com のような別オリジンとは切り離されるので攻撃者は操作できません。'
        },
        strict: {
          message: '安全: COOP: same-origin-allow-popups で保護',
          details:
            '別オリジンのウィンドウとは browsing context group を分離するため、window.opener は null になります。'
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
            '銀行サイトが COOP: same-origin を送ると、opening 元が別オリジンでも window.opener が切断されます。'
        },
        strict: {
          message: '安全: mybank.com の COOP 設定で遮断',
          details:
            'mybank.com が COOP: same-origin を設定したため、開いた直後に window.opener が null となり、外部からの操作を遮断します。'
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
            <div className="arrow-line">↓</div>
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
            <span className="arrow-line">→</span>
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
            <span className="arrow-line">←</span>
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
      </div>

      <div className="info-box" style={{ marginTop: '1rem' }}>
        <strong>💡 タブナビング攻撃とは？</strong>
        <p>ユーザーがリンクをクリックして新しいタブで正規サイトを開いている間に、攻撃者が元のタブを偽サイトに差し替える攻撃。ユーザーは元のタブに戻ったときに偽サイトだと気づかず、認証情報を入力してしまいます。</p>
      </div>
    </div>
  )
}
