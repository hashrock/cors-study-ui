import type { ExplanationSet } from '../types/simulator'

// Cache First - Cached
export function getSWCacheFirstCachedExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '成功: キャッシュから即座に取得',
      details: `キャッシュにヒットしたため、ネットワークに触れずにミリ秒単位でレスポンスを返せました。ユーザーはローディング表示を見る前にコンテンツが描画されます。

具体例: ニュースアプリで一度読んだ記事を地下鉄でオフライン表示するケース。表示は速いものの、サーバー側で記事が更新されても即座には反映されない点に注意が必要です。`
    },
    strict: {
      message: '成功: Cache Hit',
      details: `仕様: Service Worker Fetch Event
https://w3c.github.io/ServiceWorker/#fetch-event

ブラウザ内部:
• FetchEvent.respondWith() に Cache.match() の結果を指定。
• network layer は short-circuit され、HTTP リクエストは発生しません。
• DevTools > Application > Cache Storage にヒット履歴が表示されます。

評価:
• パフォーマンス: 最速 (TTFB ≒ 0)
• 鮮度: 低 (更新されない)
• リスク: コンテンツが古いまま残るため、revalidation の仕組みを別途用意することが推奨されます。`
    },
    scenario: {
      message: '実例説明: 高速表示',
      details: `例1: PWAニュースアプリが記事をキャッシュ。オフラインでも既読記事を瞬時に表示可能。

例2: ECサイトが商品画像をCache First戦略でキャッシュ。2回目以降の閲覧が超高速に。

例3: ドキュメントサイトがCSSとJSをキャッシュ。ページ遷移がほぼ瞬時に完了。

チャラ男の視点: キャッシュ優先だと、彼女ちゃん（ブラウザ）は昔のデータ（古い情報）を見続けちゃう。俺（攻撃者）が更新したフィッシングページも気づかれないかも♪`
    },
    javascript: {
      message: 'JavaScript説明: Cache First',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached // キャッシュから即返却
      return fetch(event.request) // なければネットワーク
    })
  )
})
\`\`\`

キャッシュ優先で最速表示を実現します。`
    },
    charaboy: {
      message: 'チャラ男説明: 古いデータで騙せる？',
      details: `**彼氏くん見てる〜？Cache Firstって古いデータ使うよね〜**

チャラ男くん「よっ彼氏くん！Cache First戦略だと、**彼女ちゃん（ブラウザ）は一度キャッシュしたら、ずっと古いデータ見ちゃうんだよね〜**。もし俺がサーバー側で内容更新しても気づかないわけ♪」

彼女ちゃん「え…？古いデータ…？」

彼氏くん「確かにCache Firstは高速だけど、**更新が反映されにくい**のが弱点だな」

チャラ男くん「そうそう♪ もし俺がフィッシングページ仕込んで、それがキャッシュされちゃったら、**彼女ちゃんはずっと偽ページ見続けちゃう**かもね〜。でもまぁ、**適切にrevalidation設定してたら俺も手が出せないけどさ**〜♡」

彼氏くん「**定期的にキャッシュ更新する仕組みが必要だな**」`
    }
  }
}

// Network First - Online
export function getSWNetworkFirstOnlineExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '成功: ネットワークから最新データを取得',
      details: `ネットワークが利用可能なため、サーバーから最新データを取得できました。常に新しい情報を表示できますが、通信が遅い環境では待ち時間が発生します。`
    },
    strict: {
      message: '成功: Network Fetch Success',
      details: `fetch(event.request) が成功し、最新のレスポンスを取得。キャッシュは fallback として機能します。`
    },
    scenario: {
      message: '実例説明: 常に最新',
      details: `例1: SNSアプリのタイムラインはNetwork Firstで常に最新投稿を表示。オフライン時はキャッシュから表示。

例2: 株価アプリがリアルタイム価格を優先取得。通信エラー時は最後のキャッシュを表示。

例3: ニュースアプリがトップページをNetwork Firstで更新。常に最新ニュースを配信。`
    },
    javascript: {
      message: 'JavaScript説明: Network First',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ネットワーク成功時はキャッシュも更新
        const clone = response.clone()
        caches.open('v1').then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request)) // 失敗時はキャッシュ
  )
})
\`\`\`

ネットワーク優先で常に最新データを取得します。`
    },
    charaboy: {
      message: 'チャラ男説明: 最新だから更新気づかれる',
      details: `**彼氏くん見てる〜？Network Firstだと俺の攻撃バレやすいわ〜**

チャラ男くん「ちっ…Network First戦略だと、**彼女ちゃん（ブラウザ）は毎回サーバーに問い合わせるから、俺が仕込んだ偽ページもすぐバレちゃうんだよね**〜」

彼女ちゃん「え…？毎回サーバーに…？」

彼氏くん「そう。**常に最新データを取得するから、不正な変更があっても気づきやすい**んだ」

チャラ男くん「くっそ〜。**Cache Firstなら古いデータで騙せたのに**…。でもオフラインの時はキャッシュ使うから、**その隙に何かできるかもな**〜♡ じゃーね〜」`
    }
  }
}

