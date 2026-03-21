# SYSTEM_ARCHITECTURE

## 1. 全体構成

システム構成:

Web UI（GAS HTMLアプリ / Index.html）  
→ Google Apps Script（Backend / API / Business Logic）  
→ Google Spreadsheet / Google Drive

カスタムGPT連携時の構成:

GPT Actions  
→ Cloudflare Worker  
→ Google Apps Script  
→ Google Spreadsheet / Google Drive

補足:
- Web画面からの通常操作は、主に `google.script.run` と `doGet` ベースのAPIを通じてGASと通信する
- カスタムGPTからのAction呼び出しは、Cloudflare Workerを経由してGASの `doPost` に到達する
- 画像ファイルはGoogle Drive、業務データはGoogle Spreadsheetに保存する

---

## 2. 各レイヤの責務

### Web UI（Index.html）
- ユーザー向け画面
- 写真登録
- EXIF読み取り
- 地図表示
- 右パネル編集
- 報告書一覧・詳細表示
- 報告書作成 / PDF生成 / 確定操作
- `google.script.run` による保存系呼び出し
- `doGet` API による一覧 / 詳細取得

### GPT Actions
- ユーザーとの対話
- 写真と `photo_id` の対応確認
- 所見 / タグ / 対応要否の提案
- 既存pin照合結果の説明
- 保存前確認
- Action 呼び出し

### Cloudflare Worker
- API Gateway
- GPT Actions からのリクエストを GAS に転送
- CORS / 入口安定化
- Apps Script 直結時の相性問題を回避

### Google Apps Script
- ビジネスロジックの中核
- action routing（`doPost` / `doGet`）
- CRUD
- optimistic lock
- pin 集計
- grouping resolution
- 写真アップロード処理
- Google Drive 保存
- 報告書作成
- Googleドキュメント生成
- PDF変換
- OpenAI API 呼び出し
- 監査ログ記録

### Google Spreadsheet
- システムDB
- `photos / pins / reports / report_items / uploads / audit_log / tags / photo_tags` を保持

### Google Drive
- 写真ファイル保存
- PDF保存
- Web画面アップロード時の画像格納先

---

## 3. 現在の基本フロー

### 3-1. Web画面からの写真登録フロー

写真登録タブ  
↓  
ブラウザでEXIF読み取り  
↓  
`apiCreatePhotoBatchFromUi` 呼び出し  
↓  
GASでGoogle Driveに保存  
↓  
`photos` シートに `photo_id` を発番して記録

補足:
- `photo_id` はファイル名ベースの human-readable ID を採用
- `file_url` / `thumb_url` はGoogle Driveのthumbnail URLを保存
- EXIFの撮影日時・GPS座標を `photos` に格納する

### 3-2. 既存 pin 照合フロー

Web画面で登録済み写真のJSONをコピー  
↓  
ユーザーが写真ファイルとJSONをChatGPTへ渡す  
↓  
`resolveGroupingAgainstExistingPins`  
↓  
ユーザー確認  
↓  
`saveApprovedPhotoMetadata`

### 3-3. 新規 pin 作成フロー

Web画面で登録済み写真のJSONをコピー  
↓  
ユーザーが写真ファイルとJSONをChatGPTへ渡す  
↓  
`resolveGroupingAgainstExistingPins`  
↓  
`create_new_pin` 判定  
↓  
ユーザー確認  
↓  
`createNewPinAndSaveApprovedMetadata`  
↓  
`syncPinDerivedFields`

補足:
- このフローは未完成ではなく、現在は実装済み
- `createNewPinAndSaveApprovedMetadata` 内で事前validation・pin作成・photo保存・pin集計同期まで実行する

### 3-4. 地図表示フロー

`getMapPins` / `getMapPinsWithFilters`  
↓  
pin集計結果を返却  
↓  
Leafletで地図表示

補足:
- pin は橋脚単位
- ピン色は `max_response_status` により決定
- `has_draft` が true の場合は未報告バッジを表示
- `pin_lat / pin_lng` が空のpinは地図に表示しない

### 3-5. 右パネル表示・編集フロー

ピン選択  
↓  
`getRightPanelData`  
↓  
配下写真一覧を表示  
↓  
必要に応じて `apiUpdatePhotoFromUi` / `apiDeletePhotoFromUi`

