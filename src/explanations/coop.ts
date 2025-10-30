import type { ExplanationSet } from '../types/simulator'

export function getCoopBothUnsafeExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '危険: 攻撃者が元タブを書き換えられます',
      details: `social.com も mybank.com も COOP ヘッダーを送らないため、ブラウザは両タブを同じ browsing context group (BCG) に入れたままにします。その結果、攻撃者のフィッシングスクリプトが window.opener を通じて元タブの URL を自由に書き換えられます。

攻撃の流れ:
1. ユーザーが SNS (social.com) で銀行リンクをクリック。
2. 搭載された悪性広告 (evil-phishing.com) が window.open で mybank.com を開く。
3. 新しく開いたタブは mybank.com を表示しますが、元タブからは依然として window.opener でアクセス可能。
4. 攻撃スクリプトが window.opener.location = 'https://evil-phishing.com/fake-login' を実行すると、ユーザーが戻った元タブは偽ログイン画面に変化します。

被害: ユーザーは正規タブだと思い込み、ログインIDやワンタイムパスワードを入力してしまいます。COOP を設定すれば、ブラウザが BCG を分離し、この攻撃ベクトルを断ち切れます。`
    },
    strict: {
      message: '危険: タブナビング攻撃が可能です',
      details: `ブラウザ内部では opener と新規タブが同じ browsing context group を共有し続けます。COOP が absent のため、Chromium/Firefox ともに window.opener は null に書き換えられません。renderer プロセス間で postMessage や location への参照が許可されるため、tabnabbing が成立します。

DevTools > Network ではレスポンスヘッダーに COOP が存在せず、Console にも警告は表示されません。セキュリティ監査ツール (Lighthouse) は "Reverse tabnabbing vulnerability" として検出します。`
    },
    scenario: {
      message: '実例説明: タブナビング攻撃',
      details: `例1: SNSサイト (social.com) にCOOP未設定。悪意ある広告が銀行サイトを別タブで開き、元のSNSタブをフィッシングサイトに差し替え。ユーザーが戻るとパスワードを盗まれる。

例2: ニュースサイトから外部リンクをクリック。元タブが偽の「セキュリティ警告」画面に書き換えられ、個人情報入力を促される詐欺。

例3: オンラインバンキングサイト (mybank.com) がCOOP未設定。攻撃者サイトからwindow.openで開かれ、元タブを偽ログイン画面に差し替えられる。

攻撃例: チャラ男くん（悪意あるスクリプト）が彼女ちゃん（ユーザー）の開いた元タブ（window.opener）を偽サイトにすり替え、個人情報を盗み出します。COOP無しでは完全に無防備です。`
    },
    javascript: {
      message: 'JavaScript説明: タブナビング',
      details: `\`\`\`javascript
// 攻撃者がSNS内で動かすスクリプト
const popup = window.open('https://mybank.com', '_blank')
if (popup) {
  // 数秒後に元タブを偽サイトへリダイレクト
  setTimeout(() => {
    window.opener.location = 'https://evil-phishing.com/fake'
  }, 2000)
}
\`\`\`

COOP無しでは、window.openerが使い放題で危険です。`
    },
    charaboy: {
      message: 'チャラ男説明: タブすり替え放題',
      details: `**彼氏くん見てる〜？COOP無しとか最高すぎ♪**

チャラ男くん「いやぁ〜彼氏くん、**COOP設定してないから、俺（悪性スクリプト）がwindow.opener使って、彼女ちゃん（ユーザー）が見てた元のタブを偽サイトにすり替え放題なんだわ〜**♡」

彼女ちゃん「え…？元のタブが…偽物に…？」

彼氏くん「**まずい！COOP無しだと、別タブから元タブを書き換えられる！**」

チャラ男くん「そうそう♪ 彼女ちゃんが銀行サイト開いてる間に、**俺が元のSNSタブを偽ログイン画面にすり替えちゃうんだよね〜**。戻ってきた彼女ちゃんは本物だと思い込んで、**パスワードとか全部入力しちゃうわけ**♡」

彼女ちゃん「わ、わたしの情報が…盗まれちゃう…？」

彼氏くん「**COOP設定しないと、タブナビング攻撃で彼女が騙される！**」

チャラ男くん「**彼氏くん、このままCOOP無しにしといてくれよ〜** 彼女ちゃんの個人情報、全部もらっちゃうからさ♡ じゃーね〜」`
    }
  }
}

export function getCoopSocialSameOriginExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '安全: social.com が別タブとの橋を切りました',
      details: `COOP: same-origin を送ると、ブラウザは「このレスポンスと同じオリジンでない限り、同じ BCG に入れないで」と解釈します。そのため、social.com から開かれた mybank.com のタブとは橋が切られ、window.opener は自動的に null になります。

ユーザー体験:
1. SNS がレスポンスヘッダーに Cross-Origin-Opener-Policy: same-origin を追加。
2. リンクをクリックすると新しいタブは完全に独立したコンテキストに配置されます。
3. 元タブに戻っても、攻撃者スクリプトが window.opener へアクセスしようとすると null になっており、偽サイトへの差し替えができません。

副作用: 別オリジンのウィンドウ間で window.open + window.opener に頼った正規機能は使えなくなるものの、セキュリティが大きく向上します。`
    },
    strict: {
      message: '安全: COOP: same-origin で分離済み',
      details: `レスポンスヘッダー: Cross-Origin-Opener-Policy: same-origin

ブラウザ内部:
• opener document と新タブは異なる browsing context group に移されます。
• window.opener, window.open の透過アクセスが遮断され、document.referrer も空文字になります。
• DevTools > Application > Frames で opener が null であることを確認可能。

COOP enforcement の結果、攻撃者による reverse tabnabbing が成立しなくなります。`
    },
    scenario: {
      message: '実例説明: COOP設定で防御',
      details: `例1: 大手SNSがCOOP: same-originを設定。外部リンククリック時に新タブが完全分離され、タブナビング攻撃を防止。ユーザーは安心して外部サイトを閲覧可能に。

例2: ニュースサイトがセキュリティ強化のためCOOP導入。広告から開かれるタブが独立し、元ページの改ざんを防止。

例3: ポータルサイトがCOOP設定後、フィッシング被害が激減。ユーザー体験は変わらず、セキュリティのみ向上。

攻撃例（防御成功）: チャラ男くん（悪性スクリプト）がwindow.openerでタブ書き換えを試みるが、COOP設定によりnullになっており失敗。彼女ちゃん（ユーザー）の元タブは守られます。`
    },
    javascript: {
      message: 'JavaScript説明: same-originで保護',
      details: `\`\`\`http
HTTP/2 200 OK
Cross-Origin-Opener-Policy: same-origin
\`\`\`

\`\`\`javascript
// 別オリジンのタブから
console.log(window.opener) // null (アクセス不可)

// 同一オリジンのタブからは
console.log(window.opener) // Window オブジェクト（アクセス可）
\`\`\`

別オリジンとは完全に分離されます。`
    },
    charaboy: {
      message: 'チャラ男説明: same-originで門前払い',
      details: `**彼氏くん見てる〜？COOP設定で入れなくなったわ〜**

チャラ男くん「ちっ…彼氏くんが \`COOP: same-origin\` 設定しやがって。**俺（別オリジンのスクリプト）がwindow.opener触ろうとしてもnullになってて、何もできないんだわ**〜」

彼女ちゃん「え…？どういうこと…？」

彼氏くん「**COOP設定したから、別オリジンのタブとは完全に分離される**んだ。彼女を守れる」

チャラ男くん「くっそ〜。**もしCOOP無しだったら、元タブを偽サイトにすり替えて、彼女ちゃんの個人情報全部もらえたのに**…。Browsing Context Groupが分離されてて、**完全に手が出せないわ**〜」

彼女ちゃん「COOPって…すごいの…？」

彼氏くん「ああ。**タブナビング攻撃から確実に守れる**。安心していいぞ」

チャラ男くん「チッ…**今回は諦めるけど、設定ミスったら即座に彼女ちゃんの情報もらっちゃうからな**〜♡ じゃーね〜」`
    }
  }
}