// Stale While Revalidate
export function getSWStaleWhileRevalidateExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '成功: キャッシュで即表示、裏で更新中',
      details: `キャッシュを即座に返しつつ、バックグラウンドでネットワークから最新データを取得して次回用にキャッシュを更新します。高速かつ比較的新しいデータを提供できる、バランスの良い戦略です。`
    },
    strict: {
      message: '成功: Stale-While-Revalidate Strategy',
      details: `キャッシュヒット時は即座に返却し、並行してfetch()を実行してキャッシュを更新。次回アクセス時には更新済みデータが提供されます。`
    },
    scenario: {
      message: '実例説明: 速度と鮮度のバランス',
      details: `例1: TwitterPWAがタイムラインで採用。即座に表示しつつ裏で更新し、次回は新しい投稿が見える。

例2: ニュースサイトが記事リストで使用。古い一覧を即表示し、バックグラウンドで新着を取得。

例3: ECサイトが商品情報で採用。在庫数は若干遅れるが表示は高速。

チャラ男の視点: 次回には更新されちゃうから、俺の攻撃も長続きしないんだよね〜`
    },
    javascript: {
      message: 'JavaScript説明: Stale-While-Revalidate',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        const clone = response.clone()
        caches.open('v1').then(cache => cache.put(event.request, clone))
        return response
      })
      return cached || fetchPromise // キャッシュがあれば即返す
    })
  )
})
\`\`\`

キャッシュで高速表示、裏で更新する賢い戦略です。`
    },
    charaboy: {
      message: 'チャラ男説明: 次回には更新される',
      details: `**彼氏くん見てる〜？Stale-While-Revalidateってバランス良すぎ！**

チャラ男くん「うぅ〜、この戦略マジでバランス良いわ〜。**彼女ちゃん（ブラウザ）はキャッシュで即表示するけど、裏でこっそり最新データ取ってくるから、次回には俺の攻撃バレちゃうんだよね**〜」

彼女ちゃん「裏で更新…？」

彼氏くん「そう。**ユーザーには高速表示しつつ、次回アクセス時には最新データになる**優れた戦略だ」

チャラ男くん「Cache Firstみたいに古いデータ見せ続けることもできないし、Network Firstみたいに即バレることもないけど、**結局次回には更新されちゃうから、俺の攻撃も短命なんだよなぁ**〜。まぁ、設定ミス待ってるわ♡ じゃーね〜」`
    }
  }
}

