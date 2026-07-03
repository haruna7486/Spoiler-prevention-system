# アーキテクチャ

## 1. 全体方針

この拡張機能は、次の2つの実行プログラムと共有コードで構成する。

1. popup/options: 設定UIと `chrome.storage.local` への読み書き
2. content script: YouTube DOMの監視・一致判定・表示変更
3. shared: 両方が使う型、storage操作、正規化ロジック

backgroundはChrome拡張の代表的な構成要素だが、MVPでは省略する。

## 2. 想定フォルダ構成

これは実装時の基準構成である。Vite初期生成物をそのまま増築せず、責務ごとに配置する。

```text
Spoiler-prevention-system/
├── public/
│   └── icons/                    # 拡張機能のアイコン
├── src/
│   ├── popup/
│   │   ├── index.html            # ツールバーから開く画面
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── components/
│   ├── options/
│   │   ├── index.html            # 詳細設定画面
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── components/
│   ├── content/
│   │   ├── index.ts              # content scriptの入口
│   │   ├── core/
│   │   │   ├── matcher.ts        # 正規化済みキーワードとの一致判定
│   │   │   ├── observer.ts       # MutationObserverと実行頻度制御
│   │   │   └── processor.ts      # サイト別ルールの呼び出し
│   │   └── sites/
│   │       └── youtube/
│   │           ├── selectors.ts  # YouTube固有セレクター
│   │           ├── rules.ts      # タイトル・画像・領域の変更
│   │           └── video.ts      # 動画終了検知
│   └── shared/
│       ├── types.ts              # StorageData、KeywordGroupなど
│       ├── storage.ts            # chrome.storage.localの共通操作
│       └── normalize.ts          # 全角半角の正規化
├── docs/
├── manifest.config.ts            # Manifest V3の定義
├── vite.config.ts                # React + CRXJSのビルド設定
├── package.json
├── package-lock.json
└── tsconfig*.json
```

ファイルを分ける目的は、YouTubeのセレクター変更と共通の一致判定を混在させないことである。別サイトへ対応するときは `src/content/sites/<site-name>/` を増やし、共通処理を使い回す。

## 3. 3プログラムの関係

```text
┌──────────────────────┐
│ popup / options      │
│ React + TypeScript   │
│ 追加・削除・トグル   │
└──────────┬───────────┘
           │ chrome.storage.local.set()
           ▼
┌──────────────────────┐
│ chrome.storage.local │
│ version / groups     │
└──────────┬───────────┘
           │ chrome.storage.onChanged
           ▼
┌──────────────────────────────┐
│ content script              │
│ 素のTypeScript              │
│ 正規化 → 一致判定 → DOM変更 │
└──────────┬───────────────────┘
           │ MutationObserver
           ▼
┌──────────────────────┐
│ YouTubeのDOM         │
│ SPA遷移・後読み込み  │
└──────────────────────┘

┌────────────────────────────────────────┐
│ background service worker              │
│ MVPでは置かない。将来必要な場合のみ追加 │
└────────────────────────────────────────┘
```

### popup/options

- 初期表示時にstorageからデータを読む。
- ユーザー操作を検証してstorageへ保存する。
- YouTubeタブやcontent scriptへ直接メッセージを送らない。
- DOM書き換えの詳細を知らない。

### content script

- 読み込み時にstorageから現在の設定を読む。
- `enabled: true` のグループから有効キーワードを組み立てる。
- 現在のDOMを走査してルールを適用する。
- `storage.onChanged` で設定変更を検知し、再評価する。
- `MutationObserver` でYouTubeが追加・更新した要素を処理する。

### background

初期実装ではファイルもmanifest定義も作らない。

popup、options、content scriptはすべて `chrome.storage` を直接利用できる。今回の更新通知はstorageイベントだけで成立し、常駐処理や複雑な双方向通信もないため、backgroundを置くと責務が増えるだけである。

将来、context menu、alarm、インストールイベントなど、ページやpopupの寿命と独立したChrome APIイベントが必要になった場合に、Manifest V3のservice workerとして追加する。

## 4. storageデータ契約

`chrome.storage.local` のトップレベルに次の形で保存する。

```json
{
  "version": 1,
  "groups": [
    {
      "id": "grp_a1b2c3",
      "label": "W杯2026",
      "keywords": ["W杯2026", "ワールドカップ", "アルゼンチン"],
      "enabled": true,
      "createdAt": 1720000000000
    }
  ]
}
```

### 各フィールド

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `version` | number | 将来データ形式を移行するためのバージョン。初期値は1 |
| `groups` | array | 作品・イベント単位のグループ一覧 |
| `id` | string | グループの一意なID。表示名を変更しても変えない |
| `label` | string | ユーザー向けのグループ名 |
| `keywords` | string[] | 一致判定へ使う文字列 |
| `enabled` | boolean | `false` のグループを判定対象から除外する |
| `createdAt` | number | 作成時刻のUnix time（ミリ秒） |

### 契約上のルール

- `version` と `groups` のフィールド名・型を担当ごとに変えない。
- 空文字や正規化後に空になるキーワードは保存しない。
- 同一グループ内の重複キーワードを保存しない。
- `id` は一度発行したら変更しない。
- 配列やオブジェクトを更新するときは、新しい値を作ってstorageへ保存する。
- 読み込み結果が空の場合は `{ version: 1, groups: [] }` として扱う。
- 未知の `version` を黙って解釈しない。将来のmigration処理へ送る。

