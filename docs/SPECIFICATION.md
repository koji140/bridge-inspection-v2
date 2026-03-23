# 高架下点検マップ＆報告書システム　仕様書

実装確定版（v2.0）　2026年3月

本ドキュメントは、現在本番稼働中の実装を正として記述した公式仕様書です。設計上の変更が生じた場合は必ず本ドキュメントを更新すること。

---

## システムの目的

高架下点検業務において「写真・所見・位置情報・報告書」を一元管理し、地図中心のUIで横断的に管理できるシステムを構築する。

### 設計思想

- 地図は常に橋脚単位の横断ビュー
- 報告書IDなどのシステム概念はUIでは極力見せない
- 写真 → 橋脚（Pin）→ 報告書（Report）を柔軟に結び付ける
- photo_idと画像の対応ずれは点検記録の信頼性に直結するため、バインディングの安全設計を最優先とする

---

## システム構成

| レイヤ | 役割 |
|---|---|
| Web画面（Index.html） | GAS上のHTMLアプリ。写真登録・EXIF読み取り・マップ表示・右パネル編集・報告書作成UIを提供する。google.script.runおよびfetchでGASと通信する。 |
| カスタムGPT（ChatGPT） | 写真の所見・タグ・対応要否の提案、グルーピング提案、保存前確認を行う。GPT Actionを通じてCloudflare Worker経由でGASに保存命令を送る。「提案・補助」に専念し、最終確定はユーザーが行う。 |
| Cloudflare Worker | GPT ActionsのリクエストをGASに転送するAPI Gateway。CORS処理と入口安定化を担う。ビジネスロジックは持たない。 |
| Google Apps Script（GAS） | ビジネスロジック全体。CRUD・楽観ロック・pin集計・グルーピング照合・Googleドキュメント生成・PDF変換・OpenAI API呼び出しをすべてここで行う。 |
| Google Spreadsheet | DB。photos / pins / reports / report_items / uploads / audit_log / tags / photo_tags の各シートで構成。 |
| Google Drive | 写真ファイルおよびPDFの保存先。Web画面アップロード時にBase64でGASに送り、GASがDriveに保存してURLを取得する。 |

---

## 基本データ構造

### 写真（Photo）

写真1枚ごとのデータ。楽観ロックの対象（updated_atで管理）。

#### photo_idの形式

Web画面からアップロードした写真は、ファイル名ベースのhuman-readableなIDを発番する。

- 形式：`photo_＜ファイル名（拡張子除く）＞_＜ランダム4文字＞`
- 例：`photo_PXL_20260123_015730666_ab3f`
- 末尾の4文字は同名ファイルの重複防止用
- カスタムGPT経由（createPhotoBatch Action）で登録した写真はUUID形式になる場合がある

※ 以前はUUID形式（`photo_xxxxxxxx-xxxx-...`）のみだったが、人間が目視でどの写真か判別できるようファイル名ベースに変更した。

#### 保持情報

| カラム名 | 型 | 内容 |
|---|---|---|
| photo_id | string | ファイル名ベースID（Web画面）またはUUID形式（GPT経由） |
| pin_id | string | 紐づくpin。未確定時は空 |
| file_id | string | Google DriveのファイルID |
| file_url | string | Google Driveサムネイル表示URL（thumbnail?id=...&sz=w800形式） |
| thumb_url | string | file_urlと同値（現状サムネイル生成はしていない） |
| taken_at | datetime | EXIFから取得した撮影日時（ISO 8601形式） |
| lat / lng | number | EXIFから取得したGPS座標 |
| lat_lng_source | string | exif / manual / none |
| ocr_bridge_number | string | カスタムGPTがOCRで読み取った橋脚番号（提案値） |
| bridge_number_final | string | ユーザーが確定した橋脚番号 |
| comment_final | text | 確定所見。橋脚番号を含めない（PDFで別行に表示されるためダブりを防ぐ） |
| tag_final | string | 表示用タグ文字列（スラッシュ区切り） |
| response_status | string | 1〜5 / unset（対応要否ステータス。詳細は後述） |
| status | string | draft / published |
| deleted_at | datetime | 論理削除日時。空なら有効 |
| created_at / updated_at | datetime | 作成・更新日時。updated_atが楽観ロックのキーになる |
| created_by / updated_by | string | 操作者識別子（ui_user / gpt_action_user / web_ui / koji 等） |

