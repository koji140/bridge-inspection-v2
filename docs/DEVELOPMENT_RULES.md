# DEVELOPMENT_RULES

Claude がこのプロジェクトを継続開発する際のルール。
（v1 の DEVELOPMENT_RULES を現在の実装状態に更新したもの）

---

## 1. 役割境界（変えてはいけない）

### Worker にやってよいこと
- リクエストの GAS への転送
- CORS 処理
- 入口安定化・軽いログ

### Worker にやってはいけないこと
- pin 判定ロジック
- 楽観ロック判定
- Spreadsheet 更新
- ビジネスルール実装

### GAS に置くもの（すべてここ）
- action routing（doPost / doGet の switch）
- CRUD（createPhoto / updatePhoto / createPin / createReport 等）
- syncPinDerivedFields（pin集計・GPS補完・bridge_number自動更新）
- resolveGroupingAgainstExistingPins
- 楽観ロック（normalizeUpdatedAt / LOCK_MISMATCH）
- PDF 生成（DocumentApp → DriveApp）
- OpenAI API 呼び出し（apiSuggestReportHeaderFromUi）
- 監査ログ（writeAuditLog）

---

## 2. 既存成功フローを壊さない

以下は壊してはいけない。変更するときは必ず既存テストを通してから進める。

- saveApprovedPhotoMetadata（batch 保存）
- resolveGroupingAgainstExistingPins（pin 照合）
- createNewPinAndSaveApprovedMetadata（新規 pin + 保存）
- Worker → GAS → Spreadsheet 経路
- updated_at 楽観ロック
- gasGet / gasCall の使い分け（取得系は gasGet、保存系は gasCall）

---

## 3. テスト JSON の作り方（必読）

必ず Spreadsheet の最新データを実際に開いて確認してから作る。

確認対象:
- photo_id（ファイル名ベースIDまたはUUID）
- pin_id
- updated_at（これが最重要。推測厳禁）
- status（draft/publishedかの確認）
- deleted_at（論理削除済みかの確認）

守ること:
- `updated_at` を推測しない
- 以前の会話ログの値を流用しない
- Spreadsheet の現在値を正とする

→ 詳細は DEVELOPMENT_PATTERNS.md の「テストJSON作成の具体的手順」を参照

---

## 4. 現在の実装優先順位（更新済み）

### 実装済み（P0完了）
- ✅ photos / pins / reports / report_items の CRUD
- ✅ 楽観ロック
- ✅ 写真論理削除・pin 自動論理削除
- ✅ グルーピング照合（resolveGroupingAgainstExistingPins）
- ✅ createNewPinAndSaveApprovedMetadata（新規 pin フロー）
- ✅ PDF 生成・報告書確定
- ✅ syncPinDerivedFields（GPS補完・bridge_number自動更新）
- ✅ OpenAI API 連携（実施場所・内容の自動提案）
- ✅ photo_id ファイル名ベース発番

### P1（未実装・優先度高）
- photo.pin_id の後変更（誤ったpinへの写真移動）
- batch save の部分更新防止（事前validation強化）
- 左フィルタの拡充（タグ・ステータス絞り込み）

### P2（未実装・中優先度）
- tags / photo_tags の活用
- アップロードフロー 1 本化（Claude/Gemini API 検討）
- PDF レイアウト高度化（所見が長い場合のセル高制御）

---

## 5. 実装方針

- 大規模リファクタリングをしない。部分的に安全に拡張する
- 既存 action の互換性を維持する
- 新機能は既存 action に無理に詰め込まず、新 action として追加する
- Worker にロジックを書かない（転送だけ）

---

## 6. データ取得の使い分け（重要）

| 用途 | 方法 | 理由 |
|---|---|---|
| 一覧・詳細取得 | `gasGet`（fetch ベース） | google.script.run は大データで欠落する |
| 保存・更新 | `gasCall`（google.script.run） | 返り値が小さいので問題なし |

gasGet を使うには doGet に対応する case が必要。
新しい取得系 action を追加したら doGet の switch にも追加する。

---

## 7. 変更後に必ず確認すること

- [ ] GAS を新バージョンで再デプロイしたか
- [ ] Worker の gasUrl は正しいか（通常の再デプロイでは URL は変わらない）
- [ ] Ctrl+Shift+R でハードリロードしたか
- [ ] PowerShell または GASエディタのテスト関数で疎通確認したか
- [ ] Spreadsheet の updated_at を基準にテストしたか

→ 詳細は DEPLOYMENT_GUIDE.md を参照

---

## 8. デバッグの優先順

1. Spreadsheet で実データ確認（photo_id / pin_id / updated_at / deleted_at）
2. GASエディタで testStep〇〇 関数を直接実行してログを確認
3. PowerShell → Worker → GAS の生レスポンスを確認
4. GASエディタの「実行数」タブでエラーログを確認
5. ブラウザの開発者ツール Console を確認（F12）
6. Builder Action テスト（ChatGPT側）

---

## 9. 出力スタイルのルール（石丸さんとのやりとりから）

- **常に完成版のファイル全体を出す**。差分・部分修正の提示は不可
- 選択肢を出すときはメリット・デメリットを最初から付ける
- 仕様書・ドキュメントは詳しく書く（背景・理由・補足・注意まで）
- 操作ステップが増える提案は先にステップ数を明示する
- AI 処理が可能な場合は先にその選択肢を出す

→ 詳細は USER_PROFILE.md を参照

---

## 10. 現在の残課題（2026-03時点）

以下は認識済みだが、まだ未対応の課題。

### 10-1. 対応要否ステータス文言の統一
- 仕様書上の response_status の定義と、HTML 上の表示ラベルにずれがある
- ユーザーの解釈を誤らせる可能性があるため、仕様・UI・GPT instructions の3点を統一する必要がある

### 10-2. report 更新系への楽観ロック統一
- photo 更新には `updated_at` ベースの楽観ロックが入っている
- 一方で report 更新系は同等の保護が不十分
- report 系も photo 系と同じロック方針に統一する必要がある

### 10-3. 環境依存値の設定化
- Spreadsheet ID や Drive Folder ID などがコード内に直書きされている
- 本番 / 検証 / 引き継ぎで切り替えしやすいよう、Settings シートまたは Script Properties に寄せる必要がある

### 10-4. 重複定義の整理
- `Code.gs` 内に同名関数の重複定義が残ると、後勝ちで意図しない挙動になる
- 特に API ラッパー関数や doGet / doPost 周辺は一意に保つ必要がある

### 10-5. Code.gs の責務分割
- 現在はユーティリティ、CRUD、pin集計、GPT Actions、報告書、PDF生成などが1ファイルに集中している
- 影響範囲を減らすため、段階的にファイル分割する必要がある