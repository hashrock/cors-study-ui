import { useState, type ChangeEvent } from 'react'
import ReactMarkdown from 'react-markdown'

import { CurvedArrow } from './CurvedArrow'
import type { ExplanationMode, ExplanationSet } from '../types/simulator'
import {
  getSWCacheFirstCachedExplanations,
  getSWCacheFirstOfflineErrorExplanations,
  getSWCacheFirstNetworkFetchExplanations,
  getSWNetworkFirstOnlineExplanations,
  getSWNetworkFirstOfflineFallbackExplanations,
  getSWNetworkFirstOfflineErrorExplanations,
  getSWStaleWhileRevalidateExplanations,
  getSWStaleWhileRevalidateInitialExplanations,
  getSWStaleWhileRevalidateOfflineErrorExplanations,
  getSWNetworkOnlyOnlineExplanations,
  getSWNetworkOnlyOfflineErrorExplanations,
  getSWCacheOnlyCachedExplanations,
  getSWCacheOnlyNotCachedErrorExplanations
} from '../explanations/serviceworker'

type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only'
type NetworkStatus = 'online' | 'offline'
type CacheStatus = 'cached' | 'not-cached'
type SimulationStatus = 'success' | 'warning' | 'error'

type SimulationResult = {
  status: SimulationStatus
  explanations: ExplanationSet
  source: string
}

