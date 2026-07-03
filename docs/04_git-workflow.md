# Git / GitHub運用

## 1. このプロジェクトのルール

- `main` は常にビルドでき、デモ可能な状態に保つ。
- 通常の作業は `feature/...` ブランチで行う。
- 1つのブランチに無関係な変更を混ぜない。
- PR（Pull Request: 変更内容を確認して取り込む仕組み）でのレビューを推奨する。
- レビュー担当が忙しいときは開発を止めず、セルフチェック後にチームで合意して取り込む。
- `git push --force` と `git reset --hard` は、意味と影響を説明できない限り使わない。
- `package-lock.json` は削除せず、依存関係を変えた人がコミットする。

## 2. ブランチ名

担当の基本ブランチは次のとおり。

| 担当 | ブランチ例 |
| --- | --- |
| popup/options | `feature/popup` |
| content script | `feature/content` |
| 共通の初期設定 | `feature/setup` |
| ドキュメント修正 | `docs/<内容>` |
| バグ修正 | `fix/<内容>` |

長期間同じブランチを使い続けず、レビューできる単位で作成する。たとえばpopup全体が大きい場合は `feature/popup-storage` と `feature/popup-group-form` に分ける。

### Issueを使う範囲

複数人へ影響する作業、仕様判断が必要な作業、後回しにする不具合はGitHub Issueへ残す。数分で終わる文言修正までIssue必須にはしない。

Issueには次を書く。

- 誰のどの体験を改善するか
- 完了したと判断できる条件
- 関連する仕様やTODO
- 担当または相談相手

Issue番号がある場合は、ブランチ名やPR本文から参照する。

## 3. 最初のpush

リモートリポジトリが空の場合だけ、リポジトリ管理者1名が初期化する。2人が同時に行わない。

```bash
git status
git add README.md docs/
git commit -m "docs: initialize project documentation"
git branch -M main
git push -u origin main
```

すでにGitHub上に `main` がある場合、この手順は不要である。先に `git pull` し、既存履歴を上書きしない。

初回push後、GitHubでdefault branchが `main` になっていることを確認する。以後は `main` へ直接実装をpushせず、featureブランチを使う。

## 4. 初回clone

GitHubのリポジトリURLをコピーし、作業用フォルダで実行する。

```bash
git clone https://github.com/haruna7486/Spoiler-prevention-system.git
cd Spoiler-prevention-system
git status
```

`git status` に `On branch main` と表示されればよい。

初回だけ名前とメールアドレスを確認する。

```bash
git config user.name
git config user.email
```

未設定なら、自分の情報を設定する。

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

## 5. 日常の流れ

```text
mainを最新化
  ↓
featureブランチを作成
  ↓
小さく実装・確認
  ↓
commit
  ↓
GitHubへpush
  ↓
PR作成・レビュー
  ↓
mainへmerge
  ↓
不要ブランチを削除
```

### Step 1: mainを最新にする

```bash
git switch main
git pull --ff-only origin main
```

`--ff-only` は、意図しないmerge commitを自動作成しないための指定である。失敗した場合は履歴が分岐しているため、勝手にforceせずチームへ共有する。

### Step 2: 作業ブランチを作る

```bash
git switch -c feature/popup
```

すでに同名ブランチがある場合は新規作成せず、次で切り替える。

```bash
git switch feature/popup
```

### Step 3: 作業前後に状態を見る

```bash
git status
git diff
```

- `git status`: 変更されたファイルを確認する。
- `git diff`: まだcommitしていない変更内容を確認する。

自分が変更した覚えのないファイルが表示されたら、そのまま削除・上書きせず、原因を確認する。

### Step 4: 動作確認する

最低限、PR前に次を実行する。

```bash
npm run build
```

lintやtest用scriptが追加された後は、それらも実行する。Chrome上で確認した内容もPRへ書く。

### Step 5: commitする

関連するファイルだけを選んで追加する。

```bash
git add src/popup
git status
git commit -m "feat: add keyword group form"
```

すべてを無条件に `git add .` すると、不要ファイルや他人の変更を混ぜやすい。初心者ほど `git status` で対象を確認してからcommitする。

commitメッセージの例:

- `feat: add keyword group storage`
- `fix: prevent duplicate title masking`
- `docs: clarify Chrome loading steps`
- `refactor: isolate YouTube selectors`
- `test: add normalization cases`

### Step 6: pushする

初回だけ `-u` を付ける。

```bash
git push -u origin feature/popup
```

2回目以降は次でよい。

```bash
git push
```

### Step 7: PRを作る

GitHubで `feature/popup` から `main` へのPRを作る。

PR本文には最低限、次を書く。

```text
## 関連Issue
- Closes #番号

## ユーザー価値
- この変更で、誰の何がどう変わるか

## 変更内容
- 何を実装・修正したか

## 理由
- なぜこの方法にしたか

## 確認方法
- 実行したコマンド
- Chrome上で確認したページと操作

## 未対応
- このPRに含めなかったこと

## 判断・学び
- 捨てた案、詰まった点、次回に残す知見
```

Issueがない場合は「なし」と書く。`Closes #番号` は、そのPRがmergeされたときに対象Issueを自動で閉じるGitHubの記法である。

PRは小さいほど確認しやすい。popupとcontentの大規模変更を1つのPRへ混ぜない。

## 6. 作業中にmainの更新を取り込む

featureブランチで作業中にmainが更新された場合は、未commitの変更を先にcommitしてから行う。

```bash
git fetch origin
git switch feature/popup
git merge origin/main
```

このプロジェクトでは、初心者が安全に扱いやすいmerge方式を基本にする。rebaseは履歴を書き換えるため、チームで理解がそろうまで必須にしない。

競合（同じ行を別々に変更した状態）が発生したら、次を行う。

1. `git status` で競合ファイルを確認する。
2. `<<<<<<<`、`=======`、`>>>>>>>` の範囲を読む。
3. どちらの変更を残すか担当者同士で確認する。
4. 記号を除去して正しい内容へ直す。
5. buildとChrome確認をやり直す。
6. `git add` と `git commit` を行う。

理解できない競合を「両方残す」で解決しない。特にstorage型、manifest、Vite設定は結合点なので2人で確認する。

## 7. merge後

```bash
git switch main
git pull --ff-only origin main
git branch -d feature/popup
```

GitHub側のfeatureブランチも、不要ならPR画面の `Delete branch` で削除する。

次の作業は、更新済みの `main` から新しいfeatureブランチを作る。

## 8. レビューを待てない場合

PRレビューは推奨だが必須ではない。レビュー役がすぐ対応できない場合は、次のセルフチェックを満たし、チーム内でmerge可否を共有して進める。

- [ ] 変更範囲がPRの目的だけに限定されている
- [ ] `npm run build` が成功する
- [ ] popupまたはYouTube上で主要動作を確認した
- [ ] 不要な権限を追加していない
- [ ] storageデータ構造を独断で変更していない
- [ ] TODOや未確認事項をPR本文に明記した
- [ ] `main` の既存機能を壊していない

## 9. やってはいけない操作

- `main` へ未確認の実装を直接pushする
- 他人のブランチをforce pushする
- 競合解消のためにファイル全体を片側で上書きする
- `package-lock.json` を「よく分からないから」削除する
- build成果物の `dist/` をcommitする
- APIキー、個人情報、ローカルパスをcommitする

Git操作で詰まったら、実行前のコマンド、表示されたエラー全文、`git status` の結果を共有する。
