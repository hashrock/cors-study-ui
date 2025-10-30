import { useState, type ChangeEvent } from 'react'
import ReactMarkdown from 'react-markdown'

import { CurvedArrow } from './CurvedArrow'
import type { ExplanationMode, ExplanationSet } from '../types/simulator'
import {
  getCoopBothUnsafeExplanations,
  getCoopSocialSameOriginExplanations,
  getCoopAllowPopupsExplanations,
  getCoopBankSameOriginExplanations
} from '../explanations/coop'

type SocialPolicy = 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin'
type BankPolicy = 'unsafe-none' | 'same-origin'
type SimulationStatus = 'success' | 'warning' | 'error'

type SimulationResult = {
  status: SimulationStatus
  explanations: ExplanationSet
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
        explanations: getCoopBothUnsafeExplanations(),
        openerAccess: 'window.opener !== null (アクセス可能)'
      }
    }

    if (coopSocial === 'same-origin') {
      return {
        status: 'success',
        explanations: getCoopSocialSameOriginExplanations(),
        openerAccess: 'window.opener === null (アクセス不可)'
      }
    }

    if (coopSocial === 'same-origin-allow-popups') {
      return {
        status: 'success',
        explanations: getCoopAllowPopupsExplanations(),
        openerAccess: 'window.opener === null (アクセス不可)'
      }
    }

    if (coopBank === 'same-origin') {
      return {
        status: 'success',
        explanations: getCoopBankSameOriginExplanations(),
        openerAccess: 'window.opener === null (アクセス不可)'
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
      },
      openerAccess: 'window.opener === null'
    }
  }

  const result = simulate()
  const explanation = result.explanations[explanationMode]

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
