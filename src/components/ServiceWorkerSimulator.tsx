import { useState, type ChangeEvent } from 'react'

type ExplanationMode = 'friendly' | 'strict'
type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only'
type NetworkStatus = 'online' | 'offline'
type CacheStatus = 'cached' | 'not-cached'
type SimulationStatus = 'success' | 'warning' | 'error'

type Explanation = {
  message: string
  details: string
}

type SimulationResult = {
  status: SimulationStatus
  friendly: Explanation
  strict: Explanation
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
          friendly: {
            message: '成功: キャッシュから即座に取得',
            details:
              'キャッシュにデータがあったので、ネットワークにアクセスせず高速に表示できました。\n\n具体例: ニュースアプリで一度読んだ記事をオフラインでも読めるようにする場合に最適です。読み込みが非常に速く、通信量も節約できます。ただし、記事が更新されても古いバージョンが表示される可能性があります。'
          },
          strict: {
            message: '成功: Cache Hit',
            details:
              '仕様: Service Worker Fetch Event\nhttps://w3c.github.io/ServiceWorker/#fetch-event\n\nキャッシュストレージからレスポンスを返しました。ネットワークリクエストは発生していません。\n\nパフォーマンス: 最速\n鮮度: 低（更新されない）'
          }
        }
      }

      if (networkStatus === 'offline') {
        return {
          status: 'error',
          source: 'なし',
          friendly: {
            message: 'エラー: キャッシュもネットワークもありません',
            details:
              'キャッシュになく、ネットワークもオフラインなので取得できませんでした。\n\n具体例: 初めて訪れたサイトをオフラインで開こうとした場合です。Service Workerはキャッシュを探しましたが見つからず、ネットワークからも取得できませんでした。'
          },
          strict: {
            message: 'エラー: Cache Miss & Network Unavailable',
            details:
              'キャッシュストレージにエントリが存在せず、ネットワークも利用できないため、リクエストが失敗しました。'
          }
        }
      }

      return {
        status: 'success',
        source: 'ネットワーク → キャッシュに保存',
        friendly: {
          message: '成功: ネットワークから取得してキャッシュに保存',
          details:
            'キャッシュになかったのでネットワークから取得し、次回のためにキャッシュに保存しました。\n\n具体例: 初めて記事を開いたときです。ネットワークからダウンロードしてキャッシュに保存したので、次回からは高速に表示できます。'
        },
        strict: {
          message: '成功: Cache Miss → Network Fetch → Cache Store',
          details:
            'キャッシュにエントリがないため、ネットワークからリソースを取得し、Cache APIに保存しました。'
        }
      }
    }

    // Network First
    if (cacheStrategy === 'network-first') {
      if (networkStatus === 'online') {
        return {
          status: 'success',
          source: 'ネットワーク',
          friendly: {
            message: '成功: 最新データをネットワークから取得',
            details:
              'ネットワークから最新のデータを取得できました。\n\n具体例: SNSのタイムラインやニュースフィードなど、常に最新の情報を表示したい場合に最適です。多少遅くても、最新の投稿が見られます。'
          },
          strict: {
            message: '成功: Network Fetch',
            details:
              '仕様: Fetch API\nhttps://fetch.spec.whatwg.org/\n\nネットワークからリソースを取得し、キャッシュも更新しました。\n\nパフォーマンス: 遅い\n鮮度: 最高（常に最新）'
          }
        }
      }

      if (cacheStatus === 'cached') {
        return {
          status: 'warning',
          source: 'キャッシュ（フォールバック）',
          friendly: {
            message: '警告: オフラインなのでキャッシュから取得',
            details:
              'ネットワークがオフラインなので、少し古いかもしれませんがキャッシュから取得しました。\n\n具体例: 電車の中でSNSを見ているときに圏外になりました。最新の投稿は見られませんが、以前読み込んだ投稿はキャッシュから表示できます。'
          },
          strict: {
            message: '警告: Network Failed → Cache Fallback',
            details:
              'ネットワークリクエストが失敗したため、キャッシュにフォールバックしました。データは古い可能性があります。'
          }
        }
      }

      return {
        status: 'error',
        source: 'なし',
        friendly: {
          message: 'エラー: オフラインでキャッシュもありません',
          details:
            'ネットワークがオフラインで、キャッシュもないため取得できませんでした。\n\n具体例: オフライン時に初めて訪れるページを開こうとした場合です。'
          },
        strict: {
          message: 'エラー: Network Failed & No Cache',
          details:
            'ネットワークリクエストが失敗し、キャッシュにもエントリが存在しないため、リクエストが失敗しました。'
        }
      }
    }

    // Stale While Revalidate
    if (cacheStrategy === 'stale-while-revalidate') {
      if (cacheStatus === 'cached') {
        return {
          status: 'success',
          source: 'キャッシュ（即座） + バックグラウンド更新',
          friendly: {
            message: '成功: キャッシュを即座に返しつつバックグラウンドで更新',
            details:
              'キャッシュから即座に表示し、同時にバックグラウンドでネットワークから最新版を取得してキャッシュを更新しています。次回は更新されたデータが表示されます。\n\n具体例: ニュースサイトで記事一覧を表示する場合、古いリストを即座に表示しつつ、裏で最新のリストを取得します。ユーザーは待たされず、次に開いたときには最新版が表示されます。ベストプラクティスとされる戦略です。'
          },
          strict: {
            message: '成功: Stale-While-Revalidate Strategy',
            details:
              '仕様: HTTP Cache-Control: stale-while-revalidate\nhttps://tools.ietf.org/html/rfc5861\n\nキャッシュされたレスポンスを即座に返し、並行してネットワークリクエストを発行してキャッシュを更新します。\n\nパフォーマンス: 高速（キャッシュ）\n鮮度: 高（次回から最新）'
          }
        }
      }

      if (networkStatus === 'online') {
        return {
          status: 'success',
          source: 'ネットワーク',
          friendly: {
            message: '成功: 初回はネットワークから取得',
            details:
              'キャッシュがないので今回はネットワークから取得しました。次回からはキャッシュを即座に返しつつバックグラウンド更新します。'
          },
          strict: {
            message: '成功: No Cache → Network Fetch',
            details:
              'キャッシュエントリが存在しないため、ネットワークから取得し、Cache APIに保存しました。'
          }
        }
      }

      return {
        status: 'error',
        source: 'なし',
        friendly: {
          message: 'エラー: オフラインで初回アクセス',
          details: 'キャッシュがなく、オフラインなので取得できませんでした。'
        },
        strict: {
          message: 'エラー: No Cache & Network Unavailable',
          details: 'キャッシュが存在せず、ネットワークも利用できないため失敗しました。'
        }
      }
    }

    // Network Only
    if (cacheStrategy === 'network-only') {
      if (networkStatus === 'online') {
        return {
          status: 'success',
          source: 'ネットワーク',
          friendly: {
            message: '成功: 常にネットワークから最新を取得',
            details:
              'キャッシュを使わず、常にネットワークから取得します。\n\n具体例: APIリクエストや動的コンテンツなど、キャッシュしてはいけないデータに使います。株価情報や天気など、常に最新が必要な場合です。'
          },
          strict: {
            message: '成功: Network Only Strategy',
            details:
              'Cache APIを使用せず、常にネットワークリクエストを発行します。オフラインでは動作しません。'
          }
        }
      }

      return {
        status: 'error',
        source: 'なし',
        friendly: {
          message: 'エラー: オフラインでは動作しません',
          details:
            'Network Onlyはキャッシュを使わないため、オフラインでは何も表示できません。\n\n具体例: リアルタイムデータが必要なアプリで、オフライン時にエラーを表示する場合です。'
        },
        strict: {
          message: 'エラー: Network Unavailable',
          details:
            'Network Only戦略ではキャッシュを使用しないため、ネットワークが利用できない場合は必ず失敗します。'
        }
      }
    }

    // Cache Only
    if (cacheStrategy === 'cache-only') {
      if (cacheStatus === 'cached') {
        return {
          status: 'success',
          source: 'キャッシュ',
          friendly: {
            message: '成功: 完全オフライン動作',
            details:
              'ネットワークに一切アクセスせず、キャッシュのみで動作します。\n\n具体例: プリキャッシュした静的アセット（HTML、CSS、JS）を表示する場合です。インストール時にすべてダウンロード済みなので、完全オフラインで動作します。'
          },
          strict: {
            message: '成功: Cache Only Strategy',
            details:
              'ネットワークリクエストを一切発行せず、Cache APIからのみレスポンスを返します。完全オフライン対応。'
          }
        }
      }

      return {
        status: 'error',
        source: 'なし',
        friendly: {
          message: 'エラー: キャッシュにありません',
          details:
            'Cache Onlyはネットワークを使わないため、キャッシュにないものは取得できません。\n\n具体例: プリキャッシュし忘れたファイルにアクセスした場合です。'
        },
        strict: {
          message: 'エラー: No Cache Entry',
          details:
            'Cache Only戦略ではネットワークを使用しないため、キャッシュにエントリがない場合は必ず失敗します。'
        }
      }
    }

    return {
      status: 'error',
      source: 'なし',
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
            <span className="arrow-line">→</span>
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
      </div>

      <div className={resultClass}>
        <div className="result-icon">{resultIcon}</div>
        <div className="result-content">
          <div className="result-message">{explanation.message}</div>
          <div className="result-details">{explanation.details}</div>
        </div>
      </div>

      <div className="info-box">
        <strong>📚 仕様書リンク</strong>
        <p>
          <a href="https://w3c.github.io/ServiceWorker/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            Service Worker Specification (W3C)
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