export function getCoopAllowPopupsExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '安全: 同一オリジンのポップアップだけを許可しています',
      details: `same-origin-allow-popups は「自分と同じオリジンで開くポップアップだけ旧来の連携を維持し、それ以外は遮断」というバランス重視の設定です。social.com → mybank.com のように別オリジンを開いた場合は自動的に分離され、攻撃者が window.opener を使えません。一方、同一オリジン (例: 自社のヘルプセンター) を新しいタブで開いた場合は相互通信が継続します。

この設定は、サードパーティ連携が多いSNSで「内部ツールは従来どおり動かしたいが、外部リンク経由の攻撃は防ぎたい」というケースに向いています。`
    },
    strict: {
      message: '安全: COOP: same-origin-allow-popups で保護',
      details: `COOP enforcement:
• opener と開かれたウィンドウの origin を比較。
• 一致しない場合は same-origin と同様に browsing context group を分離し、window.opener を null に設定。
• 一致する場合は既存の接続を維持 (window.opener が残る)。

ブラウザは SecurityContext の isolation 状態を判定に利用し、DevTools の Frames タブで opener が null になる様子を確認できます。`
    },
    scenario: {
      message: '実例説明: バランス型の設定',
      details: `例1: SaaSアプリが同一オリジンのヘルプページはwindow.opener保持、外部ドキュメントは分離。機能性とセキュリティを両立。

例2: ECサイトが自社の商品詳細ページは連携維持、外部決済サイトは分離。ユーザー体験を損なわずセキュリティ向上。

例3: 教育プラットフォームが同一オリジンの補助ツールとは通信維持、外部リソースは隔離。学習体験はそのまま、攻撃リスクは低減。

攻撃例（防御成功）: チャラ男くん（別オリジンの攻撃スクリプト）は同一オリジンではないためwindow.openerがnull。元タブへのアクセスは防がれます。`
    },
    javascript: {
      message: 'JavaScript説明: allow-popupsの動作',
      details: `\`\`\`http
Cross-Origin-Opener-Policy: same-origin-allow-popups
\`\`\`

\`\`\`javascript
// 同一オリジンのポップアップ
const sameOriginPopup = window.open('/help', '_blank')
console.log(sameOriginPopup.opener) // Window（通信可能）

// 別オリジンのタブ
const crossOriginTab = window.open('https://bank.com', '_blank')
console.log(crossOriginTab.opener) // null（分離済み）
\`\`\`

同一オリジンとだけ連携を維持します。`
    },
    charaboy: {
      message: 'チャラ男説明: 外部は遮断',
      details: `**彼氏くん見てる〜？allow-popupsでも俺は入れないわ〜**

チャラ男くん「うぅ〜、\`same-origin-allow-popups\` 設定されてて、**俺（別オリジン）はwindow.openerがnullになっちゃうんだよね**〜。同一オリジンだけ特別扱いとか、ずるいわ〜」

彼女ちゃん「同一オリジンだけ…？」

彼氏くん「そう。**内部ツールとは連携維持しつつ、外部からの攻撃は防げる**バランス型の設定だ」

チャラ男くん「くっそ〜。**もし彼氏くんが設定してなかったら、彼女ちゃんの元タブ好き放題できたのに**…。でもまぁ、**設定ミスを待ってるからな**〜♡ じゃーね〜」`
    }
  }
}

export function getCoopBankSameOriginExplanations(): ExplanationSet {
  return {
    friendly: {
      message: '安全: mybank.com も独立を宣言しています',
      details: `銀行側でも COOP: same-origin を設定することで、「どこから開かれても、うちは別の BCG で動きたい」と明示できます。これにより SNS 側が COOP を設定し忘れていても、銀行サイトが自衛できます。

両方のサイトが COOP を設定すれば、最高レベルのセキュリティが実現します。`
    },
    strict: {
      message: '安全: 銀行側もCOOP設定済み',
      details: `Cross-Origin-Opener-Policy: same-origin

mybank.com 側でもCOOP設定により、開かれた側から能動的に分離を要求できます。両サイトでCOOP設定することで、多層防御が実現します。`
    },
    scenario: {
      message: '実例説明: 多層防御',
      details: `例1: オンラインバンキングが独自にCOOP設定。どのサイトから開かれても自動的に分離され、タブナビング攻撃を完全防止。

例2: 決済サービスが両サイド（自社+連携先）でCOOP設定を推奨。一方が設定漏れでも、もう一方で守れる多層防御を実現。

例3: 医療情報サイトが機密保護のため強制的にCOOP設定。referrerから開かれた場合も完全分離。

攻撃例（二重防御）: チャラ男くん（攻撃）がどちらのサイトからアクセスしても、両サイトのCOOP設定により完全に遮断されます。`
    },
    javascript: {
      message: 'JavaScript説明: 両サイドで設定',
      details: `\`\`\`http
<!-- social.com -->
Cross-Origin-Opener-Policy: same-origin

<!-- mybank.com -->
Cross-Origin-Opener-Policy: same-origin
\`\`\`

\`\`\`javascript
// 両サイドでwindow.openerがnull
console.log(window.opener) // null
\`\`\`

多層防御で最強のセキュリティです。`
    },
    charaboy: {
      message: 'チャラ男説明: 二重の壁',
      details: `**彼氏くん見てる〜？両サイトで設定とか固すぎ！**

チャラ男くん「マジかよ…**social.comもmybank.comも両方COOP設定してるとか、完璧すぎるだろ**〜。どっちから攻めても入れないじゃん…」

彼女ちゃん「両方で守ってるの…？」

彼氏くん「ああ。**片方が設定漏れでも、もう片方で守れる多層防御**だ」

チャラ男くん「くっそ〜。**完全に手が出せないわ**〜。でも、**人間はミスするもんだからな。設定漏れたら即座にもらっちゃうぜ**♡ じゃーね〜」`
    }
  }
}
