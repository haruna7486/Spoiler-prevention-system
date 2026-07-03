# 技術スタックと選定理由

## 1. 採用構成

| 対象 | 採用技術 | 役割 |
| --- | --- | --- |
| 拡張仕様 | Chrome Extension Manifest V3 | popup、options、content script、権限を定義する |
| popup / options | React + TypeScript | キーワードの追加・削除・一覧・トグルなどのUIを作る |
| content script | 素のTypeScript | YouTubeのDOMを監視し、タイトル・画像・表示領域を書き換える |
| ビルド | Vite 8 | TypeScript、React、CSS、静的ファイルをビルドする |
| 拡張向けVite連携 | `@crxjs/vite-plugin` 2.7.1 | manifestを入口として拡張機能用の成果物を生成する |
| 保存 | `chrome.storage.local` | キーワードグループをブラウザ内に保存する |
| 更新通知 | `chrome.storage.onChanged` | popup/optionsでの変更をcontent scriptへ反映する |
| DOM追従 | `MutationObserver` | YouTubeのSPA遷移や後読み込み要素を検知する |
| 実行環境 | Node.js 24 LTS + npm | 開発・ビルド環境を統一する |
| バックエンド | なし | すべてChrome拡張内で完結させる |

バージョンの基準日は2026-07-03である。実装開始後は `package.json` と `package-lock.json` を正とし、各自が勝手に最新版へ更新しない。

## 2. popup/optionsはReact、content scriptは素のTypeScriptに分ける

### content scriptにReactを使わない理由

YouTube自体がReact製のSPA（ページ全体を再読み込みせずに画面を書き換えるWebアプリ）であり、YouTube側が管理するDOMを常時再描画している。

そのDOMへ拡張側のReactと仮想DOMを重ねると、YouTubeと拡張が同じ要素の制御を奪い合う可能性がある。結果として、書き換えが元へ戻る、要素が重複する、イベントが消えるなどの競合につながる。

content scriptでは、次の方針を取る。

- TypeScriptからDOM APIを直接使う。
- YouTubeが所有する要素にReactをmountしない。
- YouTubeの再描画を `MutationObserver` で検知する。
- 同じ要素を複数回処理しても壊れないようにする。
- YouTube固有のセレクターをサイト別ルールとして隔離する。

既存サイトのDOMを書き換える拡張機能では、素のJavaScript/TypeScriptでこの層を実装する構成が一般的である。

### popup/optionsにReactを使う理由

popupとoptionsは、YouTubeとは別の拡張機能自身のHTMLページである。YouTubeのDOMと物理的に分離されているため、YouTube側のReactとは競合しない。

また、次のようなUI状態を扱うためReactの恩恵が大きい。

- グループやキーワードの入力状態
- 追加・削除・一覧表示
- `enabled` のトグル
- 入力エラー表示
- キーワード提案
- 今後増える設定項目

## 3. ViteとCRXJSを採用する理由

通常のViteはWebページのビルドには強いが、Chrome拡張特有のmanifest、content script、複数HTML、静的アセットを個別に結び付ける設定が必要になる。

`@crxjs/vite-plugin` はmanifestをViteの入力として扱い、拡張機能用の出力をまとめる。採用理由は次のとおり。

- Manifest V3を対象としている。
- React用Viteプラグインと共存できる。
- popup、options、content scriptをmanifestから解決できる。
- content scriptでもViteの開発体験とHMR（変更の即時反映）を利用できる。
- 画像などの静的アセットと `web_accessible_resources` の生成を支援する。
- Vite 8を公式のpeer dependency対象に含めている。
- 2026年6月から7月にも修正と安定版リリースが続いている。

### 結論

`@crxjs/vite-plugin` は、調査時点で非推奨でもメンテナンス停止でもない。最新の安定版2.7.1を採用する。

WXTなどの拡張機能フレームワークへ置き換えない。今回必要なのは確定済みのReact + Vite構成へ拡張向けビルドを追加することであり、別フレームワークの規約や抽象化を増やす必要がないためである。

## 4. Manifest V3を使う

manifestには必ず `manifest_version: 3` を指定する。Manifest V2は使わない。

初期構成で必要な権限は次の範囲に限定する。

