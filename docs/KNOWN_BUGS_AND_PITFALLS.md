# KNOWN_BUGS_AND_PITFALLS

このプロジェクトで実際に問題になった罠。同じ失敗を繰り返さないために記録する。

---

## 1. Apps Script 直結は不安定

GPT Builder → Apps Script 直結は不安定だった。
Cloudflare Worker を挟む構成で安定した。

方針:
- Worker を残す
- Apps Script 直結に戻さない

---

## 2. `/a/macros/...` URL は外部向けではない

Apps Script の URL に `/a/macros/domain/...` 形式が出ることがあるが、
これは外部 API 用ではないケースがある。

実際に:
- PowerShell / Worker で 401
- Google Drive の HTML エラーページになる

方針:
- 外部から POST して JSON が返る URL だけを使う

---

## 3. Worker が古い GAS deployment を叩く

Worker の `gasUrl` が古いままだと、
修正コードが反映されず旧挙動になる。

方針:
- GAS を再デプロイしたら必ず Worker の `gasUrl` も更新する
- Worker の `gasUrl` と現在の有効な GAS デプロイ URL を毎回確認

---

## 4. `updated_at` は見た目一致でも実値がズレる

Spreadsheet では同じに見えても、
GAS 側では Date 型や秒差でズレることがある。

例:
- DB: `2026/03/06 23:45:50`
- 入力: `2026/03/06 23:45:51`

これで LOCK_MISMATCH が起きた。

方針:
- テスト JSON は Spreadsheet の最新 row を実際に開いて確認してから作る
- GAS では normalizeUpdatedAt() で秒単位に正規化してから比較する
- 以前の会話ログの値を流用しない。必ず現在の Spreadsheet の値を正とする

---

## 5. saveApprovedPhotoMetadata は現状トランザクションではない

`items[]` を順次更新するだけなので、途中失敗で部分更新が起こりうる。
createNewPinAndSaveApprovedMetadata でも同様で、pin だけ作成されて写真保存が
失敗した場合に孤立 pin が残る。

方針:
- 事前 validation（全件の updated_at チェック）を先に行い、1件でもエラーがあれば全件スキップ
- 孤立 pin が生じた場合は手動で Spreadsheet から削除する

---

## 6. doGet / doPost の重複定義に注意

GAS では同名関数が複数あると、後ろの定義だけが有効。

方針:
- `doGet`, `doPost` は一意に保つ
- 新しい action を追加するときは doPost の switch に case を追加するだけ

---

## 7. Builder の説明文を信じすぎない

Builder はエラー文を要約するため、実際の raw JSON と違う印象になることがある。

方針:
- デバッグは PowerShell → Worker → GAS の raw JSON を優先
- Builder の UI 上の表示は参考程度にとどめる

---

## 8. google.script.run は大きなデータを返すと欠落する

`google.script.run` 経由で配列や大きなオブジェクトを返すと、
ブラウザ側で `null` または空配列になることがある。

実際に:
- `apiGetMapPinsFromUi` が 6件返るはずなのに `null` になった
- `loadReportList` が空になった

方針:
- データ取得系（一覧・詳細）は `gasGet`（fetch ベース）を使う
- `doGet` に対応する action を追加して `fetch` で取得する
- 保存・更新系は `google.script.run` のままでよい（返り値が小さいため）

gasGet の仕組み:
```javascript
async function gasGet(action, params) {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  // params を querystring に追加
  const res  = await fetch(url.toString());
  const json = await res.json();
  return json.data;
}
```

---

## 9. ChatGPT は EXIF を読めない

ChatGPT（GPT Builder）に写真をアップロードしても、
EXIF 情報（撮影日時・GPS 座標）は取得できない。
画像の「見た目」しか認識できない仕様。

影響:
- taken_at / lat / lng は ChatGPT 経由では取得不可
- これらはこのシステムの根幹（橋脚自動グルーピングに使用）なので落とせない

方針:
- Web 画面（写真登録タブ）で先にアップロードして EXIF を読み取る
- その後 ChatGPT に同じ写真を渡す 2 段階フローを採用

---

## 10. photo_id と画像のバインディングがずれる

複数写真を一度に ChatGPT に渡すと、会話の中で photo_id と画像の対応がずれる。
マルチモーダルモデルは画像の「順番」を保証しない。

実際に:
- 画像の順番でphoto_idを推定したため、間違った橋脚に間違った所見が入った

方針:
- コピーする JSON に original_filename を必ず含める
- instructions.md に「順番依存でphoto_idを推定してはいけない」ルールを冒頭に明記
- photo_id をファイル名ベースにして人間が目視確認できるようにした

---

## 11. pin_lat / pin_lng が空のピンはマップに表示されない

GPS なしでピンが作成されると座標が空になり、マップに一切表示されない。

方針:
- syncPinDerivedFields() に GPS 自動補完ロジックを組み込み済み
- 配下写真に lat/lng があれば自動でピンに反映される
- 空ピンが大量に発生した場合は `fixEmptyPinCoords()` または `syncPinDerivedFields('fix')` を実行

---

## 12. GAS 再デプロイ後も古い挙動になる

コードを変更して保存しただけでは反映されない。
必ず「新バージョン」としてデプロイし直す必要がある。

方針:
- コードを変更したら「デプロイ → デプロイを管理 → 編集（鉛筆）→ 新バージョン → デプロイ」
- デプロイ URL は変わらないが、内部バージョンが更新される