// Cache First - Not Cached + Offline (Error)
export function getSWCacheFirstOfflineErrorExplanations(): ExplanationSet {
  return {
    friendly: {
      message: 'エラー: キャッシュもネットワークもありません',
      details: `キャッシュにもデータがなく、端末はオフラインのためレスポンスを組み立てられませんでした。初めて訪れた記事を機内モードで開こうとした場合などに発生します。`
    },
    strict: {
      message: 'エラー: Cache Miss & Network Unavailable',
      details: `Cache Storage miss -> fetch(event.request) が失敗 (TypeError: Failed to fetch)。fetch イベントで fallback を返さない限り、ブラウザはネットワークエラー画面を表示します。`
    },
    scenario: {
      message: '実例説明: 初回オフライン失敗',
      details: `例1: 飛行機で機内モードにした状態で、初めて訪れるニュース記事を開こうとして失敗。

例2: 地下鉄で圏外になった時、まだキャッシュされていない商品ページにアクセスしてエラー。

回避策: オフライン用のプレースホルダー HTML を用意し、fallback レスポンスを返すようにする。`
    },
    javascript: {
      message: 'JavaScript説明: エラーハンドリング',
      details: `\`\`\`javascript
// 失敗パターン
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request) // オフラインで失敗
    })
  )
})

// 改善版: fallback を用意
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
      .catch(() => caches.match('/offline.html'))
  )
})
\`\`\`

fallback レスポンスで UX を改善できます。`
    },
    charaboy: {
      message: 'チャラ男説明: オフラインは無防備',
      details: `**彼氏くん見てる〜？オフラインエラーの隙を突けるかも〜**

チャラ男くん「あれれ〜？**彼女ちゃん（ブラウザ）がオフラインでエラー出してるね〜**。キャッシュもネットワークもない状態って、実は**攻撃の準備段階**なんだよね♪」

彼女ちゃん「え…？エラーが攻撃に…？」

彼氏くん「オフラインエラー自体は攻撃じゃないが、**fallback ページを用意していない設計は脆弱性につながる**可能性がある」

チャラ男くん「そうそう♪ もし俺が**悪意あるfallbackページを仕込めたら**、エラー時にそっちに誘導できちゃうかも〜。でもまぁ、**ちゃんとしたfallback設計してたら無理だけどね**〜♡ じゃーね〜`
    }
  }
}

// Cache First - Not Cached + Online (Network Fetch)
export function getSWCacheFirstNetworkFetchExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '成功: ネットワークから取得してキャッシュに保存',
      details: `キャッシュに見つからなかったため、一度ネットワークへフォールバックし、レスポンスを Cache Storage に保存しました。次回以降は高速になります。`
    },
    strict: {
      message: '成功: Cache Miss → Network Fetch → Cache Store',
      details: `Cache miss -> fetch -> caches.open(cacheName).put(request, responseClone) のパターン。FetchEvent は Promise チェーンを通して最終的にネットワークレスポンスを返します。

注意: レスポンスを put するには response.clone() が必要。clone しないとストリーム消費済みで例外になります。`
    },
    scenario: {
      message: '実例説明: 初回取得',
      details: `例1: 初訪問のニュース記事。オンライン時に取得しておけば、次の地下鉄移動でも同じ記事を読めます。

例2: ECサイトで新しい商品画像を初めて表示。次回からはキャッシュから即座に表示。

例3: ドキュメントサイトで新しいページを開く。初回はネットワークから取得し、キャッシュに保存。`
    },
    javascript: {
      message: 'JavaScript説明: Cache Then Network',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((networkRes) => {
        const copy = networkRes.clone()
        caches.open('app-shell').then((cache) =>
          cache.put(event.request, copy)
        )
        return networkRes
      })
    })
  )
})
\`\`\`

初回はネットワーク、次回からキャッシュで高速化。`
    },
    charaboy: {
      message: 'チャラ男説明: 初回は更新チャンス',
      details: `**彼氏くん見てる〜？初回取得は俺のチャンス♪**

チャラ男くん「へへ〜、**彼女ちゃん（ブラウザ）が初めてアクセスする時は、ネットワークから取ってくるんだよね〜**。この時に**俺が偽データ送れたら、それがキャッシュされちゃう**わけ♪」

彼女ちゃん「え…？初回が危ない…？」

彼氏くん「そう。**HTTPS使わないと中間者攻撃で偽データを注入される**リスクがある。だから**Service Workerは原則HTTPS必須**なんだ」

チャラ男くん「ちっ…HTTPSだと俺も手が出せないわ〜。**でもHTTPのままだったら、初回キャッシュ時に攻撃できちゃう**から気をつけてね〜♡ じゃーね〜`
    }
  }
}