型定義とstorage操作は `src/shared/` に一つだけ実装する。popup担当とcontent担当が別々の型を作らないことが、最初の結合条件になる。

## 5. リアルタイム反映の流れ

### 初回読み込み

```text
YouTubeを開く
  ↓
content script起動
  ↓
chrome.storage.local.get(["version", "groups"])
  ↓
有効キーワードを正規化してメモリへ保持
  ↓
現在のDOMを1回処理
  ↓
storage.onChangedとMutationObserverを登録
```

初期データの読み込みが終わる前にDOM処理を走らせない。イベント購読を登録する順序では、読み込み中の更新を取りこぼさない設計にする。

### popup/optionsからの変更

```text
ユーザーが保存
  ↓
popup/optionsがchrome.storage.local.set()
  ↓
storage.onChangedがcontent scriptで発火
  ↓
version/groupsを再読込
  ↓
有効キーワードを再構築
  ↓
表示中DOMを再評価
```

`onChanged` の `changes` だけから全状態を組み立てず、必要に応じて `version` と `groups` を再読込する。複数キーの変更や初期値欠落でも同じ経路で扱えるためである。

### YouTubeの後読み込み

```text
YouTubeがDOMを追加・再利用
  ↓
MutationObserverが変更を検知
  ↓
短時間の変更をまとめる
  ↓
変更された範囲を中心に再評価
  ↓
一致した要素へ冪等にルール適用
```

## 6. MutationObserverの実装基準

YouTubeではスクロール、SPA遷移、動画切り替えで大量のDOM変更が起きる。observerのcallback内で毎回ページ全体を走査すると、スクロールや動画再生を重くする。

次をレビュー基準とする。

- observerは必要な親要素へ一度だけ登録する。
- callback内で重い一致判定を直接行わない。
- debounceまたはthrottleで短時間の変更をまとめる。
- 可能なら `MutationRecord` の `addedNodes` から追加範囲だけを処理する。
- ページ全体の再走査は、storage変更やSPA遷移など必要な時だけにする。
- 同じ要素を再処理しても二重の伏字や重複UIを作らない。
- observer自身のDOM変更で無限ループしない。
- セレクターが見つからなくても例外で全処理を止めない。

debounceのミリ秒値は実測して決める。根拠なく固定せず、YouTubeのスクロールと画面遷移で操作感を確認する。

## 7. DOM変更の実装基準

DOM変更は「適用」と「解除」の両方を考える。ユーザーがグループを無効化・削除したときに、表示中の要素が元へ戻せなければリアルタイム反映にならない。

- 元のタイトルやサムネイル情報を安全に保持する。
- 伏字済み文字列を再度伏字化しない。
- YouTubeが同じDOM nodeを別動画へ再利用するケースを考慮する。
- 拡張が追加したclassや属性は名前を統一する。
- 非表示は可能ならclassの付け外しで可逆にする。
- 要素が途中で消えても例外にしない。
- YouTubeの内部React stateや非公開JavaScript変数へ依存しない。

元情報の保持方法、サムネイル差し替え方法、伏字表示は実装TODOであり、最初のcontent PRでテスト方針と一緒に決める。

## 8. サイト別ルール

YouTube固有の次の情報は `src/content/sites/youtube/` へ閉じ込める。

- タイトルの候補セレクター
- サムネイルの候補セレクター
- コメント・おすすめ領域の候補セレクター
- SPA遷移や動画要素の扱い
- サイト固有の表示変更

共通層は、サイトルールに「対象範囲を処理する」ことだけを依頼する。将来別サイトを追加するときに、YouTube用ファイルへ条件分岐を積み重ねない。

YouTubeのDOMは予告なく変わる。セレクターを変更したPRでは、ホーム、検索結果、動画視聴ページ、関連動画のどこを確認したかをPR本文へ記載する。

## 9. 複雑なメッセージングを使わない

`chrome.runtime.sendMessage` によるpopupとcontentの双方向通信はMVPでは使わない。

storageを単一の正とし、popupは保存、contentは購読という一方向の責務にすると、popupが閉じた後も状態が残り、再読み込み時も同じデータから復元できる。

将来、保存を伴わない一時コマンドが本当に必要になった場合だけruntime messagingを追加する。その場合はメッセージ型、送信元、失敗時の挙動を文書化する。

## 10. Manifestと権限

初期manifestの要点は次のとおり。

- `manifest_version: 3`
- `permissions: ["storage"]`
- `action.default_popup: "src/popup/index.html"`
- `options_page: "src/options/index.html"`
- `content_scripts.matches: ["https://www.youtube.com/*"]`
- `content_scripts.run_at: "document_idle"`
- `background` は定義しない

content scriptはデフォルトのisolated world（ページ本体のJavaScriptと変数空間を分離する実行環境）で動かす。今回のDOM操作とstorage利用にMAIN worldは不要である。

実際の設定手順は [06_setup-guide.md](./06_setup-guide.md) を参照する。

## 11. 結合時の確認項目

- popupとcontentが同じstorage型をimportしている。
- popupで追加したキーワードがYouTubeへ再読み込みなしで反映される。
- `enabled: false` のグループが判定から除外される。
- グループ削除後に表示中DOMが再評価される。
- 新しくスクロール表示された動画も処理される。
- 同じ要素を複数回処理しても表示が壊れない。
- YouTube以外ではcontent scriptが実行されない。
- Chrome再起動後も設定が残る。
- manifestに不要な権限がない。
