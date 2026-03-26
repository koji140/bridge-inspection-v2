# AIによるプレゼンスライド生成スキル

## 概要
生成AI（Claude / Manus）を使って、実用レベルのプレゼンスライドを安定して生成するためのスキル。
単に内容を作るのではなく、スライドとして成立する情報量・構造・視認性を制御することを目的とする。

## なぜ必要か
生成AIにスライド作成をそのまま依頼すると、以下の失敗が起きやすい。
- 原稿の文章をそのまま貼る
- 1枚の情報量が多すぎる
- 1スライドに複数メッセージが混ざる
- 図解すべき内容が箇条書きになる
- テンプレートの見た目だけ使って中身が崩れる

## コア原則
- 原稿をそのまま貼らせない
- 1スライド最大4 bullet
- 1 bullet = 1行
- 1スライド1メッセージ
- 図解優先
- テンプレートはデザインのみ使用
- 内容正本と実行プロンプトを分離する

## 制御ポイント
### 1. 正本を1つにする
- 内容定義ファイルを1つに決める
- AIにはそのファイルを最優先で読ませる

### 2. スライドの型を固定する
- 通常スライド
- 比較スライド
- 2カラム
- フロー図
- スクリーンショット枠スライド
など、型を先に決める

### 3. 図は出力形式まで指定する
- 「図で出して」だけでは不十分
- Mermaid など、図の表現形式まで指定する

### 4. テンプレートの役割を限定する
- テンプレートはデザインのみ
- 構成や文言はプロンプト優先

## Claude / Manus の使い分け
### Claude
- 要約が得意
- 文章圧縮に向く
- 強い制約を与えると安定する

### Manus
- レイアウトは比較的得意
- ただし、指示が曖昧だと文章を流し込みやすい
- 図や比較の指示を明確にする必要がある

## 再現手順
1. `docs/presentation/template/slide-content-template.md` をコピーする
2. `docs/presentation/projects/<project-name>/slide-content.md` を作る
3. 内容を書く
4. Claude または Manus に、正本ファイルを指定して実行する
5. 必要なら最小限の修正を行う

## 参照ファイル
- `docs/prompts/presentation/claude-slide-template.md`
- `docs/prompts/presentation/manus-instruction-final.md`
- `docs/presentation/template/slide-content-template.md`
- `docs/presentation/projects/kikagaku-final/slide-content.md`

## 学び
AIは「何を書くか」よりも「どう制御するか」が重要。
プレゼン資料では、情報量ではなく情報密度と視認性が成果を左右する。