補足:
- 写真の並び順は `response_status → taken_at → photo_id`
- `published` 写真は編集不可 / 削除不可
- 更新時は `updated_at` による楽観ロックを行う

### 3-6. 報告書作成フロー

報告書タブ  
↓  
pin選択  
↓  
`apiSuggestReportHeaderFromUi` で実施日 / 実施場所 / 内容を提案  
↓  
`createReport`  
↓  
`report_items` 作成  
↓  
`generateReportPdf`  
↓  
`confirmReport`

補足:
- 報告書は `draft / confirmed` を持つ
- confirmed 時に対象写真を `published` に更新する
- PDFはGoogleドキュメント経由で生成し、Google Driveに保存する

---

## 4. 通信方式

### 4-1. Web UI → GAS

#### 保存系
- `google.script.run`
- 例:
  - `apiCreatePhotoBatchFromUi`
  - `apiUpdatePhotoFromUi`
  - `apiDeletePhotoFromUi`
  - `apiCreateReportFromUi`
  - `apiGenerateReportPdfFromUi`
  - `apiConfirmReportFromUi`
  - `apiSuggestReportHeaderFromUi`

#### 取得系
- `doGet?action=...`
- `fetch` ベース
- 例:
  - `getMapPins`
  - `getRightPanelData`
  - `getReportList`
  - `getReportDetail`

### 4-2. Worker → GAS

Worker → GAS は `body.action` 方式。

例:

```json
{
  "action": "saveApprovedPhotoMetadata",
  "payload": {
    "updated_by": "gpt_action_user",
    "items": [
      {
        "photo_id": "photo_xxx",
        "updated_at": "2026/03/09 1:03:22",
        "comment_final": "コメント",
        "tag_final": "タグ",
        "response_status": "5",
        "pin_id": "pin_xxx"
      }
    ]
  }
}
```

### 4-3. doPost で受ける主な Action

- `saveApprovedPhotoMetadata`
- `resolveGroupingAgainstExistingPins`
- `draftWorkContent`
- `createNewPinAndSaveApprovedMetadata`
- `createPhotoBatch`
- `createReport`
- `generateReportPdf`
- `confirmReport`

### 4-4. doGet で受ける主な Action

- `healthCheck`
- `getMapPins`
- `getRightPanelData`
- `getReportList`
- `getReportDetail`

---

## 5. データモデルの考え方

### photo
- 画像1枚単位の最小管理単位
- `photo_id` ベースで全処理を追跡
- AI提案 / 手動編集 / 報告書明細の参照元になる

### pin
- 橋脚単位の集約単位
- 地図表示単位
- 複数photoを束ねる
- `bridge_number` / `photo_count` / `has_draft` / `last_taken_at` などは集計で保守する

### report
- 報告書ヘッダ
- 複数pinを跨げる
- PDF生成・確定の単位

### report_items
- 報告書明細
- 1明細 = 1写真
- `order_no` によりPDF上の並び順を制御する

---

## 6. 設計上の原則

- Worker に業務ロジックを書かない
- GAS で action routing する
- Spreadsheet を DB として扱う
- updated_at による optimistic lock を維持する
- pin は橋脚単位の集約として扱う
- photo_id と画像の対応ずれ防止を最優先とする
- Report ID などの内部概念を UI では極力見せない
- 物理削除ではなく論理削除を採用する

---

## 7. 実装済みの重要機能

- 写真登録
- EXIF読み取り
- Google Drive保存
- `photo_id` 発番
- 既存pin照合
- 新規pin作成
- 写真メタデータ保存
- pin集計同期
- 地図表示
- 右パネル表示 / 編集 / 論理削除
- 報告書作成
- PDF生成
- 報告書確定
- OpenAI API による報告書ヘッダ提案
- audit_log 記録

---

## 8. 今後の改善対象

- `Code.gs` の責務分割
- report更新系への楽観ロック統一
- フィルタUIの拡張
- tags / photo_tags の本格活用
- アップロードフロー1本化
- PDFレイアウト改善
- 後変更（photo.pin_id の移動）機能
- batch save の部分更新防止強化