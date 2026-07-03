# 環境構築ガイド

この文書は、リポジトリをcloneしてから、ビルドした拡張機能をChromeへ読み込むまでの手順である。

現時点のリポジトリはドキュメントだけなので、最初の1名が「初回セットアップ」を行う。そのPRがmainへ入った後、ほかのメンバーは「通常セットアップ」だけを行う。

## 1. 採用バージョン

2026-07-03時点の基準:

| 対象 | 基準 |
| --- | --- |
| Node.js | 24 LTS |
| npm | Node.js 24に同梱される版 |
| Vite | 8.1.3 |
| React / React DOM | 19.2.7 |
| TypeScript | 6.0.3 |
| `@vitejs/plugin-react` | 6.0.3 |
| `@crxjs/vite-plugin` | 2.7.1 |
| `@types/chrome` | 0.2.2 |
| Manifest | V3 |

Vite 8自体はNode.js `20.19+` または `22.12+` を要求するが、Node.js 20は調査時点ですでにEOL（サポート終了）である。チームではLTSの24系に統一する。

初回セットアップ後は `package.json` と `package-lock.json` が正になる。新しい版が出ても、個人判断で更新しない。

## 2. 必要なもの

- Git
- Node.js 24 LTS
- npm
- Google Chromeの安定版
- VS Codeなどのエディター

