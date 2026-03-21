# DEVELOPMENT_PATTERNS

このプロジェクトで確立した実装パターン集。
新機能を追加するときはこれを参照して同じパターンに揃える。

---

## 1. 新しい POST Action の追加パターン

### Step 1: GAS に action 関数を追加

```javascript
function actionXxx(payload) {
  const param = payload.param || '';
  if (!param) throw new Error('param は必須です');

  // 処理

  writeAuditLog({
    entity_type: 'xxx',
    entity_id:   resultId,
    action:      'create',
    before_json: '',
    after_json:  JSON.stringify(result),
    actor:       payload.updated_by || 'system'
  });

  return result;
}
```

### Step 2: doPost の switch に case を追加

```javascript
case 'xxx':
  return successResponse(actionXxx(body.payload || {}));
```

### Step 3: schema.yaml にエンドポイントを追加

```yaml
/xxx:
  post:
    operationId: xxx
    summary: ...
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              action:
                type: string
                enum:
                  - xxx
              payload:
                type: object
                ...
            required:
              - action
              - payload
    responses:
      "200":
        description: Success
        content:
          application/json:
            schema:
              type: object
              properties:
                ok:
                  type: boolean
                data:
                  type: object
                  additionalProperties: true
              required:
                - ok
```

### Step 4: Web UI から呼ぶ場合は google.script.run 用ラッパーを追加

```javascript
function apiXxxFromUi(payload) {
  return actionXxx(payload || {});
}
```

---

## 2. 新しい GET Action の追加パターン

Web画面からデータ取得する場合は `doGet` に追加して `gasGet` で呼ぶ。
（google.script.run は大きなデータで欠落するため）

### GAS の doGet に case を追加

```javascript
case 'getXxx': {
  const param = e.parameter.param || '';
  return successResponse(getXxx(param));
}
```

### Index.html から呼ぶ

```javascript
const data = await gasGet('getXxx', { param: 'value' });
```

---

## 3. 楽観ロックのパターン

写真・報告書の更新は必ず楽観ロックを使う。

```javascript
function updateXxx(id, input) {
  // ...
  const currentNormalized = normalizeUpdatedAt(current.updated_at);
  const inputNormalized   = normalizeUpdatedAt(input.updated_at || '');

  if (currentNormalized !== inputNormalized) {
    throw new Error(
      'LOCK_MISMATCH'
      + ' id=' + id
      + ' current=' + currentNormalized
      + ' input=' + inputNormalized
    );
  }
  // 更新処理
  updated.updated_at = now();
  // ...
}
```

クライアント側は updated_at を保持して渡す：

```javascript
await gasCall('apiUpdateXxxFromUi', {
  id:         item.id,
  updated_at: String(item.updated_at),  // ← 必須
  // 更新項目
});
```

---

## 4. Google Drive に写真を保存するパターン

```javascript
const FOLDER_ID = '1bxM9nM_T4v_6EJlhCAkysvkH8uHu7Bbe';

function saveImageToDrive(base64String, mimeType, filename) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const blob   = Utilities.newBlob(
    Utilities.base64Decode(base64String),
    mimeType,
    filename
  );
  const driveFile = folder.createFile(blob);
  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId  = driveFile.getId();
  const fileUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';

  return { fileId, fileUrl };
}
```

注意：
- URL は `/thumbnail?id=...&sz=w800` 形式を使う（GAS iframe sandbox から表示できる）
- `/uc?export=view` は GAS iframe でブロックされる

---

## 5. GAS から PDF を生成するパターン

