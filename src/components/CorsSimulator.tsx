import { useState } from 'react'

export function CorsSimulator() {
  const [allowOrigin, setAllowOrigin] = useState<'*' | 'myapp.com' | 'none'>('none')
  const [credentials, setCredentials] = useState<'include' | 'same-origin' | 'omit'>('omit')
  const [method, setMethod] = useState<'GET' | 'POST'>('GET')

  const simulate = () => {
    // CORSのロジック
    if (allowOrigin === 'none') {
      return {
        success: false,
        message: 'ブロック: Access-Control-Allow-Originヘッダーがありません',
        details: 'サーバーがCORSを許可していません。ブラウザがリクエストをブロックしました。'
      }
    }

    if (credentials === 'include' && allowOrigin === '*') {
      return {
        success: false,
        message: 'ブロック: credentialsモードでワイルドカード(*)は使えません',
        details: 'credentials: includeを使う場合、Access-Control-Allow-Originに具体的なオリジンを指定する必要があります。'
      }
    }

    return {
      success: true,
      message: '成功: APIからデータを取得できました',
      details: `Access-Control-Allow-Origin: ${allowOrigin === '*' ? '*' : 'https://myapp.com'}\ncredentials: ${credentials}\nmethod: ${method}`
    }
  }

  const result = simulate()

  return (
    <div className="simulator">
      <h2>CORS シミュレーター</h2>
      <p className="description">
        myapp.com から weather-api.com へAPIリクエストを送信
      </p>

      <div className="visualization">
        <div className="site-box origin">
          <div className="site-name">myapp.com</div>
          <div className="site-label">あなたのサイト</div>
          <code className="code-block">
            fetch('https://weather-api.com/data', {'{'}<br/>
            &nbsp;&nbsp;credentials: '{credentials}',<br/>
            &nbsp;&nbsp;method: '{method}'<br/>
            {'}'})
          </code>
        </div>

        <div className="arrow">
          <div className="arrow-line">→</div>
          <div className="arrow-label">HTTP Request</div>
        </div>

        <div className="site-box target">
          <div className="site-name">weather-api.com</div>
          <div className="site-label">天気APIサーバー</div>
          <code className="code-block">
            Access-Control-Allow-Origin:<br/>
            {allowOrigin === 'none' ? '(なし)' : allowOrigin === '*' ? '*' : 'https://myapp.com'}
          </code>
        </div>
      </div>

      <div className="controls">
        <div className="control-group">
          <label>
            <strong>Access-Control-Allow-Origin</strong>
            <span className="hint">(サーバー側のレスポンスヘッダー)</span>
          </label>
          <select value={allowOrigin} onChange={(e) => setAllowOrigin(e.target.value as any)}>
            <option value="none">なし (CORS無効)</option>
            <option value="myapp.com">https://myapp.com</option>
            <option value="*">* (全てのオリジンを許可)</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <strong>credentials</strong>
            <span className="hint">(fetch()のオプション)</span>
          </label>
          <select value={credentials} onChange={(e) => setCredentials(e.target.value as any)}>
            <option value="omit">omit (Cookieを送らない)</option>
            <option value="same-origin">same-origin (同一オリジンのみ)</option>
            <option value="include">include (常に送る)</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <strong>HTTPメソッド</strong>
          </label>
          <select value={method} onChange={(e) => setMethod(e.target.value as any)}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>
      </div>

      <div className={`result ${result.success ? 'success' : 'error'}`}>
        <div className="result-icon">{result.success ? '✓' : '✗'}</div>
        <div className="result-content">
          <div className="result-message">{result.message}</div>
          <div className="result-details">{result.details}</div>
        </div>
      </div>
    </div>
  )
}