#### statusの意味

- `draft`：まだconfirmed報告書に掲載されていない
- `published`：1つのconfirmed報告書に掲載済み

※ draft報告書に入っただけではpublishedにならない。confirm操作が実行されて初めてpublishedになる。  
※ 物理削除はしない。削除は必ず論理削除（deleted_at）で扱う。  
※ confirmed掲載済み写真（status=published）は編集も論理削除もできない。

---

### ピン（Pin）

橋脚単位のグループ。複数の写真が1つのpinに紐づく。地図上に表示される単位。

#### 保持情報

| カラム名 | 内容 |
|---|---|
| pin_id | UUID形式（`pin_xxxxxxxx-xxxx-...`） |
| bridge_number | 橋脚番号。配下写真のbridge_number_finalの最多値で自動更新される |
| pin_lat / pin_lng | pin代表座標。空の場合はsyncPinDerivedFields実行時に配下写真のGPSから自動補完される |
| pin_lat_lng_method | gps / exif / manual / unknown |
| photo_count | 有効写真枚数（論理削除を除く）。syncPinDerivedFields()で自動集計 |
| has_draft | draft写真が1枚以上あるか。syncPinDerivedFields()で自動集計 |
| last_taken_at | 配下写真のtaken_at最大値。syncPinDerivedFields()で自動集計 |
| deleted_at | 論理削除日時。有効写真が0枚になったとき自動でセットされる |

#### 特徴と注意点

- 1ピンに複数写真
- 地図上に表示（pin_lat / pin_lngが空のpinはマップに表示されない）
- 報告書IDとは独立
- max_response_statusはpinsシートには保持しない。photos.response_statusから都度計算する
- 写真が0枚になると論理削除され、マップから自動的に消える
- 論理削除済みのpinはresolveGroupingAgainstExistingPinsの照合対象から除外される（誤ったpinへの紐付けを防ぐ）

#### 都度計算の定義（max_response_status）

- 対象：そのpinに属する有効写真（deleted_atが空の写真）
- 算出：優先順位が最も高いresponse_statusの値
- 優先順位：1 > 2 > 3 > 4 > 5 > unset

---

### 報告書（Report）

複数橋脚をまとめた報告書。Googleドキュメントを経由してPDFに変換し、Google Driveに保存する。

#### 保持情報

| カラム名 | 内容 |
|---|---|
| report_id | UUID形式（`report_xxxxxxxx-xxxx-...`） |
| report_name | UI表示名。execution_date × execution_placeで自動生成。ユーザーが手動変更可。 |
| execution_date | 実施日。ピン選択時に配下写真のtaken_at最大値から自動提案される |
| execution_place | 実施場所。ピン選択時にOpenAI APIが橋脚番号をもとに自動提案する |
| work_content | 内容（いわゆる「作業内容」）。ピン選択時にOpenAI APIが所見一覧をもとに自動提案する。ユーザーが修正して確定。 |
| report_type | 定期点検 / 臨時点検 / 災害後確認 / 補修後確認 / その他 |
| status | draft / confirmed |
| report_date | 報告日。PDF生成時に自動セット |
| pdf_file_id / pdf_url | Google Drive上のPDFファイル情報。PDF生成後にセット |

#### statusの意味

- `draft`：編集中。内容・場所の編集可能。PDF生成・再生成可能。
- `confirmed`：PDF生成済み・確定済み。内容変更不可。対象写真はすべてpublishedになる。

※ confirm済み報告書はスナップショット。写真のcomment_finalを後から変更してもconfirmed PDFは自動更新しない。  
※ 不一致を解消したい場合は新しい報告書を作成して再生成する。

---

### 報告書明細（report_items）

報告書に含まれる要素（明細）。1明細＝写真1枚。

#### 保持情報

- item_id / report_id / pin_id / photo_id / order_no / created_at / created_by

#### 特徴

- 1報告書に複数橋脚
- 同じ写真を複数の報告書に入れない（重複チェック実装済み）
- pin未確定写真（pin_id空）は報告書に入れられない

#### order_noの決定ルール

- pinの順番：そのpin内のmin(taken_at)昇順
- 同一pin内の写真順：taken_at昇順
- taken_atが空の場合の同順判定：photo_id昇順

---

## 写真アップロードフロー

### フロー確定の背景