```javascript
function generatePdf(docTitle, buildDocFn) {
  // Googleドキュメントを作成
  const doc  = DocumentApp.create(docTitle);
  const body = doc.getBody();

  // コンテンツを書き込む
  buildDocFn(doc, body);
  doc.saveAndClose();

  // PDF に変換
  const docFile = DriveApp.getFileById(doc.getId());
  const pdfBlob = docFile.getAs('application/pdf');
  pdfBlob.setName(docTitle + '.pdf');

  // Drive に保存
  const folder  = DriveApp.getFolderById(FOLDER_ID);
  const pdfFile = folder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // 元の Googleドキュメントは削除
  docFile.setTrashed(true);

  return {
    fileId:  pdfFile.getId(),
    fileUrl: 'https://drive.google.com/file/d/' + pdfFile.getId() + '/view'
  };
}
```

GAS DocumentApp の注意点：
- `getParagraphs()` は TableCell には存在しない → `editAsText()` を使う
- `appendInlineImage()` は TableCell には存在しない → `appendImage()` を使う
- → 詳細は GAS_API_PITFALLS.md 参照

---

## 6. OpenAI API を呼ぶパターン

```javascript
function callOpenAI(prompt) {
  const key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key) return null;  // キー未設定時はフォールバック

  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + key },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      }),
      muteHttpExceptions: true
    });

    const json = JSON.parse(response.getContentText());
    const text = json.choices?.[0]?.message?.content?.trim() || '';

    // JSON 部分だけ抽出してパース
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  } catch (e) {
    console.warn('OpenAI API 失敗: ' + e.message);
    return null;  // フォールバックに任せる
  }
}
```

---

## 7. syncPinDerivedFields のパターン

写真を更新・削除するたびに必ず呼ぶ。
pin の集計値（photo_count / has_draft / last_taken_at / bridge_number / GPS）を最新化する。

```javascript
// 写真を保存した後
function actionSaveApprovedPhotoMetadata(payload) {
  // 各写真を更新
  const results = items.map(item => updatePhotoWithPin(item.photo_id, item));

  // ← ここで必ず呼ぶ
  syncPinDerivedFields(updatedBy);

  return results;
}
```

---

## 8. Spreadsheet の全行をオブジェクト配列で操作するパターン

```javascript
// 全件取得
function getAllRows(sheetName) {
  const sheet  = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// 1件更新（ヘッダ名でインデックスを引く）
function updateRowById(sheetName, idColumn, idValue, updates) {
  const sheet   = getSheet(sheetName);
  const headers = getHeaders(sheetName);
  const values  = sheet.getDataRange().getValues();
  const hIdx    = {};
  headers.forEach((h, i) => hIdx[h] = i);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][hIdx[idColumn]]) === String(idValue)) {
      Object.entries(updates).forEach(([key, val]) => {
        if (hIdx[key] !== undefined) {
          sheet.getRange(i + 1, hIdx[key] + 1).setValue(val);
        }
      });
      return true;
    }
  }
  return false;
}
```

---

## 9. テスト関数の書き方

GASエディタから直接実行できるテスト関数を必ず作る。
PowerShell でのエンドツーエンドテストの前に GAS 単体でテストする。

```javascript
function testXxx() {
  // 1. 事前条件を整える（テスト用データを作成）
  const photo = createPhoto({ ... });
  Logger.log('作成: ' + JSON.stringify(photo));

  // 2. テスト対象を実行
  const result = actionXxx({ photo_id: photo.photo_id, ... });
  Logger.log('結果: ' + JSON.stringify(result));

  // 3. 事後確認（Spreadsheet を直接確認）
  const after = getPhotoById(photo.photo_id);
  Logger.log('確認: ' + JSON.stringify(after));
}
```

---

## 10. テストJSON作成の具体的手順

### 手順（毎回この順番で行う）

1. Spreadsheet を開く（ID: 1QC3eM1qrJ-qCG0gMWwc6K10Bv9BnWDc0QhyY81v3jbU）
2. 対象シート（photos / pins / reports）を開く
3. テスト対象の行を見つけて以下の値をコピー：
   - `photo_id` / `pin_id` / `report_id`
   - `updated_at`（これが最重要。推測厳禁）
   - `status` / `deleted_at`（制約チェック用）
