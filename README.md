# Spoiler Prevention System

> 観る前に、知ってしまう体験をなくす。

YouTubeのタイトル、サムネイル、コメント、おすすめ欄から、ユーザーが避けたいネタバレを隠すChrome拡張機能です。

## 課題

スポーツ、映画、ドラマ、アニメ、ゲーム実況。リアルタイムで観られなかった人が後から楽しもうとしても、YouTubeを開いた瞬間にタイトルやサムネイルで結果を知ってしまうことがあります。

ネタバレは動画の中だけにあるのではありません。動画を選ぶ前のホーム画面、検索結果、関連動画、コメントにも存在します。

チームの事前調査では、既存のネタバレブロッカーを20件以上確認しました。一方で、テキスト中心の判定が多く、サムネイル画像の遮断や表記ゆれへの対応には改善余地があります。

本プロダクトは、ユーザー自身が「今は知りたくない対象」を作品・イベント単位で登録し、テキストと画像の両方からネタバレへの導線をまとめて隠します。

## 主な機能

### キーワードをグループで管理

「W杯2026」のようなグループへ、「ワールドカップ」「アルゼンチン」など複数のキーワードを登録できます。

### タイトルとサムネイルを保護

登録キーワードに一致するタイトルを伏字化し、サムネイルを内容が見えない表示へ差し替えます。

### コメントとおすすめを非表示

動画本編を安全に観られるよう、ネタバレにつながるコメント・おすすめ領域を隠します。

### 設定をリアルタイム反映

popupでの変更を、開いているYouTubeタブへページ再読み込みなしで反映します。

### YouTubeの後読み込みへ追従

無限スクロールや画面遷移で後から追加される動画も継続して監視します。

> 現在は設計・初期開発段階です。まずキーワード登録、タイトル・サムネイル変更、コメント・おすすめ非表示のMVPを実装します。

## 設計思想

### 拡張機能だけで完結

サーバー、バックエンド、外部APIを使いません。キーワードは `chrome.storage.local` に保存し、判定もブラウザ内で行います。

- 閲覧内容やキーワードを外部へ送信しない
- 通信待ちなしで反映できる
- サーバー運用費がかからない
- 拡張機能を入れるだけで使える

### UIとDOM処理を分離

- popup/options: React + Vite + TypeScript
- YouTube書き換え: 素のTypeScript

YouTube自身が管理するDOMへ拡張側のReactを重ねず、競合を避けます。一方、独立したpopup/optionsではReactを使い、追加・削除・トグルなどのUI状態を管理します。

### サイト別ルールを追加できる

一致判定やデータ構造は共通化し、YouTube固有のDOMセレクターと書き換え規則を分離します。将来は同じ仕組みに別サイト用ルールを追加できます。

## 仕組み

```text
popup / options
  │ キーワードを保存
  ▼
chrome.storage.local
  │ storage.onChanged
  ▼
content script
  │ 一致判定・DOM変更
  ▼
YouTube
  ▲
  └ MutationObserverで後読み込みを検知
```

複雑な双方向メッセージングやbackground処理は置かず、storageを唯一のデータソースにします。

## 技術構成

| 領域 | 技術 |
| --- | --- |
| Chrome拡張 | Manifest V3 |
| popup / options | React, TypeScript |
| content script | TypeScript, DOM API, MutationObserver |
| ビルド | Vite 8, `@crxjs/vite-plugin` 2.7.1 |
| データ保存 | `chrome.storage.local` |
| サーバー / DB / 外部API | なし |

技術選定の根拠は [docs/02_tech-stack.md](./docs/02_tech-stack.md) に記録しています。

## セットアップ

推奨環境はNode.js 24 LTSとGoogle Chrome安定版です。

初期構成がmainへ入った後は、次の流れで起動します。

```bash
git clone https://github.com/haruna7486/Spoiler-prevention-system.git
cd Spoiler-prevention-system
npm ci
npm run build
```

Chromeで `chrome://extensions` を開き、デベロッパーモードをONにして、「パッケージ化されていない拡張機能を読み込む」から `dist/` を選択します。

現時点のdocs-only状態から初期構成を作る担当者は、[環境構築ガイド](./docs/06_setup-guide.md) の「初回セットアップ」に従ってください。

## ロードマップ

### MVP

- キーワードグループの登録・削除
- タイトルの伏字化
- サムネイルの差し替え
- コメント・おすすめの非表示
- 設定変更のリアルタイム反映
- YouTubeのSPA遷移・後読み込み対応

### Next

- 視聴済みグループの有効・無効管理
- 動画終了を使った視聴済み管理
- キーワード提案

### Future

- YouTube以外の動画・SNSサイトへの対応
- 同義語を含む表記ゆれ対応
- キーワードリストの共有

## ドキュメント

- [プロジェクト概要](./docs/01_project-overview.md)
- [技術スタックと選定理由](./docs/02_tech-stack.md)
- [アーキテクチャ](./docs/03_architecture.md)
- [Git / GitHub運用](./docs/04_git-workflow.md)
- [役割分担と実装着手順](./docs/05_task-assignment.md)
- [環境構築ガイド](./docs/06_setup-guide.md)

## 開発体制

- はるなさん: popup/options、storage、提案・視聴済みUI
- はやとさん: content script、DOM監視・書き換え、動画終了検知
- 共通: manifest、結合テスト、デモ準備

実装はfeatureブランチで進め、`main` を常にデモ可能な状態に保ちます。