EXIFに格納されているGPS座標と撮影日時は、このシステムの根幹である「どの橋脚に紐づくか」の自動判定に使用する。ChatGPTはEXIFを読むことができない（画像の見た目しか認識できない）ため、EXIFの取得をChatGPTに依存できない。

また、複数写真を一度にChatGPTに渡すと、photo_idと画像の対応が会話の中でずれることが確認された（マルチモーダルモデルは画像の「順番」を保証しない）。このずれは「間違った橋脚に間違った所見が保存される」という重大なリスクにつながる。

これらの制約から、以下の2段階フローを採用した。

### 確定したフロー

| ステップ | 操作場所 | 内容 |
|---|---|---|
| ① | Web画面「写真登録」タブ | ブラウザがEXIF.jsでEXIF（撮影日時・GPS座標）を読み取る。写真ファイルをBase64でGASに送信。GASがGoogle Driveに保存してfile_urlを取得。photosシートにレコードを作成してphoto_idを発番する。 |
| ② | Web画面「📋 JSONをコピー」 | photo_id / original_filename / file_url / updated_atを含むJSONと「各photo_idとoriginal_filenameの対応を確認しながら処理してください」という指示文を合わせてクリップボードにコピーする。 |
| ③ | ChatGPTに写真をアップロード | 同じ写真ファイルをChatGPTにアップロードし、②でコピーしたJSONを貼り付ける。ChatGPTはoriginal_filenameで画像とphoto_idの対応を確認しながら所見・タグ・対応要否を提案する。 |
| ④ | ChatGPTで照合・確認 | resolveGroupingAgainstExistingPinsを呼んで既存pinとの照合結果を取得。auto_assign / approval_required / create_new_pinのいずれかを判定。ユーザーがメタデータを確認・修正。 |
| ⑤ | ChatGPTで保存 | ユーザー確認後にsaveApprovedPhotoMetadata（既存pin紐付け）またはcreateNewPinAndSaveApprovedMetadata（新規pin作成）を呼んで保存する。 |

※ 写真を2箇所に投げる手間は残るが、EXIFの確実な取得とphoto_idバインディングの安全性を優先した設計判断。

### photo_idバインディングの安全設計

photo_idと画像の対応ずれを防ぐために以下の多重防御を実装している。

- Web画面アップロード時点でphoto_idが確定するため、ChatGPTの処理順序に依存しない
- コピーするJSONにoriginal_filenameを必ず含め、画像との対応を明示的に確認させる
- ChatGPTのinstructions.mdに「順番依存でphoto_idを推定してはいけない」ルールを冒頭に明記
- 保存Action呼び出し前にphoto_idとoriginal_filenameの対応を自己チェックする手順をinstructions.mdに定義
- photo_idをファイル名ベースにすることで、人間が目視で「どの写真か」を確認できる

### 写真アップロード処理フロー（詳細）

Web画面アップロード時（GAS内部）の処理順序：

1. 写真ファイルをBase64文字列に変換（ブラウザ側）
2. EXIF.jsで撮影日時・GPS座標・lat_lng_sourceを取得
3. apiCreatePhotoBatchFromUi()をgoogle.script.run経由で呼び出し
4. GASがBase64をデコードしてBlobに変換
5. Google Driveの指定フォルダ（ID: 1bxM9nM_T4v_6EJlhCAkysvkH8uHu7Bbe）にファイルを保存
6. 保存したファイルを「リンクを知っている全員が閲覧可能」に設定
7. file_id・file_urlをphotosシートに記録してphoto_idを発番（1枚ずつ順次処理）

※ 写真1枚ずつ順次送信するのはGASのタイムアウト対策。大量の写真を一括送信するとタイムアウトが発生する。

---

## 地図UI

### 地図の役割

地図は橋脚横断ビュー。Report IDは意識させない。ピンをクリックすると右パネルに当該pinの写真一覧が表示される。

### ピン表示

ピンは橋脚単位。ピン色はpin内の最優先対応要否ステータス（max_response_status）で決める。

| ピン色 | 意味（max_response_statusの値） |
|---|---|
| 🔴 赤 | 1（対応要事象｜初期対応未済）を含む |
| 🟠 オレンジ | 2が最大 |
| 🟡 黄 | 3が最大 |
| 🔵 青 | 4が最大 |
| ⚫ 灰 | 5のみ（対応不要事象） |
| ○ 薄灰 | 未設定のみ |

