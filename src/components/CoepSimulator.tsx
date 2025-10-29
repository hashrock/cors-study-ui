import { useState, type ChangeEvent } from 'react'

type CoepPolicy = 'require-corp' | 'unsafe-none'
type CorpPolicy = 'cross-origin' | 'same-origin' | 'none'
type ResourceType = 'script' | 'img' | 'iframe'
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
}

const resourceExamples: Record<ResourceType, { file: string; label: string }> = {
  script: { file: 'evil.js', label: 'script (JavaScript)' },
  img: { file: 'ad.png', label: 'img (画像)' },
  iframe: { file: 'widget.html', label: 'iframe' }
}

export function CoepSimulator() {
  const [coep, setCoep] = useState<CoepPolicy>('unsafe-none')
  const [corp, setCorp] = useState<CorpPolicy>('none')
  const [resourceType, setResourceType] = useState<ResourceType>('script')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('friendly')
  const [activePopover, setActivePopover] = useState<'request' | 'response' | null>(null)

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
    if (coep === 'unsafe-none') {
      return {
        status: 'warning',
        friendly: {
          message: '読み込みOKだけど注意: COEPを無効にすると守りが弱くなります',
          details:
            'COEP: unsafe-none なので外部リソースはそのまま読み込めます。\nただしSharedArrayBufferなどの高機能は安全のため使えません。'
        },
        strict: {
          message: '読み込み成功 (警告付き): COEP無効のため制限なし',
          details:
            'Cross-Origin-Embedder-Policy: unsafe-none\n外部リソースの制限はありませんが、プロセス分離が行われず高機能APIは無効です。'
        }
      }
    }

    if (coep === 'require-corp') {
      if (corp === 'none') {
        return {
          status: 'error',
          friendly: {
            message: 'ブロック: サーバー側が「共有OK」を明示していません',
            details:
              'COEP: require-corp にすると、読み込むリソースに CORP ヘッダーを付けてもらう必要があります。\nヘッダーが無いのでブラウザは読み込みを止めました。'
          },
          strict: {
            message: 'ブロック: Cross-Origin-Resource-Policyヘッダーがありません',
            details:
              'COEP: require-corp が有効な場合、外部リソースには Cross-Origin-Resource-Policy ヘッダーが必須です。'
          }
        }
      }

      if (corp === 'same-origin') {
        return {
          status: 'error',
          friendly: {
            message: 'ブロック: 「同一オリジン専用」の設定なので拒否されました',
            details:
              'CORP: same-origin は同じオリジンからのアクセスだけ許可します。\n今回のような別オリジンからの読み込みでは cross-origin を指定する必要があります。'
          },
          strict: {
            message: 'ブロック: Cross-Origin-Resource-Policy: same-origin は別オリジンを拒否',
            details:
              'same-origin は同一オリジンからの取得のみ許容します。別オリジンに公開するなら cross-origin を設定してください。'
          }
        }
      }

      if (corp === 'cross-origin') {
        return {
          status: 'success',
          friendly: {
            message: '成功: CORPヘッダーがあるので安全に読み込めました',
            details:
              `レスポンスに Cross-Origin-Resource-Policy: cross-origin が付いているためブラウザが受け入れました。\nCOEP: require-corp と組み合わせて SharedArrayBuffer も利用できます。`
          },
          strict: {
            message: '読み込み成功: CORPヘッダーが要件を満たしています',
            details:
              'Cross-Origin-Embedder-Policy: require-corp\nCross-Origin-Resource-Policy: cross-origin\nブラウザはリソースを安全に組み込み、専用ワーカや高機能APIも利用可能です。'
          }
        }
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
      }
    }
  }

  const result = simulate()
  const explanation = result[explanationMode]
  const resourceExample = resourceExamples[resourceType]

  const requestPopover = [
    'mybank.com → sketchy-ads.com',
    `タグ: <${resourceType}> (${resourceExample.label})`,
    `COEP (mybank.com): ${coep}`
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
        '別オリジン (mybank.com) からのアクセスなのでブロックされます'
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
        mybank.com が sketchy-ads.com からリソース（script/img/iframe）を読み込む
      </p>

      <div className="visualization">
        <div className="site-box origin coep">
          <div className="site-name">mybank.com</div>
          <div className="site-label">あなたの銀行サイト</div>
          <div className="box-section">
            <div className="section-title">ページ設定</div>
            <code className="code-block interactive">
              Cross-Origin-Embedder-Policy:<br/>
              <select className="code-select" value={coep} onChange={handleCoepChange}>
                <option value="unsafe-none">unsafe-none (制限なし)</option>
                <option value="require-corp">require-corp (厳格)</option>
              </select>
              <br/><br/>
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
              {' '}
              {'src="https://sketchy-ads.com/'}
              {resourceExample.file}
              {'" />'}
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
            <span className="arrow-label">リソース要求</span>
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
            <span className="arrow-label">レスポンス</span>
            {activePopover === 'response' && (
              <div className="arrow-popover">
                {responsePopover.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
          </button>
        </div>

        <div className="site-box target danger">
          <div className="site-name">sketchy-ads.com</div>
          <div className="site-label">外部リソースサーバー</div>
          <div className="box-section">
            <div className="section-title">レスポンスヘッダー</div>
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
        </div>
      </div>

      <div className="info-box">
        <strong>💡 なぜCOEPが必要？</strong>
        <p>Spectre攻撃から守るため。外部リソースが許可なく読み込まれると、悪意のあるスクリプトがメモリ内の機密情報（パスワードなど）を読み取れる可能性があります。</p>
      </div>
    </div>
  )
}
