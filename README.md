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
| [docs/presentation/kikagaku-final/README.md](docs/presentation/kikagaku-final/README.md) | キカガク最終発表用資料 |
| [docs/presentation/kikagaku-final/slide-outline.md](docs/presentation/kikagaku-final/slide-outline.md) | 発表スライド構成案 |
| [docs/presentation/kikagaku-final/talk-track.md](docs/presentation/kikagaku-final/talk-track.md) | 発表トーク原稿 |
| [docs/presentation/kikagaku-final/manus-prompt.md](docs/presentation/kikagaku-final/manus-prompt.md) | Manus向けスライド生成プロンプト |
| [docs/presentation/kikagaku-final/manus-prompt-compact.md](docs/presentation/kikagaku-final/manus-prompt-compact.md) | Manus再投入用の超圧縮プロンプト |
| [docs/presentation/kikagaku-final/github-ai-slide-prompt.md](docs/presentation/kikagaku-final/github-ai-slide-prompt.md) | GitHub AI Slide用プロンプト |
| [docs/presentation/kikagaku-final/manus-instruction-final.md](docs/presentation/kikagaku-final/manus-instruction-final.md) | Manus実行時の最終指示 |

## 重要：APIキーについて

APIキー・デプロイURLなどの機密情報はこのリポジトリに含まれていません。
Google SpreadsheetのSettings（⚙️設定シート）およびGASのスクリプトプロパティで管理しています。
詳細は [GUIDE_LAYER2_OPERATIONS.md](docs/GUIDE_LAYER2_OPERATIONS.md) を参照してください。

## 開発メモ・残課題

既知の実装上の残課題や今後の改善項目は [DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md) の「現在の残課題」を参照してください。

## 作成者

石丸 浩司（2026年3月）
