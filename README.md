# 高架下点検マップ＆報告書システム

首都高速道路の高架下点検業務における「写真・所見・位置情報・報告書」を一元管理するシステムです。

## システム構成

| レイヤ | 技術 | 役割 |
|---|---|---|
| Web画面 | Google Apps Script（HTMLアプリ） | 写真登録・マップ表示・報告書作成UI |
| カスタムGPT | ChatGPT（GPT-4o） | 所見・タグ・対応要否の提案、保存補助 |
| API Gateway | Cloudflare Worker | GPT ActionsのリクエストをGASに転送 |
| バックエンド | Google Apps Script | CRUD・PDF生成・OpenAI API呼び出し |
| DB | Google Spreadsheet | photos / pins / reports 等のシート構成 |
| ストレージ | Google Drive | 写真ファイルおよびPDF報告書の保存 |

## フォルダ構成

docs/ 引き継ぎ資料・仕様書・開発ルール 
gas/ Google Apps Script コード（Code.gs） 
html/ Web画面のHTML（Index.html） 
gpt/ カスタムGPTのinstructions・schemaファイル 
cloudflare/ Cloudflare WorkerのJSコード


## ドキュメント一覧

| ファイル | 内容 |
|---|---|
| [GUIDE_LAYER1_MANAGEMENT.md](docs/GUIDE_LAYER1_MANAGEMENT.md) | 経営者・管理者向け説明書 |
| [GUIDE_LAYER2_OPERATIONS.md](docs/GUIDE_LAYER2_OPERATIONS.md) | 運用担当者向けマニュアル |
| [SPECIFICATION.md](docs/SPECIFICATION.md) | システム仕様書 v3 |
| [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | システムアーキテクチャ |
| [DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md) | 開発ルール |
| [DEVELOPMENT_PATTERNS.md](docs/DEVELOPMENT_PATTERNS.md) | 開発パターン集 |
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | デプロイ手順 |
| [KNOWN_BUGS_AND_PITFALLS.md](docs/KNOWN_BUGS_AND_PITFALLS.md) | 既知バグ・罠メモ |
| [GAS_API_PITFALLS.md](docs/GAS_API_PITFALLS.md) | GAS API 罠メモ |
| [USER_PROFILE.md](docs/USER_PROFILE.md) | ユーザープロファイル |


## AIへの引き継ぎ

新しいAIセッションを開始するときは、以下を読ませてください。

### 共通原則（personal-os）
- https://raw.githubusercontent.com/koji140/personal-os/main/operating-system.md
- https://raw.githubusercontent.com/koji140/personal-os/main/decision-principles.md

### このプロジェクト固有
- 開発ルール・残課題：https://raw.githubusercontent.com/koji140/bridge-inspection-v2/main/docs/DEVELOPMENT_RULES.md
- 既知バグ・罠メモ：https://raw.githubusercontent.com/koji140/bridge-inspection-v2/main/docs/KNOWN_BUGS_AND_PITFALLS.md
- システム仕様書：https://raw.githubusercontent.com/koji140/bridge-inspection-v2/main/docs/SPECIFICATION.md

---

## 重要：APIキーについて

APIキー・デプロイURLなどの機密情報はこのリポジトリに含まれていません。
Google SpreadsheetのSettings（⚙️設定シート）およびGASのスクリプトプロパティで管理しています。
詳細は [GUIDE_LAYER2_OPERATIONS.md](docs/GUIDE_LAYER2_OPERATIONS.md) を参照してください。

## 開発メモ・残課題

既知の実装上の残課題や今後の改善項目は [DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md) の「現在の残課題」を参照してください。

## 作成者

石丸 浩司（2026年3月）

## AI Presentation System

このリポジトリには、AIを用いたプレゼン生成の仕組みが含まれる。

### 今回のキカガク最終発表
主に参照するファイル:
- [docs/presentation/kikagaku-final/README.md](docs/presentation/kikagaku-final/README.md)
- [docs/presentation/kikagaku-final/manus-prompt-compact.md](docs/presentation/kikagaku-final/manus-prompt-compact.md)（内容正本）
- [docs/presentation/kikagaku-final/slide-outline.md](docs/presentation/kikagaku-final/slide-outline.md)（構成案）
- [docs/presentation/kikagaku-final/talk-track.md](docs/presentation/kikagaku-final/talk-track.md)（原稿）

### 再利用可能な AI Presentation System
スキル・プロンプト・テンプレートは以下を参照:
- [docs/skills/ai-presentation-generation.md](docs/skills/ai-presentation-generation.md)
- [docs/prompts/presentation/claude-slide-template.md](docs/prompts/presentation/claude-slide-template.md)（Claude用）
- [docs/prompts/presentation/manus-instruction-final.md](docs/prompts/presentation/manus-instruction-final.md)（Manus用）
- [docs/presentation/template/slide-content-template.md](docs/presentation/template/slide-content-template.md)
- [docs/presentation/projects/kikagaku-final/slide-content.md](docs/presentation/projects/kikagaku-final/slide-content.md)（入力例）

### プロンプトの使い分け
- Claude: 要約・スライド生成
- Manus: レイアウト生成・最終出力

## AI Presentation System（設計思想）

### 基本思想
このリポジトリでは、プレゼン生成を以下の2つに分離している。

- Content（内容）
- Instruction（指示）

---

### Content（内容）
- 正本は1つに統一する
- 本リポジトリでは以下を正本とする

- `docs/presentation/projects/<project-name>/slide-content.md`

（キカガク最終発表では `manus-prompt-compact.md` が正本）

---

### Instruction（指示）
- 使用するAIごとにプロンプトを分ける
- 内容は変えず、指示だけ変える

#### Claude
- 役割: 内容の圧縮・構造化・スライド生成
- 特徴: 要約に強い
- 使用ファイル:
  - `docs/prompts/presentation/claude-slide-template.md`

#### Manus
- 役割: レイアウト適用・最終出力
- 特徴: PPT化・見た目整形
- 使用ファイル:
  - `docs/prompts/presentation/manus-instruction-final.md`

---

### 重要な原則
- 内容（Content）はツールに依存しない
- 指示（Instruction）のみツールごとに変える
- MDは1つ、プロンプトは複数

---

### 再利用手順
1. `slide-content-template.md` をコピー
2. `slide-content.md` を作成
3. 内容を記入
4. ClaudeまたはManusにプロンプトを渡す

---

### 一言でいうと
- Content = プロダクト
- Instruction = ドライバ