- `permissions`: `storage`
- `content_scripts.matches`: `https://www.youtube.com/*`

`tabs`、`scripting`、全サイトへのhost permissionなどは、現行要件では不要である。必要性を説明できない権限は追加しない。

Manifest V3ではbackground pageの代わりにservice workerを使うが、今回のMVPではbackground自体を置かない。popup/optionsはstorageへ直接書き込み、content scriptはstorageを直接読み、`storage.onChanged` を購読できるためである。

将来、ブラウザ全体のイベントを常時調整する必要が生じた場合だけ、`background.service_worker` の追加を検討する。

## 5. サーバーを使わない理由

本プロダクトの入力はユーザー自身が登録したキーワードで、処理対象は現在のYouTube DOMである。外部計算や共有データを必要としないため、サーバーを置く合理性がない。

サーバーレス構成には次の利点がある。

- 通信待ちなしで判定できる。
- 閲覧内容やキーワードを外部へ送信しない。
- 認証、API、DB、デプロイ、運用費が不要になる。
- ハッカソン期間中にネタバレ防止の核へ集中できる。

## 6. 各パッケージの役割

初期セットアップで必要になる主要パッケージは次のとおり。

### 実行時依存

- `react`: popup/optionsのUI
- `react-dom`: React UIをHTMLへ描画

### 開発時依存

- `typescript`: 型検査
- `vite`: 開発サーバーと本番ビルド
- `@vitejs/plugin-react`: ViteでReactを扱う
- `@crxjs/vite-plugin`: ViteをChrome拡張向けに構成する
- `@types/react`, `@types/react-dom`: Reactの型定義
- `@types/chrome`: `chrome.storage` などChrome APIの型定義

詳しい導入手順は [06_setup-guide.md](./06_setup-guide.md) を参照する。

## 7. 正規化と一致判定の範囲

今回の表記ゆれ対応は全角半角の正規化だけに限定する。同義語、関連語、形態素解析、AI判定は実装しない。

グループに複数キーワードを登録できるため、「W杯2026」と「ワールドカップ」のような同義語は、当面ユーザーが同じグループへ明示的に登録する。

正規化処理はpopup側とcontent側へ重複実装せず、`src/shared/` に置く。具体的な変換方式はテストケースとともに最初の実装PRで決定する。

## 8. 技術調査記録

### 調査日

2026-07-03

### 参照した情報

- [CRXJS公式リポジトリ](https://github.com/crxjs/chrome-extension-tools): Manifest V3、Vite連携、HMR、リリース状況
- [CRXJS Manifestドキュメント](https://crxjs.dev/concepts/manifest/): `defineManifest` の推奨構成
- [CRXJS Content Scriptsドキュメント](https://crxjs.dev/concepts/content/): content scriptのVite連携とisolated world
- [npm: @crxjs/vite-plugin](https://www.npmjs.com/package/@crxjs/vite-plugin): 安定版2.7.1、Vite 3〜8対応、2026-07-01更新
- [Vite公式 Getting Started](https://vite.dev/guide/): Vite 8のNode.js要件とReact TypeScriptテンプレート
- [Node.js Releases](https://nodejs.org/en/about/previous-releases): Node.js 24がLTS、20がEOLであること
- [Chrome Extensions: Manifest file format](https://developer.chrome.com/docs/extensions/reference/manifest): Manifest V3のmanifest形式
- [Chrome Extensions: Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts): content scriptからDOMとstorageを利用できること
- [Chrome Extensions: storage API](https://developer.chrome.com/docs/extensions/reference/api/storage): `storage.local` と `storage.onChanged`
- [Chrome Extensions: Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3): service workerとリモートコード禁止

### 結論

- Node.jsは24 LTSをチーム標準とする。
- Viteは8系を採用する。
- `@crxjs/vite-plugin` は安定版2.7.1を採用する。
- Manifest V3のみを対象とする。
- background service workerはMVPでは省略する。
- popup/optionsはReact、content scriptは素のTypeScriptに分離する。

### 更新時の注意

ライブラリの最新版は変化する。依存関係を更新するPRでは、CRXJSのpeer dependencies、ViteのNode.js要件、ChromeのManifest V3仕様を再確認し、この調査記録へ日付と結論を追記する。
