# GAS_API_PITFALLS

Google Apps Script のAPI は Node.js やブラウザ JS と大きく異なる。
推測で書いたコードが動かないことが多い。
このファイルは実際に「動きません」となったケースの記録。

---

## 基本原則

GAS の API（DocumentApp / SpreadsheetApp / DriveApp 等）は、
JavaScript 標準の DOM や Node.js とは別物。
メソッド名が似ていても挙動が違うことがある。
**動作確認済みのコードを使う。推測で実装しない。**

---

## DocumentApp（Googleドキュメント操作）

### TableCell には getParagraphs() がない

```javascript
// ❌ 動かない
const cell = table.getRow(0).getCell(0);
const para = cell.getParagraphs()[0];

// ✅ 正しい
const cell = table.getRow(0).getCell(0);
const text = cell.editAsText();
text.setFontSize(0, text.getText().length - 1, 12);
```

### TableCell には appendInlineImage() がない

```javascript
// ❌ 動かない
const para = cell.getParagraphs()[0];
const img  = para.appendInlineImage(blob);

// ✅ 正しい（TableCell に直接 appendImage）
const img = cell.appendImage(blob);
```

### table.setColumnWidth() は存在しない

GAS の Table には列幅を直接設定するメソッドがない。
列幅は TableCell の setWidth() で設定する。

```javascript
// ❌ 動かない
table.setColumnWidth(0, 200);

// ✅ 正しい
table.getRow(0).getCell(0).setWidth(200);
```

### PageNumber はコンストラクタではない

```javascript
// ❌ 動かない（docx ライブラリの PageNumber と混同しやすい）
footer.appendParagraph('').appendPageNumber();  // これも不可

// ✅ 正しい（Paragraph に appendPageNumber()）
const fp = footer.getParagraphs()[0];
fp.appendText('- ');
fp.appendPageNumber();
fp.appendText(' -');
```

### body.setMargin 系メソッドの引数は pt 単位

```javascript
// A4、余白 18mm = 約 51pt（1pt ≒ 0.353mm）
body.setMarginTop(51).setMarginBottom(51).setMarginLeft(51).setMarginRight(51);
```

### editAsText() でのスタイル指定は文字インデックスで行う

```javascript
const text = cell.editAsText();
// 0文字目から9文字目までを bold・12pt にする
text.setBold(0, 8, true);
text.setFontSize(0, 8, 12);
// テキスト全体にスタイルを当てる場合
text.setFontSize(0, text.getText().length - 1, 12);
```

### テーブルにセル幅を設定するとき左右の合計を合わせる

```javascript
// ページ幅 481pt の場合
const LEFT_W  = 170;  // 35%
const RIGHT_W = 311;  // 65%
table.getRow(0).getCell(0).setWidth(LEFT_W);
table.getRow(0).getCell(1).setWidth(RIGHT_W);
// ※ setWidth は DocumentApp では効き方が不安定なケースがある
// 代替：テーブル作成時に columnWidths を指定しない（GASのTableは自動調整）
```

---

## SpreadsheetApp（スプレッドシート操作）

### getDataRange() は空シートでもエラーにならないが values.length < 2 チェックが必要

```javascript
const values = sheet.getDataRange().getValues();
if (values.length < 2) return []; // ヘッダのみの場合は空配列を返す
```

### setValue / getValues は 1-indexed（行・列は1から始まる）

```javascript
// A1セルを更新
sheet.getRange(1, 1).setValue('値');

// 2行目、3列目を更新
sheet.getRange(2, 3).setValue('値');
```

### appendRow は配列を渡す

```javascript
sheet.appendRow(['値1', '値2', '値3']);
```

### Date 型と文字列型が混在する

Spreadsheet に Date を書き込むと、読み出し時に Date 型になることも文字列になることもある。
`normalizeUpdatedAt()` で必ず正規化してから比較する。

```javascript
function normalizeUpdatedAt(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy/MM/dd H:mm:ss');
  }
  const d = new Date(String(value).trim());
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy/MM/dd H:mm:ss');
  }
  return String(value).trim();
}
```

---

## DriveApp（Drive操作）

### ファイルをDriveに保存して公開URLを得る

```javascript
const folder   = DriveApp.getFolderById(FOLDER_ID);
const blob     = Utilities.newBlob(
  Utilities.base64Decode(base64String),
  'image/jpeg',
  'filename.jpg'
);
const driveFile = folder.createFile(blob);
driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

const fileId  = driveFile.getId();
const fileUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
// 注意: /uc?export=view は GAS の iframe sandbox からブロックされる
// thumbnail 形式を使うこと
```

### ファイルIDから画像Blobを取得する

```javascript
const fileIdMatch = url.match(/[?&]id=([^&]+)/);
if (fileIdMatch) {
  const driveFile = DriveApp.getFileById(fileIdMatch[1]);
  const blob = driveFile.getBlob();
}
```

### DriveApp の権限承認は2段階になることがある

- getFolderById（読み取り）と createFile（書き込み）は別権限
- getFolderById が通っても createFile で権限エラーになることがある
- 解決策：GASエディタで `testDriveWrite()` などの書き込みテスト関数を実行して権限を事前承認する

---

## UrlFetchApp（外部 API 呼び出し）

### OpenAI API の呼び出し

```javascript
const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
  method: 'post',
  contentType: 'application/json',
  headers: { 'Authorization': 'Bearer ' + apiKey },
  payload: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 300
  }),
  muteHttpExceptions: true  // これを付けないとエラーで例外になる
});
const json = JSON.parse(response.getContentText());
```

### API キーはスクリプトプロパティに保存する

```javascript
// 保存（一度だけ実行）
function setApiKey() {
  PropertiesService.getScriptProperties()
    .setProperty('OPENAI_API_KEY', 'sk-...');
}

// 取得（本番コード内）
const key = PropertiesService.getScriptProperties()
  .getProperty('OPENAI_API_KEY');
```

---

## 文字列エスケープの罠

### GAS の文字列内で `\\n` は無効なエスケープになる場合がある

Python スクリプトで GAS コードを生成するとき、
`\\n` が GAS 側で `\n` として解釈されず構文エラーになることがある。

```javascript
// ❌ Python で生成したコード（\\n がそのまま入る）
const s = 'line1\\nline2';

// ✅ 正しい
const s = 'line1\nline2';
```

---

## ContentService（doGet / doPost のレスポンス）

### JSON レスポンスの返し方

```javascript
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### doGet と doPost は必ず1つだけ定義する

GAS で同名関数が複数あると後ろの定義が有効になる。
doGet / doPost の重複は必ず防ぐ。

---

## HtmlService（Web アプリ）

### テンプレート変数の展開

```html
<!-- GAS テンプレート構文 -->
const GAS_URL = '<?= apiBaseUrl ?>';

<!-- ❌ JSON.stringify を使うと二重エスケープになる -->
const GAS_URL = <?= JSON.stringify(apiBaseUrl) ?>;
<!-- → '\\"https://...\\"' という壊れた文字列になる -->
```

### google.script.run の大きなデータ欠落

`google.script.run` はデータが大きいと `null` を返すことがある。
→ KNOWN_BUGS_AND_PITFALLS #8 参照
