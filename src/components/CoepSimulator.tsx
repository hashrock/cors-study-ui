import { useState, type ChangeEvent } from 'react'

export function CoepSimulator() {
  const [coep, setCoep] = useState<'require-corp' | 'unsafe-none'>('unsafe-none')
  const [corp, setCorp] = useState<'cross-origin' | 'same-origin' | 'none'>('none')
  const [resourceType, setResourceType] = useState<'script' | 'img' | 'iframe'>('script')

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

  const simulate = () => {
    // COEPが無効の場合は常に読み込める
    if (coep === 'unsafe-none') {
      return {
        success: true,
        message: '読み込み成功: COEP無効のため全てのリソースを読み込めます',
        details: 'Cross-Origin-Embedder-Policy: unsafe-none\nすべての外部リソースが読み込まれますが、SharedArrayBufferなどの機能は使えません。',
        warning: true
      }
    }

    // COEPが有効な場合
    if (coep === 'require-corp') {
      if (corp === 'none') {
        return {
          success: false,
          message: 'ブロック: Cross-Origin-Resource-Policyヘッダーがありません',
          details: 'COEP: require-corpが有効な場合、外部リソースにはCross-Origin-Resource-Policyヘッダーが必要です。',
          warning: false
        }
      }

      if (corp === 'same-origin') {
        return {
          success: false,
          message: 'ブロック: Cross-Origin-Resource-Policy: same-originは別オリジンでは使えません',
          details: 'same-originは同一オリジンのリソースのみ許可します。cross-originを設定してください。',
          warning: false
        }
      }

      if (corp === 'cross-origin') {
        return {
          success: true,
          message: '読み込み成功: CORPヘッダーが正しく設定されています',
          details: 'Cross-Origin-Embedder-Policy: require-corp\nCross-Origin-Resource-Policy: cross-origin\nリソースは安全に読み込まれ、SharedArrayBufferも使用可能です。',
          warning: false
        }
      }
    }

    return {
      success: false,
      message: 'エラー',
      details: '',
      warning: false
    }
  }

  const result = simulate()

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
          <code className="code-block">
            Cross-Origin-Embedder-Policy:<br/>
            {coep}
            <br/><br/>
            {'<'}{resourceType} src="https://sketchy-ads.com/{resourceType === 'script' ? 'evil.js' : resourceType === 'img' ? 'ad.png' : 'widget.html'}" {'/>'}
          </code>
        </div>

        <div className="arrow">
          <div className="arrow-line">←</div>
          <div className="arrow-label">リソース読み込み</div>
        </div>

        <div className="site-box target danger">
          <div className="site-name">sketchy-ads.com</div>
          <div className="site-label">外部リソースサーバー</div>
          <code className="code-block">
            Cross-Origin-Resource-Policy:<br/>
            {corp === 'none' ? '(なし)' : corp}
          </code>
        </div>
      </div>

      <div className="controls">
        <div className="control-group">
          <label>
            <strong>Cross-Origin-Embedder-Policy</strong>
            <span className="hint">(mybank.comのレスポンスヘッダー)</span>
          </label>
          <select value={coep} onChange={handleCoepChange}>
            <option value="unsafe-none">unsafe-none (デフォルト、制限なし)</option>
            <option value="require-corp">require-corp (厳格モード)</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <strong>Cross-Origin-Resource-Policy</strong>
            <span className="hint">(sketchy-ads.comのレスポンスヘッダー)</span>
          </label>
          <select value={corp} onChange={handleCorpChange}>
            <option value="none">なし</option>
            <option value="same-origin">same-origin (同一オリジンのみ)</option>
            <option value="cross-origin">cross-origin (全て許可)</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <strong>リソースタイプ</strong>
          </label>
          <select value={resourceType} onChange={handleResourceTypeChange}>
            <option value="script">script (JavaScript)</option>
            <option value="img">img (画像)</option>
            <option value="iframe">iframe</option>
          </select>
        </div>
      </div>

      <div className={`result ${result.success ? (result.warning ? 'warning' : 'success') : 'error'}`}>
        <div className="result-icon">{result.success ? (result.warning ? '⚠' : '✓') : '✗'}</div>
        <div className="result-content">
          <div className="result-message">{result.message}</div>
          <div className="result-details">{result.details}</div>
        </div>
      </div>

      <div className="info-box">
        <strong>💡 なぜCOEPが必要？</strong>
        <p>Spectre攻撃から守るため。外部リソースが許可なく読み込まれると、悪意のあるスクリプトがメモリ内の機密情報（パスワードなど）を読み取れる可能性があります。</p>
      </div>
    </div>
  )
}
