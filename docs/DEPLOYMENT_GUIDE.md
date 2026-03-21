# DEPLOYMENT_GUIDE

コードを変更したあとの反映手順。
エンジニアでなくても迷わないよう、GUI操作をステップ単位で記載する。

---

## GAS（Google Apps Script）の再デプロイ手順

コードを変更しても「新バージョン」としてデプロイし直さないと反映されない。

### 手順

1. GAS エディタ（script.google.com）を開く
2. 右上の「デプロイ」ボタンをクリック
3. 「デプロイを管理」を選択
4. 鉛筆アイコン（編集）をクリック
5. 「バージョン」のドロップダウンで「新バージョン」を選択
6. 説明欄に変更内容を簡単に書く（例：「PDF生成修正」）
7. 「デプロイ」をクリック

**デプロイURLは変わらない。** バージョンが更新されるだけ。

### よくある間違い

- 「保存」だけして再デプロイしていない → 古いコードが動き続ける
- 「新バージョン」ではなく「同じバージョン」を選んでいる → 変更が反映されない

---

## Cloudflare Worker の更新手順

GAS の デプロイURL が変わった場合のみ必要。
通常の GAS コード変更では Worker の更新は不要。

### GAS デプロイ URL が変わる条件

- GAS プロジェクトを最初からデプロイし直したとき
- 「デプロイを削除して新規作成」したとき

通常の「新バージョンでデプロイ」では URL は変わらない。

### Worker の gasUrl を更新する手順

1. Cloudflare ダッシュボード（dash.cloudflare.com）を開く
2. Workers & Pages → 該当 Worker（icy-art-b1b8）を選択
3. 「編集」→ コードエディタを開く
4. `const gasUrl = '...'` の部分を新しい GAS デプロイ URL に変更
5. 「保存してデプロイ」をクリック

### 現在の URL（変わっていないことを確認してから使う）

```
GAS デプロイURL:
https://script.google.com/macros/s/AKfycbzMKJI4Eiu0TZrdsIYrTlsxXC2G2BXr04HgKBnjqHToK1me4ZV5-6X99d7PGYflwnx_/exec

Worker URL:
https://icy-art-b1b8.koji-ishimaru.workers.dev
```

---

## Index.html の更新手順

GAS 上にホストされている HTML を更新する手順。

1. GAS エディタを開く
2. 左サイドバーの「ファイル」から `Index.html` を選択
3. 内容を全選択して削除
4. 新しい Index.html の内容を貼り付ける
5. 保存（Ctrl+S）
6. **GAS を再デプロイする**（← これを忘れやすい）
7. Web画面を Ctrl+Shift+R でハードリロード

---

## Web画面をハードリロードする

通常の F5 では GAS のキャッシュが残ることがある。
**Ctrl+Shift+R**（Mac は Cmd+Shift+R）でキャッシュを無視してリロードする。

---

## GPT Builder（カスタムGPT）の instructions.md を更新する手順

1. ChatGPT を開いて右上のアイコン → 「GPTを探す」→ 自分のカスタムGPTを選択
2. 「編集」をクリック
3. 「設定」タブ → 「指示」欄の内容を全選択して削除
4. 新しい instructions.md の内容を貼り付ける
5. 「保存」をクリック

---

## 変更後の動作確認チェックリスト

GAS を変更・再デプロイしたあとに必ず確認する。

### 最小確認（毎回）

- [ ] GAS の実行ログにエラーが出ていないか（GASエディタの「実行数」タブ）
- [ ] Web画面を Ctrl+Shift+R でリロードして表示が壊れていないか

### 追加確認（変更箇所に応じて）

| 変更箇所 | 確認方法 |
|---|---|
| doPost の action 追加 | PowerShell でリクエストを送って JSON を確認 |
| doGet の action 追加 | ブラウザで GAS_URL?action=xxx にアクセス |
| 写真カードの表示変更 | Web画面のマップタブでピンをクリックして確認 |
| 報告書関連 | 報告書タブで新規作成→PDF生成まで通しで確認 |
| PDF生成 | GASエディタで testStep11And12() を実行 |

---

## PowerShell での疎通確認手順

→ DEVELOPMENT_PATTERNS.md の「PowerShell でのAPIテスト」を参照
