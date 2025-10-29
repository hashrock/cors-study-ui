import { useState, type ChangeEvent } from 'react'

import { CurvedArrow } from './CurvedArrow'

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
              `キャッシュにヒットしたため、ネットワークに触れずにミリ秒単位でレスポンスを返せました。ユーザーはローディング表示を見る前にコンテンツが描画されます。

ステップ:
1. fetch イベントで caches.match(event.request) を実行。
2. 一致する Response が見つかり、そのまま event.respondWith(cachedResponse)。
3. ネットワークアクセスは発生せず、バッテリーと回線を節約できます。

擬似コード:
\`\`\`js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
    })
  )
})
\`\`\`

具体例: ニュースアプリで一度読んだ記事を地下鉄でオフライン表示するケース。表示は速いものの、サーバー側で記事が更新されても即座には反映されない点に注意が必要です。`
          },
          strict: {
            message: '成功: Cache Hit',
            details:
              `仕様: Service Worker Fetch Event\nhttps://w3c.github.io/ServiceWorker/#fetch-event\n\nブラウザ内部:\n• FetchEvent.respondWith() に Cache.match() の結果を指定。\n• network layer は short-circuit され、HTTP リクエストは発生しません。\n• DevTools > Application > Cache Storage にヒット履歴が表示されます。\n\n評価:\n• パフォーマンス: 最速 (TTFB ≒ 0)\n• 鮮度: 低 (更新されない)\n• リスク: コンテンツが古いまま残るため、revalidation の仕組みを別途用意することが推奨されます。`
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
              `キャッシュにもデータがなく、端末はオフラインのためレスポンスを組み立てられませんでした。

典型例: 初めて訪れた記事を機内モードで開こうとした場合。Service Worker は caches.match() で外れたあと fetch() を試しますが、オフラインなので reject され、ハンドリングできなければ落ちます。

擬似コード（失敗パターン）:
\`\`\`js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request) // オフラインで失敗
    })
  )
})
\`\`\`

回避策: オフライン用のプレースホルダー HTML を用意し、fallback レスポンスを返すようにする。`
          },
          strict: {
            message: 'エラー: Cache Miss & Network Unavailable',
            details:
              `Cache Storage miss -> fetch(event.request) が失敗 (TypeError: Failed to fetch)。fetch イベントで fallback を返さない限り、ブラウザはネットワークエラー画面を表示します。オフライン対応では offline.html を返すなどのハンドリングが必須です。`
          }
        }
      }

      return {
        status: 'success',
        source: 'ネットワーク → キャッシュに保存',
        friendly: {
          message: '成功: ネットワークから取得してキャッシュに保存',
          details:
            `キャッシュに見つからなかったため、一度ネットワークへフォールバックし、レスポンスを Cache Storage に保存しました。次回以降は高速になります。

ステップ:
1. caches.match() が null を返す。
2. fetch(event.request) で最新データを取得。
3. 取得した Response を clone() して caches.open().put() で保存。
4. ネットワークレスポンスをユーザーへ返却。

擬似コード:
\`\`\`js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((networkRes) => {
        const copy = networkRes.clone()
        caches.open('app-shell').then((cache) => cache.put(event.request, copy))
        return networkRes
      })
    })
  )
})
\`\`\`

ユースケース: 初訪問のニュース記事。オンライン時に取得しておけば、次の地下鉄移動でも同じ記事を読めます。`
        },
        strict: {
          message: '成功: Cache Miss → Network Fetch → Cache Store',
          details:
            `Cache miss -> fetch -> caches.open(cacheName).put(request, responseClone) のパターン。FetchEvent は Promise チェーンを通して最終的にネットワークレスポンスを返します。

注意: レスポンスを put するには response.clone() が必要。clone しないとストリーム消費済みで例外になります。`
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
              `まずネットワークから最新のレスポンスを取得し、成功したらキャッシュにも保存しました。多少遅くても最新を優先したいケースで使います。

フロー:
1. fetch(event.request) を試みる。
2. 成功したレスポンスを clone() して caches.open().put()。
3. 取得できなかった場合のみ caches.match() へフォールバックする実装が一般的です。

擬似コード:
\`\`\`js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkRes) => {
        const copy = networkRes.clone()
        caches.open('dynamic').then((cache) => cache.put(event.request, copy))
        return networkRes
      })
      .catch(() => caches.match(event.request))
  )
})
\`\`\`

具体例: SNS タイムライン。通信状態が良ければ常に最新投稿を表示し、圏外時のみ過去の投稿を見せることができます。`
        },
        strict: {
          message: '成功: Network Fetch',
          details:
              `仕様: Fetch API + Cache API
https://fetch.spec.whatwg.org/

ブラウザ動作:
• network stack から Response を取得し、成功時に Cache.put で更新。
• ネットワーク待ちのため TTFB はキャッシュ優先より遅いが、鮮度は最も高い。
• DevTools Network タブでステータス 200 (from service worker) と表示され、Update 箇所に (network) と記録されます。

評価:
• パフォーマンス: 中 (ネットワーク往復)
• 鮮度: 高
• 耐障害性: ネットワーク失敗時はフォールバックが必要`
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
              `fetch がタイムアウトまたは失敗したため、最後に保存しておいたキャッシュを返しました。データは古い可能性がありますが、最低限の閲覧体験を提供できます。

例: 電車で圏外になった際、SNS タイムラインは最新の投稿取得に失敗しますが、過去にキャッシュした投稿は表示可能です。

ポイント:
• ネットワークエラーを catch し caches.match() を呼び出す実装にしておく。
• UI では「オフライン表示」などのバッジを出してユーザーに伝えるのが推奨されます。`
          },
          strict: {
            message: '警告: Network Failed → Cache Fallback',
            details:
              `fetch(event.request) が失敗 (TypeError) したため catch 節で caches.match() を実行。Service Worker は Promise を返し続けるためアプリは落ちませんが、レスポンスの Last-Modified/ETag は更新されないためデータ整合性に注意が必要です。`
          }
        }
      }

      return {
        status: 'error',
        source: 'なし',
        friendly: {
          message: 'エラー: オフラインでキャッシュもありません',
          details:
            `ネットワークが利用できず、キャッシュにもバックアップが無いためリソースを生成できませんでした。初めて訪れるページをオフラインで開いたときに起きます。

改善策: offline.html をキャッシュしておき、event.respondWith(caches.match('offline.html')) を返す設計にすると UX が向上します。`
        },
        strict: {
          message: 'エラー: Network Failed & No Cache',
          details:
            `fetch(event.request) が失敗し、caches.match() も null を返すため、Service Worker は最終的にエラーを投げます。ブラウザはネットワークエラーページを表示します。fallback ルートを用意すること。`
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
              `即時にキャッシュを返して UX を維持しつつ、裏でネットワークリクエストを走らせてキャッシュを最新化しました。次回アクセスでは更新済みデータが利用されます。

擬似コード:
\`\`\`js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkPromise = fetch(event.request).then((networkRes) => {
        caches.open('dynamic').then((cache) => cache.put(event.request, networkRes.clone()))
        return networkRes
      })
      // キャッシュがあれば即座に返し、無ければネットワーク待ち
      return cached || networkPromise
    })
  )
})
\`\`\`

例: ニュース一覧や商品リスト。ユーザーは既存情報をすぐ見られ、数秒後の再表示で最新に置き換わります。`
          },
          strict: {
            message: '成功: Stale-While-Revalidate Strategy',
            details:
              `仕様: HTTP Cache-Control: stale-while-revalidate / Service Worker pattern
https://tools.ietf.org/html/rfc5861

内部処理:
• respondWith() で cache.match() の結果を返しつつ、別途 fetch() を kick。
• networkPromise が解決すると caches.put() で更新。
• Navigation Preload と組み合わせると更に高速化可能。

評価:
• パフォーマンス: 高速 (即座にキャッシュ)
• 鮮度: 次回以降は最新
• 実装コスト: 中 (Promise を 2 系統管理する必要あり)`
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
              `キャッシュにまだリソースが無いため、初回だけネットワークから取得しました。取得後に Cache Storage に保存しておくので、次回アクセスはキャッシュヒットで高速化されます。`
        },
        strict: {
          message: '成功: No Cache → Network Fetch',
          details:
              `Cache miss -> fetch -> caches.open(cacheName).put() を実行。次回同じ URL で stale-while-revalidate フローが成立します。`
        }
      }
      }

      return {
        status: 'error',
        source: 'なし',
        friendly: {
          message: 'エラー: オフラインで初回アクセス',
          details: 'キャッシュがなく、オフラインなので取得できませんでした。初回アクセス時は少なくともプレースホルダーレスポンスを返す設計にしておくと良いでしょう。'
        },
        strict: {
          message: 'エラー: No Cache & Network Unavailable',
          details: 'キャッシュが存在せず、ネットワークも利用できないため失敗しました。fallback レスポンスを respondWith する分岐を追加すること。'
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
              `Cache API を使わず、毎回 fetch(event.request) の結果をそのまま返しました。株価や天気など最新性が命のデータに向いています。

擬似コード:
\`\`\`js
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
\`\`\`

メリット: 常に最新。デメリット: オフラインでは動作せず、遅延はネットワーク品質に依存します。`
        },
        strict: {
          message: '成功: Network Only Strategy',
          details:
              `Service Worker 内で caches.match() を呼ばず、fetch(event.request) をそのまま返却。ブラウザは通常のネットワークパスを辿ります。Offline 時は常に失敗するため、fallback UI やメッセージ表示が必要です。`
        }
      }
      }

      return {
        status: 'error',
        source: 'なし',
        friendly: {
          message: 'エラー: オフラインでは動作しません',
          details:
            `Network Only はキャッシュを使わないため、オフラインでは常にエラーになります。リアルタイム株価アプリなどでは「接続できません」メッセージを表示する設計にします。`
        },
        strict: {
          message: 'エラー: Network Unavailable',
          details:
            `fetch(event.request) が失敗した時点で respondWith の Promise が reject され、ブラウザはネットワークエラーページを表示します。キャッシュを全く使わない戦略ゆえのトレードオフです。`
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
              `インストール時にプリキャッシュしておいたリソースだけでページを描画しました。ネットワークへは一切アクセスしません。

擬似コード:
\`\`\`js
const OFFLINE_ASSETS = ['/index.html', '/app.js', '/styles.css']
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-shell').then((cache) => cache.addAll(OFFLINE_ASSETS))
  )
})
self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request))
})
\`\`\`

具体例: PWA のアプリシェル。初回インストール時に必要なファイルをプリロードすれば、飛行機内でも完全に動作します。`
          },
          strict: {
            message: '成功: Cache Only Strategy',
            details:
              `FetchEvent.respondWith(caches.match(request)) のみを実行。ネットワークにフォールバックしないため、プリキャッシュが前提です。Install フェーズで cache.addAll() を忘れると 404 になります。`
          }
        }
      }

      return {
        status: 'error',
        source: 'なし',
        friendly: {
          message: 'エラー: キャッシュにありません',
          details:
            `Cache Only はネットワークを試さないので、プリキャッシュしていないリソースは取得できません。install イベントで asset を追加し忘れたときに起きます。`
        },
        strict: {
          message: 'エラー: No Cache Entry',
          details:
            `caches.match() が null を返すと respondWith の Promise が reject され、ブラウザは 504 相当のエラーページを表示します。ネットワークを試さない設計なので失敗は不可避。`
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