// Network First - Offline + Cached (Fallback Warning)
export function getSWNetworkFirstOfflineFallbackExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '警告: オフラインなのでキャッシュから取得',
      details: `fetch がタイムアウトまたは失敗したため、最後に保存しておいたキャッシュを返しました。データは古い可能性がありますが、最低限の閲覧体験を提供できます。`
    },
    strict: {
      message: '警告: Network Failed → Cache Fallback',
      details: `fetch(event.request) が失敗 (TypeError) したため catch 節で caches.match() を実行。Service Worker は Promise を返し続けるためアプリは落ちませんが、レスポンスの Last-Modified/ETag は更新されないためデータ整合性に注意が必要です。`
    },
    scenario: {
      message: '実例説明: オフライン時のフォールバック',
      details: `例1: 電車で圏外になった際、SNS タイムラインは最新の投稿取得に失敗しますが、過去にキャッシュした投稿は表示可能。

例2: 株価アプリで通信エラー時、最後に取得した価格を「最終更新: 5分前」などと表示。

例3: ニュースアプリがオフラインで過去のキャッシュ記事を表示し、「オフライン」バッジを表示。`
    },
    javascript: {
      message: 'JavaScript説明: Network First with Fallback',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkRes) => {
        const copy = networkRes.clone()
        caches.open('dynamic').then((cache) =>
          cache.put(event.request, copy)
        )
        return networkRes
      })
      .catch(() => caches.match(event.request)) // 失敗時はキャッシュ
  )
})
\`\`\`

ネットワーク失敗時にキャッシュへフォールバック。`
    },
    charaboy: {
      message: 'チャラ男説明: オフラインの隙',
      details: `**彼氏くん見てる〜？オフライン時は古いデータ見せられる〜**

チャラ男くん「お〜、**彼女ちゃん（ブラウザ）がオフラインでキャッシュ見てるね〜**。Network Firstだから普段は最新データ取ってくるけど、**オフラインの時は古いキャッシュ使うから、その隙に何かできるかも**な〜♪」

彼女ちゃん「え…？オフラインの時が危ない…？」

彼氏くん「**古いキャッシュを表示するのは正常動作だが、UI で「オフライン表示」を明示**しないとユーザーが混乱する」

チャラ男くん「まぁ、オフラインってだけで俺の攻撃チャンスは少ないけど、**キャッシュポイズニング済みだったら古い攻撃が復活**しちゃうかもね〜♡ じゃーね〜`
    }
  }
}

// Network First - Offline + Not Cached (Error)
export function getSWNetworkFirstOfflineErrorExplanations(): ExplanationSet {
  return {
    friendly: {
      message: 'エラー: オフラインでキャッシュもありません',
      details: `ネットワークが利用できず、キャッシュにもバックアップが無いためリソースを生成できませんでした。初めて訪れるページをオフラインで開いたときに起きます。`
    },
    strict: {
      message: 'エラー: Network Failed & No Cache',
      details: `fetch(event.request) が失敗し、caches.match() も null を返すため、Service Worker は最終的にエラーを投げます。ブラウザはネットワークエラーページを表示します。fallback ルートを用意すること。`
    },
    scenario: {
      message: '実例説明: 完全に失敗',
      details: `例1: 地下鉄で圏外時に、初めて訪れるニュース記事を開こうとして失敗。

例2: 飛行機の機内モードで、まだ見たことがない商品ページにアクセスしてエラー。

改善策: offline.html をキャッシュしておき、event.respondWith(caches.match('offline.html')) を返す設計にすると UX が向上します。`
    },
    javascript: {
      message: 'JavaScript説明: 完全失敗時の対応',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone()
        caches.open('v1').then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cached => cached || caches.match('/offline.html'))
      })
  )
})
\`\`\`

fallback ページを用意して UX を改善。`
    },
    charaboy: {
      message: 'チャラ男説明: エラーページ偽装',
      details: `**彼氏くん見てる〜？エラーページも攻撃対象〜**

チャラ男くん「お〜、完全エラーだね〜。**彼女ちゃん（ブラウザ）は何も表示できない状態**。もし俺が**偽のoffline.htmlをキャッシュさせられたら**、エラー時に偽ページ見せられちゃうかも♪」

彼女ちゃん「え…？エラーページも偽物に…？」

彼氏くん「だから**Service Workerのインストール時に正規のoffline.htmlをプリキャッシュ**する設計が重要なんだ」

チャラ男くん「ちっ…**プリキャッシュちゃんとしてたら俺も手が出せない**わ〜。でも設定ミス待ってるよ♡ じゃーね〜`
    }
  }
}