export function ServiceWorkerSimulator() {
  const [cacheStrategy, setCacheStrategy] = useState<CacheStrategy>('network-first')
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('online')
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>('cached')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('friendly')

  const cacheStrategyDescriptions = {
    'cache-first': 'キャッシュを優先。キャッシュがなければネットワークから取得。高速だが更新が遅い。',
    'network-first': 'ネットワークを優先。失敗したらキャッシュから取得。常に最新だが遅い。',
    'stale-while-revalidate': 'キャッシュを即座に返しつつ、バックグラウンドで更新。高速かつ比較的新しい。',
    'network-only': 'キャッシュを使わず常にネットワークから取得。オフラインで動作しない。',
    'cache-only': 'キャッシュのみ使用。ネットワークには一切アクセスしない。完全オフライン。'
  }

  const simulate = (): SimulationResult => {
    // Cache First
    if (cacheStrategy === 'cache-first') {
      if (cacheStatus === 'cached') {
        return {
          status: 'success',
          source: 'キャッシュ',
          explanations: getSWCacheFirstCachedExplanations()
        }
      }

      if (networkStatus === 'offline') {
        return {
          status: 'error',
          source: 'なし',
          explanations: getSWCacheFirstOfflineErrorExplanations()
        }
      }

      return {
        status: 'success',
        source: 'ネットワーク → キャッシュに保存',
        explanations: getSWCacheFirstNetworkFetchExplanations()
      }
    }

    // Network First
    if (cacheStrategy === 'network-first') {
      if (networkStatus === 'online') {
        return {
          status: 'success',
          source: 'ネットワーク',
          explanations: getSWNetworkFirstOnlineExplanations()
        }
      }

      if (cacheStatus === 'cached') {
        return {
          status: 'warning',
          source: 'キャッシュ（フォールバック）',
          explanations: getSWNetworkFirstOfflineFallbackExplanations()
        }
      }

      return {
        status: 'error',
        source: 'なし',
        explanations: getSWNetworkFirstOfflineErrorExplanations()
      }
    }

    // Stale While Revalidate
    if (cacheStrategy === 'stale-while-revalidate') {
      if (cacheStatus === 'cached') {
        return {
          status: 'success',
          source: 'キャッシュ（即座） + バックグラウンド更新',
          explanations: getSWStaleWhileRevalidateExplanations()
        }
      }

      if (networkStatus === 'online') {
        return {
          status: 'success',
          source: 'ネットワーク',
          explanations: getSWStaleWhileRevalidateInitialExplanations()
        }
      }

      return {
        status: 'error',
        source: 'なし',
        explanations: getSWStaleWhileRevalidateOfflineErrorExplanations()
      }
    }

    // Network Only
    if (cacheStrategy === 'network-only') {
      if (networkStatus === 'online') {
        return {
          status: 'success',
          source: 'ネットワーク',
          explanations: getSWNetworkOnlyOnlineExplanations()
        }
      }

      return {
        status: 'error',
        source: 'なし',
        explanations: getSWNetworkOnlyOfflineErrorExplanations()
      }
    }

    // Cache Only
    if (cacheStrategy === 'cache-only') {
      if (cacheStatus === 'cached') {
        return {
          status: 'success',
          source: 'キャッシュ',
          explanations: getSWCacheOnlyCachedExplanations()
        }
      }

      return {
        status: 'error',
        source: 'なし',
        explanations: getSWCacheOnlyNotCachedErrorExplanations()
      }
    }

    return {
      status: 'error',
      source: 'なし',
      explanations: {
        friendly: { message: 'エラー', details: '想定外の組み合わせです。' },
        strict: { message: 'エラー', details: '未対応のケースです。' },
        scenario: { message: 'エラー', details: '未対応のケースです。' },
        javascript: { message: 'エラー', details: '未対応のケースです。' },
        charaboy: { message: 'エラー', details: '未対応のケースです。' }
      }
    }
  }

  const result = simulate()
  const explanation = result.explanations[explanationMode]
  const resultClass = `result ${result.status}`
  const resultIcon = result.status === 'success' ? '✓' : result.status === 'warning' ? '⚠' : '✗'

  return (
    <div className="simulator">
      <h2>Service Worker シミュレーター</h2>
      <p className="description">
        Service Workerのキャッシュ戦略を学習する
      </p>

      <div className="controls">
        <div className="control-group">
          <label>
            <span>キャッシュ戦略</span>
            <span className="hint">Service Workerのfetchイベントでの動作</span>
            <select
              value={cacheStrategy}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const value = event.target.value
                if (value === 'cache-first' || value === 'network-first' ||
                    value === 'stale-while-revalidate' || value === 'network-only' ||
                    value === 'cache-only') {
                  setCacheStrategy(value)
                }
              }}
            >
              <option value="cache-first">Cache First (キャッシュ優先)</option>
              <option value="network-first">Network First (ネットワーク優先)</option>
              <option value="stale-while-revalidate">Stale While Revalidate (推奨)</option>
              <option value="network-only">Network Only (常に最新)</option>
              <option value="cache-only">Cache Only (完全オフライン)</option>
            </select>
          </label>
          <div className="option-description">
            {cacheStrategyDescriptions[cacheStrategy]}
          </div>
        </div>

        <div className="control-group">
          <label>
            <span>ネットワーク状態</span>
            <select
              value={networkStatus}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const value = event.target.value
                if (value === 'online' || value === 'offline') {
                  setNetworkStatus(value)
                }
              }}
            >
              <option value="online">オンライン</option>
              <option value="offline">オフライン</option>
            </select>
          </label>
        </div>

        <div className="control-group">
          <label>
            <span>キャッシュの状態</span>
            <select
              value={cacheStatus}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const value = event.target.value
                if (value === 'cached' || value === 'not-cached') {
                  setCacheStatus(value)
                }
              }}
            >
              <option value="cached">キャッシュあり</option>
              <option value="not-cached">キャッシュなし</option>
            </select>
          </label>
        </div>
      </div>

      <div className="visualization">
        <div className="site-box origin">
          <div className="site-name">ブラウザ</div>
          <div className="site-label">ユーザー</div>
          <div className="box-section">
            <div className="section-title">リクエスト</div>
            <code className="code-block">
              fetch('/api/data')
            </code>
          </div>
        </div>

        <div className="flow-arrows">
          <div className="arrow">
            <CurvedArrow direction="forward" color="#63b3ed" />
            <span className="arrow-label">Fetch Event</span>
          </div>
        </div>

        <div className="site-box target">
          <div className="site-name">Service Worker</div>
          <div className="site-label">Proxy</div>
          <div className="box-section">
            <div className="section-title">戦略</div>
            <code className="code-block" style={{ fontSize: '0.8rem' }}>
              {cacheStrategy === 'cache-first' && 'caches.match() || fetch()'}
              {cacheStrategy === 'network-first' && 'fetch() || caches.match()'}
              {cacheStrategy === 'stale-while-revalidate' && 'caches.match() + fetch()'}
              {cacheStrategy === 'network-only' && 'fetch()'}
              {cacheStrategy === 'cache-only' && 'caches.match()'}
            </code>
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="control-group">
          <label>
            <span>取得元</span>
          </label>
          <div className="option-description" style={{
            background: result.status === 'success' ? 'rgba(72, 187, 120, 0.1)' :
                       result.status === 'warning' ? 'rgba(237, 137, 54, 0.1)' :
                       'rgba(245, 101, 101, 0.1)',
            borderLeftColor: result.status === 'success' ? '#48bb78' :
                            result.status === 'warning' ? '#ed8936' : '#f56565'
          }}>
            {result.source}
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
          実例
        </button>
        <button
          type="button"
          className={explanationMode === 'javascript' ? 'active' : ''}
          onClick={() => setExplanationMode('javascript')}
        >
          JavaScript
        </button>
        <button
          type="button"
          className={explanationMode === 'charaboy' ? 'active' : ''}
          onClick={() => setExplanationMode('charaboy')}
        >
          チャラ男
        </button>
      </div>

      <div className={resultClass}>
        <div className="result-icon">{resultIcon}</div>
        <div className="result-content">
          <div className="result-message">{explanation.message}</div>
          <div className="result-details markdown-content">
            <ReactMarkdown>{explanation.details}</ReactMarkdown>
          </div>
        </div>
      </div>

      <div className="info-box">
        <strong>📚 仕様書リンク</strong>
        <p>
          <a href="https://w3c.github.io/ServiceWorker/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            Service Worker Specification (W3C)
          </a>
        </p>
        <p>
          <a href="https://developer.mozilla.org/ja/docs/Web/API/Service_Worker_API" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            MDN: Service Worker API ガイド
          </a>
        </p>
        <p>
          <a href="https://web.dev/offline-fallback-page/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            web.dev: オフラインfallbackの作り方
          </a>
        </p>
        <p>
          <a href="https://www.youtube.com/watch?v=ksXwaWHCW6k" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            YouTube: Google I/O PWA Caching Strategies
          </a>
        </p>
        <p>
          <a href="https://developer.chrome.com/docs/workbox/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            Workbox: 代表的なキャッシュ戦略テンプレート
          </a>
        </p>
      </div>

      <div className="faq-section">
        <h3>よくある質問 (FAQ)</h3>

        <div className="faq-item">
          <div className="faq-question">Q. Service Workerを使うにはHTTPSが必須ですか？</div>
          <div className="faq-answer">
            はい、セキュリティ上の理由で本番環境ではHTTPSが必須です。ただし、開発用に<code>localhost</code>は例外として許可されています。Service Workerは強力な機能なので、中間者攻撃を防ぐためHTTPSが要求されます。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. どのキャッシュ戦略を使えばいいですか？</div>
          <div className="faq-answer">
            一般的に<code>Stale While Revalidate</code>が最もバランスが良く推奨されます。静的アセット（CSS/JS）は<code>Cache First</code>、APIレスポンスは<code>Network First</code>、リアルタイムデータは<code>Network Only</code>というように、リソースの種類に応じて使い分けます。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. Service Workerの更新はどうやって反映されますか？</div>
          <div className="faq-answer">
            ユーザーがサイトを再訪問したとき、ブラウザは新しいService Workerファイルをチェックします。変更があれば新しいService Workerがインストールされますが、アクティベートされるのは既存のページが全て閉じられた後です。<code>skipWaiting()</code>で即座に適用することも可能ですが、注意が必要です。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. Service WorkerとCORSの関係は？</div>
          <div className="faq-answer">
            Service Workerがfetchイベントでクロスオリジンリクエストをインターセプトする場合、通常のCORSルールが適用されます。<code>fetch(url, {'{'}mode: 'cors'{'}'})</code>のように明示的に指定し、サーバー側で適切なCORSヘッダーを返す必要があります。
          </div>
        </div>

        <div className="faq-item">
          <div className="faq-question">Q. デバッグ方法は？</div>
          <div className="faq-answer">
            Chrome DevToolsの「Application」タブ → 「Service Workers」でライフサイクル、状態、登録解除ができます。「Cache Storage」でキャッシュの中身も確認できます。ネットワークタブで「Disable cache」にチェックを入れると、Service Workerのキャッシュは有効なままブラウザキャッシュだけ無効化できます。
          </div>
        </div>
      </div>
    </div>
  )
}