Node.jsは[Node.js公式サイト](https://nodejs.org/)からLTS版をインストールする。すでにnvmなどのバージョン管理ツールを使っている人は、Node.js 24を選択してよい。

インストール後、ターミナルを開き直して確認する。

```bash
node -v
npm -v
git --version
```

`node -v` が `v24.` から始まればよい。

### Node.jsで詰まる場合

- `command not found: node`: Node.jsが未導入、またはターミナルを開き直していない。
- バージョンが古い: Node.js 24 LTSへ更新する。
- メンバー間で版が違う: build結果がずれるため、24系へそろえる。
- `sudo npm install` が必要になる: Node.jsの導入方法に問題がある可能性が高い。プロジェクトの通常作業で `sudo` は使わない。

## 3. リポジトリをcloneする

```bash
git clone https://github.com/haruna7486/Spoiler-prevention-system.git
cd Spoiler-prevention-system
git status
```

すでにclone済みの場合:

```bash
git switch main
git pull --ff-only origin main
```

## 4. 通常セットアップ

`package.json` と `package-lock.json` がすでにmainへ入っている場合は、こちらを使う。

### Step 1: 依存関係を入れる

```bash
npm ci
```

`npm ci` は `package-lock.json` に記録された版をそのまま再現する。チームメンバーやCIでは `npm install` ではなくこちらを使う。

### Step 2: buildする

```bash
npm run build
```

成功すると、リポジトリ直下に `dist/` が生成される。

次を確認する。

```bash
ls dist
```

最低限 `dist/manifest.json` が必要である。`dist/` は生成物なのでGitへcommitしない。

### Step 3: Chromeへ読み込む

1. Chromeで `chrome://extensions` を開く。
2. 右上の「デベロッパー モード」をONにする。
3. 「パッケージ化されていない拡張機能を読み込む」を押す。
4. このリポジトリの `dist/` フォルダを選ぶ。
5. 拡張機能カードが表示され、エラーが出ていないことを確認する。
6. Chromeの拡張機能メニューから本拡張をピン留めする。
7. アイコンを押し、popupが開くことを確認する。

選ぶのはプロジェクト直下でも `src/` でもなく、必ずbuild後の `dist/` である。

## 5. 初回セットアップ

このセクションは、まだ `package.json` がない場合にセットアップ担当1名だけが行う。作業前にブランチを作る。

```bash
git switch -c feature/setup
```

### Step 1: React + TypeScriptのVite構成を生成する

リポジトリ直下で実行する。

```bash
npm create vite@latest . -- --template react-ts --eslint --no-immediate
```

このリポジトリにはREADMEとdocsがすでにあるため、「フォルダが空ではない」と表示される。選択肢では **Ignore files and continue（既存ファイルを残して続行）** を選ぶ。

**Remove existing files and continue は選ばない。** READMEとdocsが削除対象になるためである。

生成後、依存関係を入れる。

```bash
npm install
```

### Step 2: 調査済みバージョンへそろえる

初回構築の再現性を確保するため、調査済みの版を指定する。

```bash
npm install react@19.2.7 react-dom@19.2.7
npm install -D vite@8.1.3 @vitejs/plugin-react@6.0.3 typescript@6.0.3
npm install -D @crxjs/vite-plugin@2.7.1 @types/chrome@0.2.2
```

Viteテンプレートが導入した `@types/react`、`@types/react-dom`、ESLint関連パッケージはそのまま使う。

### Step 3: 拡張機能向けの入口を配置する

[03_architecture.md](./03_architecture.md#2-想定フォルダ構成) に沿って、次の入口を用意する。

```text
src/popup/index.html
src/popup/main.tsx
src/popup/App.tsx
src/options/index.html
src/options/main.tsx
src/options/App.tsx
src/content/index.ts
manifest.config.ts
vite.config.ts
```

Viteが生成した `index.html`、`src/main.tsx`、`src/App.tsx` と関連CSSは、まとめてpopupの初期動作確認に流用できる。`src/popup/index.html` から読み込むscriptのパスが、移動後の `main.tsx` を指していることを確認する。

optionsは別のHTML入口として用意する。初回のbuild確認ではpopup一式をoptionsへ複製し、画面見出しだけ変えて2つの入口を区別してよい。機能実装時には共通componentを切り出し、同じロジックを2箇所へ残さない。

contentはReactを使わない。最初は `src/content/index.ts` に読込確認用のログだけを置き、YouTubeのDevToolsで実行を確認する。

```ts
console.info('[spoiler-prevention] content script loaded')
```

この時点ではネタバレ防止ロジックを作り込まない。まず3つの入口をbuildできることを確認する。

### Step 4: manifest.config.tsを設定する

CRXJS公式が推奨する `defineManifest` を使う。初期設定の基準は次のとおり。

```ts
import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Spoiler Prevention System',
  version: '0.1.0',
  description: 'YouTubeのタイトルやサムネイルからネタバレを隠します。',
  permissions: ['storage'],
  action: {
    default_popup: 'src/popup/index.html',
  },
  options_page: 'src/options/index.html',
  content_scripts: [
    {
      matches: ['https://www.youtube.com/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
})
```

判断理由:

- `manifest_version` は3固定。
- storageの利用に `storage` permissionが必要。
- 対象サイトはYouTubeだけに制限する。
- content scriptはデフォルトのisolated worldで十分なので `world: "MAIN"` を指定しない。
- backgroundは不要なので定義しない。
- `tabs` や `scripting` permissionは追加しない。

アイコンは素材が決まってから追加する。存在しないアイコンパスを先にmanifestへ書くと、Chrome読込エラーになる。

optionsの入口がまだ用意できていない一時段階では `options_page` を省略してよい。ただし、はるなさんのpopup/options PRで追加し、最終構成を [03_architecture.md](./03_architecture.md) と一致させる。

### Step 5: vite.config.tsを設定する

ReactプラグインとCRXJSプラグインを両方登録する。

```ts
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  server: {
    cors: {
      origin: [
        /chrome-extension:\/\//,
      ],
    },
  },
})
```

`crx({ manifest })` が、manifestに書かれたpopup、options、content scriptをbuild対象として解決する。手作業でそれぞれをRollupのinputへ重複登録しない。

`server.cors` はCRXJSの開発サーバーへ拡張機能から接続するための設定で、CRXJS公式のfrom-scratch構成に合わせている。

### Step 6: Chrome APIの型を有効にする

Viteテンプレートの `tsconfig.app.json` に `compilerOptions.types` がある場合、`chrome` を追加する。

```json
{
  "compilerOptions": {
    "types": ["vite/client", "chrome"]
  }
}
```

`types` 自体がない場合、`@types/chrome` は通常自動で読み込まれるため、無理に追加しなくてもよい。

TypeScriptで `Cannot find name 'chrome'` が出た場合に、この設定と `@types/chrome` の導入を確認する。

### Step 7: npm scriptsを確認する

`package.json` に最低限、次のscriptが必要である。

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build"
  }
}
```

Viteテンプレートが生成した `lint` scriptは残す。`preview` は通常のWebサイト確認用であり、Chrome拡張の読み込みには使わない。

### Step 8: buildする

```bash
npm run build
```

成功後にmanifestを確認する。

```bash
ls dist
cat dist/manifest.json
```

確認項目:

- `manifest_version` が3
- `permissions` が `storage` だけ
- content scriptのmatchesがYouTubeだけ
- popupの出力先が存在する
- backgroundがない

### Step 9: Chromeへ読み込む

[通常セットアップのStep 3](#step-3-chromeへ読み込む) と同じ手順で `dist/` を読み込む。

### Step 10: 最初のPRを作る

```bash
git status
git add package.json package-lock.json manifest.config.ts vite.config.ts
git add tsconfig*.json src public
git commit -m "chore: set up React Vite Chrome extension"
git push -u origin feature/setup
```

`git status` で、`node_modules/` と `dist/` が追加対象になっていないことを確認する。含まれる場合は `.gitignore` に次があるか確認する。

```gitignore
node_modules/
dist/
```

PRには次の確認結果を書く。

- Node.jsの版
- `npm run build` の結果
- Chromeへ `dist/` を読み込めたか
- popupが開いたか
- YouTubeでcontent scriptが読み込まれたか
- `dist/manifest.json` のpermission

## 6. 開発中の起動方法

### 通常の開発

```bash
npm run dev
```

初回だけ、生成された `dist/` をChromeの「パッケージ化されていない拡張機能」として読み込む。CRXJSがHMRを提供するため、popupなどの変更は開発サーバーから反映される。

ただし、次の場合は手動操作が必要になる。

- manifestを変更した: `chrome://extensions` で拡張機能の再読み込みボタンを押す。
- content scriptの反映が確認できない: 拡張機能を再読み込みしてYouTubeタブも再読み込みする。
- 新しいcontent script対象ページを追加した: manifest再読み込み後に対象ページを開き直す。