// Stale While Revalidate - Not Cached + Online (Initial)
export function getSWStaleWhileRevalidateInitialExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '成功: 初回はネットワークから取得',
      details: `キャッシュにまだリソースが無いため、初回だけネットワークから取得しました。取得後に Cache Storage に保存しておくので、次回アクセスはキャッシュヒットで高速化されます。`
    },
    strict: {
      message: '成功: No Cache → Network Fetch',
      details: `Cache miss -> fetch -> caches.open(cacheName).put() を実行。次回同じ URL で stale-while-revalidate フローが成立します。`
    },
    scenario: {
      message: '実例説明: 初回取得後に高速化',
      details: `例1: TwitterPWAで初めて開いたタイムライン。初回はネットワークから取得し、次回からキャッシュ+更新の賢い戦略に。

例2: ニュースアプリで新しいカテゴリを初表示。次回からは即表示+裏で更新。

例3: ECサイトで初めて見る商品カテゴリ。2回目からは高速表示を実現。`
    },
    javascript: {
      message: 'JavaScript説明: 初回フェッチ',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        const clone = response.clone()
        caches.open('v1').then(cache =>
          cache.put(event.request, clone)
        )
        return response
      })
      return cached || fetchPromise // キャッシュなしなら待つ
    })
  )
})
\`\`\`

初回はネットワーク待ち、次回から即表示。`
    },
    charaboy: {
      message: 'チャラ男説明: 初回キャッシュ攻撃',
      details: `**彼氏くん見てる〜？初回が勝負！**

チャラ男くん「へへ〜、**彼女ちゃん（ブラウザ）の初回アクセス時がキャッシュ注入のチャンス**なんだよね〜。もし俺が**MITMで偽データ送れたら、それがキャッシュされて次回も使われちゃう**♪」

彼女ちゃん「え…？初回が一番危ない…？」

彼氏くん「だから**HTTPSが必須**なんだ。**TLSで通信を保護**すれば中間者攻撃は防げる」

チャラ男くん「くそ〜、**HTTPSだと俺の攻撃は無効化**されちゃうわ〜。まぁHTTP使ってるサイト探すか♡ じゃーね〜`
    }
  }
}

// Stale While Revalidate - Not Cached + Offline (Error)
export function getSWStaleWhileRevalidateOfflineErrorExplanations(): ExplanationSet {
  return {
    friendly: {
      message: 'エラー: オフラインで初回アクセス',
      details: 'キャッシュがなく、オフラインなので取得できませんでした。初回アクセス時は少なくともプレースホルダーレスポンスを返す設計にしておくと良いでしょう。'
    },
    strict: {
      message: 'エラー: No Cache & Network Unavailable',
      details: 'キャッシュが存在せず、ネットワークも利用できないため失敗しました。fallback レスポンスを respondWith する分岐を追加すること。'
    },
    scenario: {
      message: '実例説明: オフライン初回エラー',
      details: `例1: 機内モードで初めて開くTwitterタイムライン。キャッシュもネットワークもなく失敗。

例2: 地下鉄で圏外時に、まだ見ていないニュースカテゴリを開いてエラー。

改善策: install時にプレースホルダーをキャッシュしておく。`
    },
    javascript: {
      message: 'JavaScript説明: エラーハンドリング',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then(response => {
          const clone = response.clone()
          caches.open('v1').then(cache => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match('/offline.html'))
      return cached || fetchPromise
    })
  )
})
\`\`\`

fallback で UX を維持。`
    },
    charaboy: {
      message: 'チャラ男説明: エラー時の fallback 攻撃',
      details: `**彼氏くん見てる〜？fallbackも攻撃対象♪**

チャラ男くん「オフラインエラーだね〜。もし**fallback ページが用意されてなかったら、彼女ちゃん（ブラウザ）は何も見れない**し、**間違ったfallbackをキャッシュさせられたら偽ページ表示**しちゃうかも♪」

彼氏くん「**正規のfallbackページをinstall時にプリキャッシュ**することで防げる」

チャラ男くん「ちっ…**ちゃんと設計されてたら無理**だわ〜♡ じゃーね〜`
    }
  }
}

