## AIによるプレゼンスライド生成スキル

### 概要
生成AI（Claude / Manus）を用いて、実用レベルのプレゼンスライドを一発で生成するためのプロンプト設計スキル。

---

### コア原則
- 原稿をそのまま貼らせない
- 1スライド最大4 bullet
- 1 bullet = 1行
- 1スライド1メッセージ
- 図解優先

---

### 設計ポイント
- 正本（内容）とプロンプト（制御）を分離
- スライドの型を固定
- 図はMermaidで出力させる
- テンプレートはデザインのみ使用

---

### 学び
AIは「何を書くか」ではなく「どう制御するか」が重要

---

### よくある失敗
- 原稿全文を貼り、文字量が多すぎる
- 1スライドに複数メッセージを詰め込む
- テンプレートの文章や構成まで流用してしまう
- デモスライドで仮画像を入れて差し替え忘れる

---

### どう制御するか
- 正本（内容）と実行指示（制御）を分離する
- bullet数・1行制約・図解優先を明示する
- As-Is / To-Be など重要スライドは出力形式を固定する
- テンプレートはデザインのみ使用と明記する

---

### 再現手順
1. `docs/presentation/template/slide-content-template.md` をコピー
2. `docs/presentation/projects/<project-name>/slide-content.md` を作成
3. 主メッセージ・制約・回避策・成果を記入
4. ClaudeまたはManusに共通プロンプトを適用
5. 生成後に「1枚1メッセージ」「最大bullet数」を目視チェック

---

### 参照すべきファイル
- `docs/prompts/presentation/claude-slide-template.md`
- `docs/prompts/presentation/manus-instruction-final.md`
- `docs/presentation/template/slide-content-template.md`
- `docs/presentation/projects/kikagaku-final/slide-content.md`（入力例）

---

### Claude / Manus の使い分け
- Claude: 構成と情報圧縮を重視したスライド案の初期生成に向く
- Manus: テンプレート適用と最終出力の実行指示に向く
- 共通方針: どちらも正本ファイル参照、テンプレートはデザインのみ使用

---