4. コピーした値をそのままテスト JSON に貼る

### 正しい例

```json
{
  "photo_id":    "photo_PXL_20260123_015730666_ab3f",
  "updated_at":  "2026/03/14 9:12:22",
  "comment_final": "橋脚基部付近に錆汁跡が確認される",
  "tag_final":   "橋脚 / 周辺状況 / 錆",
  "response_status": "3",
  "pin_id":      "pin_8985eaf4-0729-4188-95cf-532b3d224af7",
  "updated_by":  "test"
}
```

### やってはいけないこと

```json
// ❌ updated_at を推測で書く
"updated_at": "2026-03-14T00:00:00Z"

// ❌ 以前の会話ログの値を流用する
"updated_at": "2026/03/09 1:03:22"  // 古い値

// ❌ photo_id を推測で書く
"photo_id": "photo_abc123"
```

---

## 11. PowerShell での Worker → GAS 疎通確認

新しい action を追加したあとの確認に使う。

### POST リクエスト（保存・更新系）

```powershell
$body = @{
    action  = "saveApprovedPhotoMetadata"
    payload = @{
        updated_by = "test"
        items      = @(
            @{
                photo_id       = "photo_PXL_xxx_ab3f"
                updated_at     = "2026/03/14 9:12:22"
                comment_final  = "テスト所見"
                tag_final      = "テスト"
                response_status = "5"
                pin_id         = "pin_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            }
        )
    }
} | ConvertTo-Json -Depth 10

$res = Invoke-RestMethod `
    -Method Post `
    -Uri "https://icy-art-b1b8.koji-ishimaru.workers.dev" `
    -ContentType "application/json; charset=utf-8" `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body))

$res | ConvertTo-Json -Depth 10
```

### GET リクエスト（取得系）

```powershell
$GAS_URL = "https://script.google.com/macros/s/AKfycbzMKJI4Eiu0TZrdsIYrTlsxXC2G2BXr04HgKBnjqHToK1me4ZV5-6X99d7PGYflwnx_/exec"

$res = Invoke-RestMethod `
    -Method Get `
    -Uri "${GAS_URL}?action=getMapPins&has_draft_only=false&keyword="

$res | ConvertTo-Json -Depth 10
```

### エラー時の確認手順

1. PowerShell のレスポンスを確認（`ok: false` なら `error` フィールドを見る）
2. GAS エディタの「実行数」タブでエラーログを確認
3. Worker の gasUrl が正しいか確認
4. GAS が最新バージョンでデプロイされているか確認

---

## 12. マップにピンが出ない場合の診断手順

実際に発生したケース：写真は登録されているのにマップに表示されない。

### 診断フロー

```
マップにピンが出ない
    ↓
GASエディタで以下を実行：
function diagnosePins() {
  const pins = getAllRows(SHEETS.PINS);
  pins.forEach(p => {
    Logger.log(
      p.pin_id + ' | lat:' + p.pin_lat + ' | lng:' + p.pin_lng +
      ' | deleted:' + p.deleted_at + ' | count:' + p.photo_count
    );
  });
}
    ↓
pin_lat / pin_lng が空 → GPS補完が走っていない
    → syncPinDerivedFields('fix') を実行
    ↓
deleted_at に値が入っている → 論理削除済み
    → 配下写真を確認（deleted_at が入っていたら写真も削除済み）
    ↓
photo_count = 0 → 写真がない or 全件論理削除済み
    → photosシートで pin_id 絞り込みして確認
```

### 緊急修復コマンド

```javascript
// pin_lat / pin_lng が空のpinを一括修復
function fixEmptyPinCoords() {
  const pins = getAllRows(SHEETS.PINS).filter(p =>
    !p.deleted_at && (!p.pin_lat || !p.pin_lng)
  );
  pins.forEach(p => syncPinDerivedFields(p.pin_id));
  Logger.log('修復完了: ' + pins.length + '件');
}
```