- 判定対象：論理削除されていない写真のみ
- pin_lat / pin_lngが空のpinはマップに表示されない。写真にGPSが入っていればsyncPinDerivedFields()実行時に自動補完される
- 有効写真が0枚になったpinは自動で論理削除され、マップから消える

### 未報告バッジ

pinにdraft写真がある場合は、ピン右上に青いバッジを表示する（ツールチップに「未報告あり」と表示）。

ここでいうdraft写真とは：

- confirmed報告書に未掲載（status=draft）
- かつ論理削除されていない写真

### フィルタ（左パネル）

- 橋脚番号キーワード（前方一致）
- 未報告ありのみ（has_draft=trueのpinのみ表示）

※ v1仕様で定義していた「対応要否ステータス絞り込み」「タグ絞り込み」「confirmed/draft絞り込み」はP1対応（未実装）。

### 右パネル

ピンをクリックすると表示。

#### 各写真カードの表示内容

- photo_id（等幅フォントでグレー表示。トレーサビリティ確保のため）
- 写真（クリックすると拡大表示・Lightbox。ESCキーで閉じる）
- 対応要否・状態（draft/published）・撮影日時・橋脚番号・タグ・所見
- 「編集」ボタン

#### 写真カードの並び順

- response_status優先順位順（1→2→3→4→5→未設定）
- 同順の場合はtaken_at昇順
- さらに同順の場合はphoto_id昇順

### 右パネル（編集モード）

「編集」ボタンを押すと編集フォームに切り替わる。

#### 編集可能項目（実装済み）

- 橋脚番号（bridge_number_final）
- 対応要否ステータス（response_status）
- タグ（tag_final）
- 所見（comment_final）

#### 制約

- confirmed掲載済み写真（status=published）はロックされて編集不可
- 保存時に楽観ロックチェック（updated_atの一致確認）
- 削除ボタンから論理削除可能（published写真は削除不可・確認ダイアログあり）

※ 橋脚番号を編集して保存すると、syncPinDerivedFields()が呼ばれてpinのbridge_numberも最多値で自動更新される。  
※ 写真追加は地図画面からは行わない。Web画面の「写真登録」タブで行う。

---

## 対応要否ステータス（選択式）

本システムでは「重要度（高/中/低）」は使用しない。各写真（photo）ごとに対応要否ステータスを1つ選ぶ。

### 選択肢（固定）

| 値 | ラベル | 報告要否 |
|---|---|---|
| 1 | 対応要事象｜初期対応未済｜以降要 | 報告要 |
| 2 | 対応要事象｜初期対応済｜以降要 | 報告要 |
| 3 | 対応要事象｜初期対応済｜以降不要 | 報告要 |
| 4 | 対応要事象｜現地確認の結果、異常なし | 報告要 |
| 5 | 対応不要事象 | 報告不要 |
| unset | 未設定 | 初期値 |

### 付与ルール

- 付与単位：photos.response_status（写真単位）
- 決定者：ユーザーが最終確定。カスタムGPTは提案のみ行い、自動確定しない
- 優先順位（高→低）：1 > 2 > 3 > 4 > 5 > 未設定

---

## 報告書

### 報告書名（report_name）

report_nameはexecution_date（実施日）× execution_place（実施場所）で自動生成する。

- 例：`2026/02/18 6号向島線高架下（堤通出入口付近）`
- ユーザーは手動変更可能（draft状態のみ）

### 作業内容（work_content）の生成と確定

work_contentは、ピン選択時にOpenAI API（gpt-4o-mini）が橋脚番号と写真の所見一覧をもとに提案し、ユーザーが修正して最終化する。

#### フロー

1. ピンのチェックボックスをオン/オフ（500msのデバウンス後に処理）
2. 選択ピンの配下写真からtaken_at最大値・橋脚番号・comment_finalを収集
3. OpenAI APIに橋脚番号と所見一覧を渡してexecution_placeとwork_contentの案を生成
4. フォームに自動入力（一瞬青くハイライト）
5. ユーザーが修正後「作成」ボタンで報告書レコードとreport_itemsを生成

※ OpenAI APIキーはGASのスクリプトプロパティに保存（PropertiesService.getScriptProperties()）。APIキーが未設定の場合は橋脚番号をつなげた文字列でフォールバック。

### 報告書種別