デモ前とPR前はHMRだけで済ませず、必ず次を実行する。

```bash
npm run build
```

その後、Chromeで拡張機能とYouTubeタブを再読み込みし、本番buildで確認する。

## 7. Chrome上での確認場所

### popup

拡張機能アイコンを押し、popupを右クリックして「検証」を選ぶとDevToolsを開ける。

### options

`chrome://extensions` の拡張機能カードから「詳細」→「拡張機能のオプション」を開く。拡張機能アイコンの右クリックメニューから開ける場合もある。

### content script

YouTubeタブで通常のDevToolsを開く。Console上部のJavaScript contextをcontent script側へ切り替えると、content scriptのログを確認できる。

### storage

拡張機能のpopupまたはoptionsのDevToolsで、ApplicationパネルからExtension Storageを確認する。保存形式が次になっていることを確認する。

```json
{
  "version": 1,
  "groups": []
}
```

## 8. よくある問題

### `npm install` / `npm ci` がengineエラーになる

原因の多くはNode.jsが古いこと。`node -v` を確認し、24 LTSへそろえる。

### `npm ci` がlock fileエラーになる

`package-lock.json` がない、または `package.json` と一致していない可能性がある。

- 通常メンバー: 勝手にlock fileを作り直さず、セットアップPRがmainへ入っているか確認する。
- 依存関係を変更した担当: `npm install` で両ファイルを更新し、同じcommitに含める。

