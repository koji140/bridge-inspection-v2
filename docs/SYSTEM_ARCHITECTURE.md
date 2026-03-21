# SYSTEM_ARCHITECTURE

## 1. 全体構成

システム構成:

GPT Actions  
→ Cloudflare Worker  
→ Google Apps Script  
→ Google Spreadsheet

## 2. 各レイヤの責務

### GPT Actions
- ユーザーとの対話
- Action 呼び出し
- 照合結果の説明
- 保存前確認

### Cloudflare Worker
- API Gateway
- GPT Actions からのリクエストを GAS に転送
- CORS / 入口安定化
- Apps Script 直結時の相性問題を回避

### Google Apps Script
- ビジネスロジック
- CRUD
- optimistic lock
- pin 集計
- grouping resolution
- report draft generation

### Google Spreadsheet
- システム DB
- photos / pins / reports 等を保持

## 3. 現在の基本フロー

### 既存 pin 照合フロー

resolveGroupingAgainstExistingPins  
↓  
ユーザー確認  
↓  
saveApprovedPhotoMetadata

### 未完成フロー

resolveGroupingAgainstExistingPins  
↓  
create_new_pin  
↓  
createPin  
↓  
saveApprovedPhotoMetadata  
↓  
syncPinDerivedFields

## 4. 通信方式

Worker → GAS は body.action 方式。

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

## 5. 設計上の原則

- Worker に業務ロジックを書かない
- GAS で action routing する
- Spreadsheet を DB として扱う
- updated_at による optimistic lock を維持する