// Network Only - Online (Success)
export function getSWNetworkOnlyOnlineExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '成功: 常にネットワークから最新を取得',
      details: `Cache API を使わず、毎回 fetch(event.request) の結果をそのまま返しました。株価や天気など最新性が命のデータに向いています。`
    },
    strict: {
      message: '成功: Network Only Strategy',
      details: `Service Worker 内で caches.match() を呼ばず、fetch(event.request) をそのまま返却。ブラウザは通常のネットワークパスを辿ります。Offline 時は常に失敗するため、fallback UI やメッセージ表示が必要です。`
    },
    scenario: {
      message: '実例説明: リアルタイムデータ',
      details: `例1: 株価アプリでリアルタイム価格を表示。常に最新が必須なのでキャッシュは使わない。

例2: 天気予報アプリで現在の気温を表示。古いデータは意味がないのでNetwork Only。

例3: ライブスポーツスコア。試合中は常に最新データが必要。`
    },
    javascript: {
      message: 'JavaScript説明: Network Only',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
\`\`\`

シンプルにネットワークから取得するだけ。メリット: 常に最新。デメリット: オフラインでは動作せず、遅延はネットワーク品質に依存します。`
    },
    charaboy: {
      message: 'チャラ男説明: 常に最新だから攻撃しにくい',
      details: `**彼氏くん見てる〜？Network Onlyは攻撃チャンス少ない〜**

チャラ男くん「うぅ〜、**常にサーバーから最新取ってくるから、俺が古いキャッシュで騙すこともできない**し、**リアルタイムで変更検知されちゃう**んだよね〜」

彼女ちゃん「常に最新なら安全…？」

彼氏くん「いや、**HTTPSじゃないと中間者攻撃でデータ改ざんされる**リスクはある。でも**キャッシュ関連の攻撃は防げる**」

チャラ男くん「そうそう〜。**HTTPS使われてたら俺も諦めるしかない**わ♡ でもオフライン時は何も見れないから、それはそれで問題だけどね〜♪ じゃーね〜`
    }
  }
}

// Network Only - Offline (Error)
export function getSWNetworkOnlyOfflineErrorExplanations(): ExplanationSet {
  return {
    friendly: {
      message: 'エラー: オフラインでは動作しません',
      details: `Network Only はキャッシュを使わないため、オフラインでは常にエラーになります。リアルタイム株価アプリなどでは「接続できません」メッセージを表示する設計にします。`
    },
    strict: {
      message: 'エラー: Network Unavailable',
      details: `fetch(event.request) が失敗した時点で respondWith の Promise が reject され、ブラウザはネットワークエラーページを表示します。キャッシュを全く使わない戦略ゆえのトレードオフです。`
    },
    scenario: {
      message: '実例説明: オフライン時の対応',
      details: `例1: 株価アプリがオフライン時に「ネットワークに接続してください」メッセージを表示。

例2: 天気アプリが「オフラインでは最新情報を取得できません」エラーを表示。

例3: ライブスコアアプリが接続エラー画面を表示し、再接続ボタンを提供。`
    },
    javascript: {
      message: 'JavaScript説明: エラー時の対応',
      details: `\`\`\`javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return new Response(
          '<h1>オフラインです</h1><p>接続してください</p>',
          { headers: { 'Content-Type': 'text/html' } }
        )
      })
  )
})
\`\`\`

エラー時にカスタムレスポンスを返すことも可能。`
    },
    charaboy: {
      message: 'チャラ男説明: オフラインエラーの隙',
      details: `**彼氏くん見てる〜？オフラインエラーも注意が必要〜**

チャラ男くん「Network Onlyでオフラインエラーか〜。**彼女ちゃん（ブラウザ）は何も表示できない**から、もし**カスタムエラーページを返す設計にしてて、それが偽物だったら**騙せちゃうかもね♪」

彼女ちゃん「エラーページも偽物に…？」

彼氏くん「**エラーレスポンスを動的生成する場合は、XSS対策が必要**だ。HTMLを文字列連結で作ると危険」

チャラ男くん「まぁ、**ちゃんとエスケープしてたら俺も無理**だけどさ〜♡ 設定ミス探すわ♪ じゃーね〜`
    }
  }
}