### Chromeがmanifestを見つけられない

読み込むフォルダが間違っている。`dist/manifest.json` が存在することを確認し、Chromeでは `dist/` を選ぶ。

### `Cannot find name 'chrome'`

`@types/chrome` と `tsconfig.app.json` の `types` 設定を確認する。

### popupは動くがYouTubeが変わらない

次の順で確認する。

1. manifestの `content_scripts.matches` が `https://www.youtube.com/*` か
2. 拡張機能を再読み込みしたか
3. YouTubeタブを再読み込みしたか
4. content scriptのConsoleにエラーがないか
5. storageに `enabled: true` のグループがあるか
6. 現在のYouTube DOMにセレクターが合っているか

### 修正が反映されない

- `npm run dev` が起動中か確認する。
- manifest変更後は拡張機能を再読み込みする。
- content script変更後はYouTubeタブも再読み込みする。
- 安定しない場合は `npm run build` をやり直し、拡張機能を再読み込みする。

### `dist/` をcommitしてしまった

まだpush前なら、ファイル自体を消さずにGitの追跡対象から外す方法を確認する。独断で履歴を書き換えず、`git status` を添えて質問する。

## 9. セットアップ完了条件

- [ ] 2人ともNode.js 24系を使っている
- [ ] `npm ci` が成功する
- [ ] `npm run build` が成功する
- [ ] `dist/manifest.json` の `manifest_version` が3
- [ ] Chromeへ `dist/` を読み込める
- [ ] popupを開ける
- [ ] optionsを開ける
- [ ] YouTubeでcontent scriptが動く
- [ ] YouTube以外ではcontent scriptが動かない
- [ ] manifestにbackgroundがない
- [ ] manifestのpermissionが必要最小限

## 10. 技術調査記録

### 調査日

2026-07-03

### 参照した情報

- [Vite公式 Getting Started](https://vite.dev/guide/): React TypeScriptテンプレート、Node.js要件、build command
- [Node.js公式 Releases](https://nodejs.org/en/about/previous-releases): Node.js 24がLTSであること
- [CRXJS公式 From Scratch](https://crxjs.dev/guide/installation/from-scratch/): Vite plugin、manifest、CORS、dev/buildの基本設定
- [CRXJS公式 Manifest](https://crxjs.dev/concepts/manifest/): `defineManifest` の推奨
- [CRXJS公式 Content Scripts](https://crxjs.dev/concepts/content/): manifestからcontent scriptを指定する構成
- [npm: @crxjs/vite-plugin](https://www.npmjs.com/package/@crxjs/vite-plugin): 安定版2.7.1、Vite 8対応
- [Chrome公式 Hello World](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world): デベロッパーモードとunpacked extensionの読み込み
- [Chrome公式 Manifest](https://developer.chrome.com/docs/extensions/reference/manifest): Manifest V3の形式
- [Chrome公式 storage API](https://developer.chrome.com/docs/extensions/reference/api/storage): `storage` permission、local保存、変更通知

### 結論

- Node.js 24 LTSをチーム標準とする。
- Vite 8 + React TypeScriptテンプレートへCRXJS 2.7.1を組み込む。
- manifestは `manifest.config.ts` と `defineManifest` で管理する。
- build成果物は `dist/` とし、Chromeへはこのフォルダを読み込む。
- backgroundは省略し、権限は `storage` とYouTubeのcontent script対象だけに限定する。

### 要確認

- 実装開始日が大きくずれた場合、Node.js 24のLTS状態と各パッケージのsecurity updateを再確認する。
- Chrome UIの日本語表記はバージョンで変わる可能性がある。ボタンが見つからない場合は `chrome://extensions` のDeveloper modeとLoad unpackedに相当する項目を探す。
- YouTubeのDOMセレクターは公式APIではなく変更され得るため、セットアップ完了後に実ブラウザで候補を確認する。
