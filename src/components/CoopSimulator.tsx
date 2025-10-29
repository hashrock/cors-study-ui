import { useState, type ChangeEvent } from 'react'

export function CoopSimulator() {
  const [coopSocial, setCoopSocial] = useState<'unsafe-none' | 'same-origin-allow-popups' | 'same-origin'>('unsafe-none')
  const [coopBank, setCoopBank] = useState<'unsafe-none' | 'same-origin'>('unsafe-none')

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

  const simulate = () => {
    // タブナビング攻撃のシミュレーション
    const isSocialVulnerable = coopSocial === 'unsafe-none'
    const isBankVulnerable = coopBank === 'unsafe-none'

    if (isSocialVulnerable && isBankVulnerable) {
      return {
        success: false,
        message: '危険: タブナビング攻撃が可能です',
        details: '1. evil-phishing.comがsocial.comのタブでwindow.openerにアクセス可能\n2. mybank.comで正規ログイン後、evil-phishing.comがsocial.comのタブを偽ログインページに差し替え\n3. ユーザーが気づかず偽ページに認証情報を入力してしまう',
        openerAccess: 'window.opener !== null (アクセス可能)',
        warning: true
      }
    }

    if (!isSocialVulnerable || !isBankVulnerable) {
      return {
        success: true,
        message: '安全: タブナビング攻撃から保護されています',
        details: coopSocial === 'same-origin'
          ? 'social.comがCOOP: same-originを設定しているため、別オリジンのウィンドウとは完全に分離されます。'
          : coopBank === 'same-origin'
          ? 'mybank.comがCOOP: same-originを設定しているため、window.openerからのアクセスが遮断されます。'
          : 'COOP: same-origin-allow-popupsは同一オリジンのポップアップは許可しますが、別オリジンからは保護します。',
        openerAccess: 'window.opener === null (アクセス不可)',
        warning: false
      }
    }

    return {
      success: false,
      message: 'エラー',
      details: '',
      openerAccess: '',
      warning: false
    }
  }

  const result = simulate()

  return (
    <div className="simulator">
      <h2>COOP シミュレーター</h2>
      <p className="description">
        タブナビング攻撃: SNSサイトのリンクから銀行サイトを開く
      </p>

      <div className="visualization coop">
        <div className="window-group">
          <div className="site-box origin">
            <div className="site-name">social.com</div>
            <div className="site-label">SNSサイト (元のタブ)</div>
            <code className="code-block">
              Cross-Origin-Opener-Policy:<br/>
              {coopSocial}
            </code>
          </div>

          <div className="arrow-down">
            <div className="arrow-line">↓</div>
            <div className="arrow-label">リンククリック</div>
          </div>

          <div className="site-box danger">
            <div className="site-name">evil-phishing.com</div>
            <div className="site-label">フィッシングサイト（隠れている）</div>
            <code className="code-block">
              window.open(<br/>
              &nbsp;&nbsp;'https://mybank.com',<br/>
              &nbsp;&nbsp;'_blank'<br/>
              )
            </code>
          </div>
        </div>

        <div className="arrow-horizontal">
          <div className="arrow-line">→</div>
          <div className="arrow-label">新しいタブで開く</div>
        </div>

        <div className="window-group">
          <div className="site-box target">
            <div className="site-name">mybank.com</div>
            <div className="site-label">正規の銀行サイト (新しいタブ)</div>
            <code className="code-block">
              Cross-Origin-Opener-Policy:<br/>
              {coopBank}
            </code>
          </div>

          <div className="attack-arrow">
            <div className="arrow-line">←</div>
            <div className="arrow-label danger-label">
              window.opener.location<br/>
              = 'https://evil-phishing.com/fake'
            </div>
          </div>

          <div className="site-box danger">
            <div className="site-name">evil-phishing.com</div>
            <div className="site-label">攻撃者</div>
            <code className="code-block">
              // 元のタブを偽ページに差し替え<br/>
              if (window.opener) {'{'}<br/>
              &nbsp;&nbsp;window.opener.location = ...<br/>
              {'}'}
            </code>
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="control-group">
          <label>
            <strong>social.com の COOP</strong>
            <span className="hint">(SNSサイトのレスポンスヘッダー)</span>
          </label>
          <select value={coopSocial} onChange={handleCoopSocialChange}>
            <option value="unsafe-none">unsafe-none (デフォルト)</option>
            <option value="same-origin-allow-popups">same-origin-allow-popups</option>
            <option value="same-origin">same-origin (最も厳格)</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <strong>mybank.com の COOP</strong>
            <span className="hint">(銀行サイトのレスポンスヘッダー)</span>
          </label>
          <select value={coopBank} onChange={handleCoopBankChange}>
            <option value="unsafe-none">unsafe-none (デフォルト)</option>
            <option value="same-origin">same-origin (推奨)</option>
          </select>
        </div>
      </div>

      <div className={`result ${result.success ? 'success' : (result.warning ? 'error' : 'error')}`}>
        <div className="result-icon">{result.success ? '✓' : '✗'}</div>
        <div className="result-content">
          <div className="result-message">{result.message}</div>
          <div className="result-details">{result.details}</div>
          <div className="result-opener">
            <strong>window.opener の状態:</strong> {result.openerAccess}
          </div>
        </div>
      </div>

      <div className="info-box">
        <strong>💡 タブナビング攻撃とは？</strong>
        <p>ユーザーがリンクをクリックして新しいタブで正規サイトを開いている間に、攻撃者が元のタブを偽サイトに差し替える攻撃。ユーザーは元のタブに戻ったときに偽サイトだと気づかず、認証情報を入力してしまいます。</p>
      </div>
    </div>
  )
}