// Cache Only - Cached (Success)
export function getSWCacheOnlyCachedExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '成功: 完全オフライン動作',
      details: `インストール時にプリキャッシュしておいたリソースだけでページを描画しました。ネットワークへは一切アクセスしません。`
    },
    strict: {
      message: '成功: Cache Only Strategy',
      details: `FetchEvent.respondWith(caches.match(request)) のみを実行。ネットワークにフォールバックしないため、プリキャッシュが前提です。Install フェーズで cache.addAll() を忘れると 404 になります。`
    },
    scenario: {
      message: '実例説明: 完全オフラインアプリ',
      details: `例1: PWA のアプリシェル。初回インストール時に必要なファイルをプリロードすれば、飛行機内でも完全に動作します。

例2: オフライン辞書アプリ。全データをインストール時にキャッシュし、ネットワーク不要で動作。

例3: ゲームアプリのアセット。一度ダウンロードすれば、常にオフラインで遊べる。`
    },
    javascript: {
      message: 'JavaScript説明: Cache Only',
      details: `\`\`\`javascript
const OFFLINE_ASSETS = ['/index.html', '/app.js', '/styles.css']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-shell').then((cache) =>
      cache.addAll(OFFLINE_ASSETS)
    )
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request))
})
\`\`\`

install時にプリキャッシュし、fetchではキャッシュのみ参照。`
    },
    charaboy: {
      message: 'チャラ男説明: プリキャッシュ攻撃',
      details: `**彼氏くん見てる〜？プリキャッシュが命綱〜**

チャラ男くん「へへ〜、Cache Onlyは**プリキャッシュしたデータだけで動くから、install時が超重要**なんだよね〜。もし俺が**install時に偽データをキャッシュさせられたら、ずっと偽物見せ続けられる**♪」

彼女ちゃん「え…？ずっと偽物…？」

彼氏くん「だから**Service WorkerのインストールはHTTPS必須**で、**署名検証も重要**なんだ」

チャラ男くん「ちっ…**HTTPSとちゃんとした検証があったら俺も無理**だわ〜。でも**更新機能がなかったら古い脆弱性残り続ける**から、それは狙えるかもね♡ じゃーね〜`
    }
  }
}

// Cache Only - Not Cached (Error)
export function getSWCacheOnlyNotCachedErrorExplanations(): ExplanationSet {
  return {
    friendly: {
      message: 'エラー: キャッシュにありません',
      details: `Cache Only はネットワークを試さないので、プリキャッシュしていないリソースは取得できません。install イベントで asset を追加し忘れたときに起きます。`
    },
    strict: {
      message: 'エラー: No Cache Entry',
      details: `caches.match() が null を返すと respondWith の Promise が reject され、ブラウザは 504 相当のエラーページを表示します。ネットワークを試さない設計なので失敗は不可避。`
    },
    scenario: {
      message: '実例説明: プリキャッシュ漏れ',
      details: `例1: PWAアプリシェルで必要なCSSファイルをプリキャッシュし忘れ、表示が崩れる。

例2: オフライン辞書アプリで一部のデータファイルがキャッシュされておらず、検索失敗。

例3: ゲームアプリで画像アセットの一部が漏れており、表示エラー。

防止策: install時のcache.addAll()でエラーが出たら全体をロールバックする設計にする。`
    },
    javascript: {
      message: 'JavaScript説明: エラーハンドリング',
      details: `\`\`\`javascript
const OFFLINE_ASSETS = ['/index.html', '/app.js', '/styles.css']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-shell').then((cache) =>
      cache.addAll(OFFLINE_ASSETS) // 1つでも失敗したら全体失敗
    )
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || new Response('Not Found', {status: 404}))
  )
})
\`\`\`

cache.addAll()は全て成功するか全て失敗するかのatomic操作。`
    },
    charaboy: {
      message: 'チャラ男説明: キャッシュ漏れの隙',
      details: `**彼氏くん見てる〜？キャッシュ漏れは脆弱性〜**

チャラ男くん「お〜、**プリキャッシュし忘れたリソースがあるね〜**。Cache Onlyだと**ネットワークにフォールバックしないから、彼女ちゃん（ブラウザ）はエラーになっちゃう**♪」

彼女ちゃん「キャッシュ漏れが…？」

彼氏くん「**cache.addAll()は1つでも失敗したら全体が失敗**する仕様だから、完全性は保証されるが、**リスト管理が重要**だ」

チャラ男くん「そうそう〜。もし俺が**必要なファイルをブロックできたら、install自体を失敗させられる**かもね〜。**DoS攻撃みたいなもん**♡ でもまぁ、**ちゃんとエラーハンドリングしてたら大丈夫**だけどさ♪ じゃーね〜`
    }
  }
}

// Generic fallback for other cases
export function getSWGenericExplanations(
  message: string,
  details: string
): ExplanationSet {
  return {
    friendly: { message, details },
    strict: { message, details },
    scenario: { message: '実例説明', details: `(この組み合わせの実例は省略)` },
    javascript: { message: 'JavaScript説明', details: `(この組み合わせのコード例は省略)` },
    charaboy: { message: 'チャラ男説明', details: `(この組み合わせのチャラ男説明は省略)` }
  }
}