- 定期点検 / 臨時点検 / 災害後確認 / 補修後確認 / その他

### 報告書作成フロー

1. 報告書タブで「＋新規作成」を押す
2. 対象ピンを選択（複数選択可）→ 実施日・実施場所・内容が自動提案
3. 必要に応じて手動修正し「作成」ボタン
4. 報告書レコードとreport_itemsが生成される（明細の順序はorder_noルールに従い自動決定）
5. 「PDF生成」ボタン → Googleドキュメントを生成しPDFに変換してDriveに保存
6. PDFをプレビュー（DriveのURLが右パネルに表示）
7. 問題なければ「報告書を確定する」ボタン → report.status=confirmed、対象写真=published

#### 確認ポイント（システムが自動チェック）

- 同じphoto_idが既存の報告書（draft・confirmed問わず）にすでに入っていないか
- 選択ピンに有効な写真が1枚以上あるか

### PDFレイアウト

| 項目 | 仕様 |
|---|---|
| 用紙 | A4縦。余白18mm（上下左右） |
| タイトル行 | 「高架下敷地管理（臨時対応）支援業務報告書」（bold 12pt）+ 会社名・報告日（右寄せ 9pt） |
| 実施情報テーブル | ラベル列13%・値列87%の2列テーブル。実施日・実施場所・内容を記載 |
| 1ページ目 | 実施情報テーブルの下に明細2件 |
| 2ページ目以降 | 明細3件ずつ |
| 明細レイアウト | 左35%（No. / 橋脚番号 / 所見 / タグ）右65%（写真）の2列テーブル。枠線あり |
| 明細左列の構成 | No.X（bold 10pt）/ 橋脚番号（bold 10pt）/ 所見（9pt）/ （タグ）（italic 8pt） |
| ファイル名 | 高架下点検報告書（YYYYMMDD 橋脚番号1_橋脚番号2...）.pdf |
| フッター | 中央にページ番号（- 1 - 形式） |

※ 所見（comment_final）には橋脚番号を含めない。明細の橋脚番号行と重複するため。

---

## カスタムGPT連携（確定版）

本システムにおけるカスタムGPTの責務は「提案・補助」に限定する。pinの最終決定やDB保存の最終確定はシステム側（ユーザー承認後）で行う。

### GPT Actionの一覧

| Action名 | 用途 |
|---|---|
| createPhotoBatch | ChatGPT経由で写真をphotosシートに一括登録する。file_url / file_idは空になる（Web画面経由ではないためDriveに保存されない） |
| resolveGroupingAgainstExistingPins | 仮グループと既存pinの照合。auto_assign / approval_required / create_new_pinのいずれかを返す |
| saveApprovedPhotoMetadata | auto_assign / approval_required の場合に使う。承認済みメタデータ（comment_final / tag_final / response_status / pin_id）を保存する |
| createNewPinAndSaveApprovedMetadata | create_new_pinの場合に使う。新規pinを作成した上で写真メタデータを保存する。syncPinDerivedFields()まで自動実行 |
| draftWorkContent | 写真のcomment_finalを連結してwork_contentの草案を作る。提案のみで保存はしない |

### 既存pin採用ルール（固定）

このルールはシステム固定。カスタムGPTがルールを変更してはいけない。

| 判定 | 条件 |
|---|---|
| auto_assign（自動採用） | GPS距離30m以内 AND OCRで橋脚番号が一致 AND 撮影日時が既存pinの写真と同日 |
| approval_required（承認後採用） | （GPS30m以内だがOCR不一致）OR（GPSなしだがOCR一致）、かつ撮影日時が同日 |
| create_new_pin（新規pin作成） | GPS30m以内・OCR一致があっても撮影日時が同日でない場合、またはGPS30m以内・OCR不一致で撮影日時も同日でない場合 |

※ auto_assign候補が複数ある場合はapproval_requiredに格上げして人間が選択する。  
※ 論理削除済みpinはすべての照合対象から除外される。

### photo_idバインディングのルール（instructions.mdより）

カスタムGPTに対して以下のルールをinstructions.mdで明記している。

- 各画像とphoto_idの対応は必ずoriginal_filenameで確認する
- 「1枚目の画像=JSON[0]」という暗黙の順番対応に依存してはいけない
- 出力は必ずphoto_idをキーにしたJSON形式（comment_draft / tag_draft / response_status_draft）
- saveAction呼び出し前に各photo_idとoriginal_filenameの対応を自己チェックする
- 所見（comment_final）には橋脚番号を含めない

---

## バリデーション・制約一覧

### 写真系

- confirmed掲載済み写真（status=published）は編集不可
- confirmed掲載済み写真は論理削除不可
- 同じ写真を複数報告書に入れない（report_items全体でphoto_idが一意）
- pin未確定写真（pin_id空）は報告書に入れられない

### 報告書系

- confirm済み報告書は内容固定（status=confirmedになったら内容変更不可）
- confirm後に対象写真のstatus・所見等を変えてもconfirmed PDFは自動更新しない
- PDF未生成の報告書はconfirmできない（pdf_urlが空の場合はconfirmボタンが出ない）

### 同時編集系（楽観ロック）

- photo / reportの更新時はupdated_atを必須パラメータとして渡す
- 不一致時（他ユーザーが先に更新していた場合）はLOCK_MISMATCHエラーを返して保存失敗
- 楽観ロックの比較にはnormalizeUpdatedAt()で秒単位に正規化してから比較する（GASのDate型とSpreadsheetの文字列型の混在を吸収）

---

## 安全設計

### 論理削除

- 写真：deleted_atに削除日時を記録。published写真は削除不可。削除するとpinのphoto_countが減り、0枚になるとpinも自動で論理削除される
- ピン：配下の有効写真が0枚になったとき、syncPinDerivedFields()が自動でdeleted_atをセットする
- 物理削除は行わない（いかなる行も消去しない）

### 監査ログ（audit_log）

重要な操作はすべてaudit_logシートに記録する。

| カラム | 内容 |
|---|---|
| entity_type | photo / pin / report / report_item |
| entity_id | 操作対象のID |
| action | create / update / delete / confirm / generate_pdf |
| before_json / after_json | 更新前後のレコードをJSON文字列で保存 |
| actor | 操作者識別子 |
| at | 操作日時 |

---

## DB設計（Googleスプレッドシート）

P0ではGoogleスプレッドシート（複数シート）をDBとして使用する。BackendはGAS Web App。

| シート名 | 用途 |
|---|---|
| photos | 写真本体とメタデータ管理。楽観ロック対象 |
| pins | 橋脚単位の集約データ。photo集計値は自動更新 |
| reports | 報告書ヘッダ情報 |
| report_items | 報告書明細。report_id / pin_id / photo_id / order_noを保持 |
| uploads | アップロード単位の状態管理（現状は未活用） |
| audit_log | 監査ログ。全重要操作のbefore/afterJSONを記録 |
| tags | タグマスタ（P1対応予定。現状はtag_finalの文字列管理のみ） |
| photo_tags | 写真とタグの中間テーブル（P1対応予定） |

※ pinsシートはv1仕様にはなかったdeleted_atカラムを追加済み。

---

## 未実装・今後の課題（P1以降）

| 項目 | 概要 | 優先度 |
|---|---|---|
| photo.pin_idの後変更 | 誤ったpinに入った写真を別pinに移動する機能 | P1 |
| batch save部分更新防止 | createNewPinAndSaveApprovedMetadataでpinだけ作成されて写真保存が失敗した場合の孤立pin対策（トランザクション相当の処理） | P1 |
| 左フィルタの拡充 | タグ検索・confirmed/draft絞り込み・対応要否ステータス絞り込み | P1 |
| tags / photo_tagsの活用 | 現状はtag_finalの文字列管理のみ。正式なタグ管理テーブルの活用 | P2 |
| アップロードフロー1本化 | Web画面とChatGPTへの2回投げをなくす（Claude API / Gemini API検討） | P2 |
| PDFレイアウト高度化 | 所見が長い場合のセル高制御・ページまたぎ改善 | P2 |
| 前回報告との差分表示 | 前回のconfirmed報告書との変化をハイライト | P2 |
| 劣化進行検知 | 同一橋脚の経年変化をAIで検知 | P3 |

---

## このドキュメントのルール

- このドキュメントを仕様の唯一の保存場所とする
- 実装上の決定事項は必ずここへ追記する
- P0とP1以降の境界を崩さない
- 実装前に迷う箇所はこのドキュメントに追記してから進める
- 仕様変更時は変更前の内容をコメントで残し、変更後の内容と変更理由を記載する
