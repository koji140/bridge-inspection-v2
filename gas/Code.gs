/*********************************
 * 橋脚点検マップ＆報告書システム
 * 共通ユーティリティ（STEP2）
 *********************************/

/**
 * シート名定義
 */
const SHEETS = {
  PHOTOS: 'photos',
  PINS: 'pins',
  REPORTS: 'reports',
  REPORT_ITEMS: 'report_items',
  UPLOADS: 'uploads',
  AUDIT_LOG: 'audit_log',
  TAGS: 'tags',
  PHOTO_TAGS: 'photo_tags'
};

/**
 * IDプレフィックス定義
 */
const ID_PREFIX = {
  PHOTO: 'photo',
  PIN: 'pin',
  REPORT: 'report',
  ITEM: 'item',
  UPLOAD: 'upload',
  LOG: 'log',
  TAG: 'tag',
  PHOTO_TAG: 'photo_tag'
};

/**
 * スプレッドシートを取得
 * このGASがシートに紐づいている前提
 */
function getSs() {
  const ssId = '1QC3eM1qrJ-qCG0gMWwc6K10Bv9BnWDc0QhyY81v3jbU';
  return SpreadsheetApp.openById(ssId);
}

/**
 * シート取得
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(sheetName) {
  const sheet = getSs().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`シートが見つかりません: ${sheetName}`);
  }
  return sheet;
}

/**
 * 現在日時を Date で返す
 * シートにはこの値をそのまま入れる
 * @returns {Date}
 */
function now() {
  return new Date();
}

/**
 * UUIDベースで一意IDを生成
 * 例: photo_xxxxxxxx
 * @param {string} prefix
 * @returns {string}
 */
function newId(prefix) {
  return `${prefix}_${Utilities.getUuid()}`;
}

/**
 * 種別ごとのID発番関数
 */
function newPhotoId() {
  return newId(ID_PREFIX.PHOTO);
}

function newPinId() {
  return newId(ID_PREFIX.PIN);
}

function newReportId() {
  return newId(ID_PREFIX.REPORT);
}

function newItemId() {
  return newId(ID_PREFIX.ITEM);
}

function newUploadId() {
  return newId(ID_PREFIX.UPLOAD);
}

function newLogId() {
  return newId(ID_PREFIX.LOG);
}

function newTagId() {
  return newId(ID_PREFIX.TAG);
}

function newPhotoTagId() {
  return newId(ID_PREFIX.PHOTO_TAG);
}

/**
 * オブジェクト配列をシートに扱いやすい形へ変換する時に使う
 * ヘッダ行（1行目）を取得
 * @param {string} sheetName
 * @returns {string[]}
 */
function getHeaders(sheetName) {
  const sheet = getSheet(sheetName);
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    throw new Error(`ヘッダがありません: ${sheetName}`);
  }
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

/**
 * 1行分のオブジェクトをシート末尾に追加
 * オブジェクトのキーはヘッダ名と一致している必要がある
 * @param {string} sheetName
 * @param {Object} rowObj
 */
function appendRowByHeader(sheetName, rowObj) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheetName);

  const row = headers.map(header => {
    return rowObj.hasOwnProperty(header) ? rowObj[header] : '';
  });

  sheet.appendRow(row);
}

/**
 * シート全体をオブジェクト配列で取得
 * 1行目をヘッダとして扱う
 * @param {string} sheetName
 * @returns {Object[]}
 */
function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0];
  const rows = values.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * 指定カラムの値で1件探す
 * @param {string} sheetName
 * @param {string} key
 * @param {*} value
 * @returns {Object|null}
 */
function findOneBy(sheetName, key, value) {
  const rows = getAllRows(sheetName);
  const found = rows.find(row => row[key] === value);
  return found || null;
}

/**
 * 動作確認用
 * 実行してログにIDが出ればOK
 */
function testStep2() {
  Logger.log('photoId: ' + newPhotoId());
  Logger.log('pinId: ' + newPinId());
  Logger.log('reportId: ' + newReportId());
  Logger.log('itemId: ' + newItemId());
  Logger.log('uploadId: ' + newUploadId());
  Logger.log('logId: ' + newLogId());
  Logger.log('tagId: ' + newTagId());
  Logger.log('photoTagId: ' + newPhotoTagId());
  Logger.log('now: ' + now());
}

/*********************************
 * STEP3: photos CRUD
 *********************************/

/**
 * photo 1件を新規作成
 * @param {Object} input
 * @returns {Object}
 */
function createPhoto(input) {
  const photo = {
    photo_id: input.photo_id_override || newPhotoId(),
    pin_id: input.pin_id || '',
    upload_id: input.upload_id || '',
    file_id: input.file_id || '',
    file_url: input.file_url || '',
    thumb_file_id: input.thumb_file_id || '',
    thumb_url: input.thumb_url || '',
    taken_at: input.taken_at || '',
    lat: input.lat || '',
    lng: input.lng || '',
    lat_lng_source: input.lat_lng_source || 'none',
    ocr_bridge_number: input.ocr_bridge_number || '',
    bridge_number_final: input.bridge_number_final || '',
    comment_final: input.comment_final || '',
    tag_final: input.tag_final || '',
    response_status: input.response_status || 'unset',
    status: input.status || 'draft',
    deleted_at: '',
    created_at: now(),
    created_by: input.created_by || 'system',
    updated_at: now(),
    updated_by: input.updated_by || input.created_by || 'system'
  };

  appendRowByHeader(SHEETS.PHOTOS, photo);

  writeAuditLog({
    entity_type: 'photo',
    entity_id: photo.photo_id,
    action: 'create',
    before_json: '',
    after_json: JSON.stringify(photo),
    actor: photo.created_by
  });

  return photo;
}

/**
 * photo_id で写真1件取得
 * @param {string} photoId
 * @returns {Object|null}
 */
function getPhotoById(photoId) {
  return findOneBy(SHEETS.PHOTOS, 'photo_id', photoId);
}

/**
 * photo を更新
 * 楽観ロックあり：input.updated_at が現在値と一致しない場合はエラー
 * @param {string} photoId
 * @param {Object} input
 * @returns {Object}
 */
function updatePhoto(photoId, input) {
  const sheet = getSheet(SHEETS.PHOTOS);
  const headers = getHeaders(SHEETS.PHOTOS);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    throw new Error('photos シートにデータがありません');
  }

  const headerIndexMap = {};
  headers.forEach((h, i) => headerIndexMap[h] = i);

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const currentPhotoId = row[headerIndexMap['photo_id']];

    if (currentPhotoId === photoId) {
      const current = {};
      headers.forEach((h, i) => current[h] = row[i]);

      // 論理削除済みは更新不可
      if (current.deleted_at) {
        throw new Error('論理削除済みの写真は更新できません');
      }

      // 楽観ロック
      const currentUpdatedAt = current.updated_at;
      const inputUpdatedAt = input.updated_at || '';

      const currentNormalized = normalizeUpdatedAt(currentUpdatedAt);
      const inputNormalized = normalizeUpdatedAt(inputUpdatedAt);

      if (currentNormalized !== inputNormalized) {
        throw new Error(
          'LOCK_MISMATCH'
          + ' photo_id=' + photoId
          + ' currentRaw=' + String(currentUpdatedAt)
          + ' inputRaw=' + String(inputUpdatedAt)
          + ' current=' + currentNormalized
          + ' input=' + inputNormalized
        );
      }

      const updated = { ...current };
      Logger.log('updatePhoto input=' + JSON.stringify(input));

      // 更新対象（P0）
      if (Object.prototype.hasOwnProperty.call(input, 'bridge_number_final')) {
        updated.bridge_number_final = input.bridge_number_final;
      }
      if (Object.prototype.hasOwnProperty.call(input, 'comment_final')) {
        updated.comment_final = input.comment_final;
      }
      if (Object.prototype.hasOwnProperty.call(input, 'response_status')) {
        updated.response_status = input.response_status;
      }
      if (Object.prototype.hasOwnProperty.call(input, 'tag_final')) {
        updated.tag_final = input.tag_final;
      }
      if (input.hasOwnProperty('updated_by')) {
        updated.updated_by = input.updated_by;
      } else {
        updated.updated_by = 'system';
      }

      updated.updated_at = now();

      // シート反映
      headers.forEach((h, colIndex) => {
        sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updated[h]);
      });

      writeAuditLog({
        entity_type: 'photo',
        entity_id: photoId,
        action: 'update',
        before_json: JSON.stringify(current),
        after_json: JSON.stringify(updated),
        actor: updated.updated_by
      });

      return updated;
    }
  }

  throw new Error(`photo が見つかりません: ${photoId}`);
}

/**
 * photo を論理削除
 * confirmed掲載済みチェックは P0では status=published を削除不可とみなす
 * 楽観ロックあり
 * @param {string} photoId
 * @param {Object} input
 * @returns {Object}
 */
function logicalDeletePhoto(photoId, input) {
  const sheet = getSheet(SHEETS.PHOTOS);
  const headers = getHeaders(SHEETS.PHOTOS);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    throw new Error('photos シートにデータがありません');
  }

  const headerIndexMap = {};
  headers.forEach((h, i) => headerIndexMap[h] = i);

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const currentPhotoId = row[headerIndexMap['photo_id']];

    if (currentPhotoId === photoId) {
      const current = {};
      headers.forEach((h, i) => current[h] = row[i]);

      if (current.deleted_at) {
        throw new Error('すでに論理削除済みです');
      }

      if (current.status === 'published') {
        throw new Error('published の写真は削除できません');
      }

      // 楽観ロック
      const currentUpdatedAt = current.updated_at;
      const inputUpdatedAt = input.updated_at || '';

      const currentNormalized = normalizeUpdatedAt(currentUpdatedAt);
      const inputNormalized = normalizeUpdatedAt(inputUpdatedAt);

      if (currentNormalized !== inputNormalized) {
        throw new Error(
          'LOCK_MISMATCH'
          + ' photo_id=' + photoId
          + ' currentRaw=' + String(currentUpdatedAt)
          + ' inputRaw=' + String(inputUpdatedAt)
          + ' current=' + currentNormalized
          + ' input=' + inputNormalized
        );
      }

      const updated = { ...current };
      updated.deleted_at = now();
      updated.updated_at = now();
      updated.updated_by = input.updated_by || 'system';

      headers.forEach((h, colIndex) => {
        sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updated[h]);
      });

      writeAuditLog({
        entity_type: 'photo',
        entity_id: photoId,
        action: 'delete',
        before_json: JSON.stringify(current),
        after_json: JSON.stringify(updated),
        actor: updated.updated_by
      });

      return updated;
    }
  }

  throw new Error(`photo が見つかりません: ${photoId}`);
}

/**
 * photo一覧取得
 * 論理削除を除く
 * @returns {Object[]}
 */
function listActivePhotos() {
  return getAllRows(SHEETS.PHOTOS).filter(row => !row.deleted_at);
}

/**
 * audit_log に1件書く
 * @param {Object} input
 */
function writeAuditLog(input) {
  const log = {
    log_id: newLogId(),
    entity_type: input.entity_type || '',
    entity_id: input.entity_id || '',
    action: input.action || '',
    before_json: input.before_json || '',
    after_json: input.after_json || '',
    actor: input.actor || 'system',
    at: now()
  };

  appendRowByHeader(SHEETS.AUDIT_LOG, log);
}

/**
 * STEP3動作確認
 */
function testStep3() {
  // 1. 作成
  const created = createPhoto({
    upload_id: 'upload_test_001',
    file_id: 'file_test_001',
    file_url: 'https://example.com/photo1.jpg',
    thumb_file_id: 'thumb_test_001',
    thumb_url: 'https://example.com/thumb1.jpg',
    taken_at: '2026-03-06T10:00:00+09:00',
    lat: 35.680,
    lng: 139.760,
    lat_lng_source: 'exif',
    ocr_bridge_number: 'B-101',
    bridge_number_final: 'B-101',
    comment_final: '初期登録テスト',
    tag_final: 'ひび割れ,要確認',
    response_status: '1',
    status: 'draft',
    created_by: 'koji',
    updated_by: 'koji'
  });
  Logger.log('作成: ' + JSON.stringify(created));

  // 2. 取得
  const fetched = getPhotoById(created.photo_id);
  Logger.log('取得: ' + JSON.stringify(fetched));

  // 3. 更新
  const updated = updatePhoto(created.photo_id, {
    updated_at: String(fetched.updated_at),
    comment_final: '更新後の所見',
    response_status: '2',
    tag_final: '要確認,更新済み',
    updated_by: 'koji'
  });
  Logger.log('更新: ' + JSON.stringify(updated));

  // 4. 論理削除
  const deleted = logicalDeletePhoto(created.photo_id, {
    updated_at: String(updated.updated_at),
    updated_by: 'koji'
  });
  Logger.log('削除: ' + JSON.stringify(deleted));

  // 5. 一覧
  const activeList = listActivePhotos();
  Logger.log('有効写真件数: ' + activeList.length);
}

/*********************************
 * STEP4: pins 集計
 *********************************/

/**
 * response_status の優先度
 * 1 > 2 > 3 > 4 > 5 > unset
 * 数字が大きいほど優先度が高い値を返す
 * @param {string} responseStatus
 * @returns {number}
 */
function getResponseStatusPriority(responseStatus) {
  const map = {
    '1': 6,
    '2': 5,
    '3': 4,
    '4': 3,
    '5': 2,
    'unset': 1,
    '': 1
  };
  return map[String(responseStatus)] || 1;
}

/**
 * 複数の response_status から最優先の1件を返す
 * @param {string[]} statuses
 * @returns {string}
 */
function getMaxResponseStatus(statuses) {
  if (!statuses || statuses.length === 0) {
    return 'unset';
  }

  let maxStatus = 'unset';
  let maxPriority = 0;

  statuses.forEach(status => {
    const p = getResponseStatusPriority(status);
    if (p > maxPriority) {
      maxPriority = p;
      maxStatus = String(status || 'unset');
    }
  });

  return maxStatus;
}

/**
 * 有効な photo 一覧を返す
 * 条件:
 * - deleted_at が空
 * - pin_id が空でない
 * @returns {Object[]}
 */
function listActiveAssignedPhotos() {
  return getAllRows(SHEETS.PHOTOS).filter(photo => {
    return !photo.deleted_at && photo.pin_id;
  });
}

/**
 * pin_id ごとに photo をグループ化
 * @returns {Object}
 */
function groupPhotosByPinId() {
  const photos = listActiveAssignedPhotos();
  const grouped = {};

  photos.forEach(photo => {
    const pinId = photo.pin_id;
    if (!grouped[pinId]) {
      grouped[pinId] = [];
    }
    grouped[pinId].push(photo);
  });

  return grouped;
}

/**
 * pin内の最小 taken_at を返す
 * @param {Object[]} photos
 * @returns {string}
 */
function getMinTakenAt(photos) {
  const takenAts = photos
    .map(p => p.taken_at)
    .filter(v => v !== '' && v !== null && v !== undefined);

  if (takenAts.length === 0) {
    return '';
  }

  takenAts.sort();
  return takenAts[0];
}

/**
 * pin内の最大 taken_at を返す
 * @param {Object[]} photos
 * @returns {string}
 */
function getMaxTakenAt(photos) {
  const takenAts = photos
    .map(p => p.taken_at)
    .filter(v => v !== '' && v !== null && v !== undefined);

  if (takenAts.length === 0) {
    return '';
  }

  takenAts.sort();
  return takenAts[takenAts.length - 1];
}

/**
 * pinごとの集計結果を返す
 * @returns {Object[]}
 */
function buildPinSummaries() {
  const pins = getAllRows(SHEETS.PINS).filter(pin => !pin.deleted_at);
  const groupedPhotos = groupPhotosByPinId();

  const summaries = pins.map(pin => {
    const photos = groupedPhotos[pin.pin_id] || [];
    const responseStatuses = photos.map(p => String(p.response_status || 'unset'));

    const hasDraft = photos.some(p => String(p.status) === 'draft');
    const maxResponseStatus = getMaxResponseStatus(responseStatuses);
    const minTakenAt = getMinTakenAt(photos);
    const lastTakenAt = getMaxTakenAt(photos);

    // bridge_number_final の最多値を算出
    const bridgeCount = {};
    photos.forEach(p => {
      const bn = String(p.bridge_number_final || '').trim();
      if (bn) bridgeCount[bn] = (bridgeCount[bn] || 0) + 1;
    });
    let mostCommonBridge = '';
    let maxCount = 0;
    Object.entries(bridgeCount).forEach(([bn, cnt]) => {
      if (cnt > maxCount) { maxCount = cnt; mostCommonBridge = bn; }
    });

    // GPS補完用: 写真から有効な lat/lng を1件取得
    let photoLat = '';
    let photoLng = '';
    photos.forEach(p => {
      if (!photoLat && p.lat && p.lng &&
          !isNaN(Number(p.lat)) && !isNaN(Number(p.lng))) {
        photoLat = Number(p.lat);
        photoLng = Number(p.lng);
      }
    });

    return {
      pin_id: pin.pin_id,
      bridge_number: pin.bridge_number || '',
      pin_lat: pin.pin_lat || '',
      pin_lng: pin.pin_lng || '',
      photo_count: photos.length,
      has_draft: hasDraft,
      max_response_status: maxResponseStatus,
      min_taken_at: minTakenAt,
      last_taken_at: lastTakenAt,
      most_common_bridge_number: mostCommonBridge,
      photo_lat: photoLat,
      photo_lng: photoLng
    };
  });

  return summaries;
}

/**
 * pins シートに存在しない pin_id を持つ photos を検出
 * @returns {string[]}
 */
function findOrphanPhotoPinIds() {
  const pins = getAllRows(SHEETS.PINS);
  const pinIdSet = {};
  pins.forEach(pin => {
    pinIdSet[pin.pin_id] = true;
  });

  const photos = listActiveAssignedPhotos();
  const orphanMap = {};

  photos.forEach(photo => {
    if (!pinIdSet[photo.pin_id]) {
      orphanMap[photo.pin_id] = true;
    }
  });

  return Object.keys(orphanMap);
}

/**
 * pin集計結果を pins シートへ反映
 * @param {string} actor
 */
function syncPinDerivedFields(actor) {
  const sheet = getSheet(SHEETS.PINS);
  const headers = getHeaders(SHEETS.PINS);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return;
  }

  const headerIndexMap = {};
  headers.forEach((h, i) => headerIndexMap[h] = i);

  const summaries = buildPinSummaries();
  const summaryMap = {};
  summaries.forEach(s => {
    summaryMap[s.pin_id] = s;
  });

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const pinId = row[headerIndexMap['pin_id']];
    const current = {};
    headers.forEach((h, i) => current[h] = row[i]);

    // すでに論理削除済みのpinはスキップ
    if (current.deleted_at) continue;

    const summary = summaryMap[pinId] || {
      photo_count: 0,
      has_draft: false,
      last_taken_at: ''
    };

    const updated = { ...current };
    updated.photo_count = summary.photo_count;
    updated.has_draft = summary.has_draft;
    updated.last_taken_at = summary.last_taken_at;
    updated.updated_at = now();
    updated.updated_by = actor || 'system';

    // 写真が0枚になったら pin を論理削除
    if (summary.photo_count === 0 && !current.deleted_at) {
      updated.deleted_at = now();
      console.log('syncPinDerivedFields: pin を論理削除 pin_id=' + pinId);
    }

    // bridge_number: 配下写真の bridge_number_final の最多値で自動更新
    if (summary.photo_count > 0 && summary.most_common_bridge_number) {
      updated.bridge_number = summary.most_common_bridge_number;
    }

    // pin_lat / pin_lng が空なら写真の GPS で補完
    if ((!updated.pin_lat || !updated.pin_lng) && summary.photo_lat) {
      updated.pin_lat = summary.photo_lat;
      updated.pin_lng = summary.photo_lng;
      updated.pin_lat_lng_method = 'exif';
      console.log('syncPinDerivedFields: GPS補完 pin_id=' + pinId +
        ' lat=' + summary.photo_lat + ' lng=' + summary.photo_lng);
    }

    headers.forEach((h, colIndex) => {
      sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updated[h]);
    });
  }
}

/**
 * pins シートにpin を1件作成
 * @param {Object} input
 * @returns {Object}
 */
function createPin(input) {
  const pin = {
    pin_id: newPinId(),
    bridge_number: input.bridge_number || '',
    pin_lat: input.pin_lat !== undefined && input.pin_lat !== null ? input.pin_lat : '',
    pin_lng: input.pin_lng !== undefined && input.pin_lng !== null ? input.pin_lng : '',
    pin_lat_lng_method: input.pin_lat_lng_method || 'unknown',
    photo_count: input.photo_count || 0,
    has_draft: input.has_draft || false,
    last_taken_at: input.last_taken_at || '',
    created_at: now(),
    created_by: input.created_by || 'system',
    updated_at: now(),
    updated_by: input.updated_by || input.created_by || 'system',
    deleted_at: ''
  };

  appendRowByHeader(SHEETS.PINS, pin);

  writeAuditLog({
    entity_type: 'pin',
    entity_id: pin.pin_id,
    action: 'create',
    before_json: '',
    after_json: JSON.stringify(pin),
    actor: pin.created_by
  });

  return pin;
}

/**
 * STEP4動作確認
 */
function testStep4() {
  const pin = createPin({
    bridge_number: 'B-201',
    pin_lat: 35.6805,
    pin_lng: 139.7610,
    pin_lat_lng_method: 'manual',
    created_by: 'koji',
    updated_by: 'koji'
  });
  Logger.log('pin作成: ' + JSON.stringify(pin));

  const photo1 = createPhoto({
    pin_id: pin.pin_id,
    upload_id: 'upload_test_pin_001',
    file_id: 'file_test_pin_001',
    file_url: 'https://example.com/pin1_photo1.jpg',
    taken_at: '2026-03-06T09:00:00+09:00',
    bridge_number_final: 'B-201',
    comment_final: '1枚目',
    response_status: '3',
    status: 'draft',
    created_by: 'koji',
    updated_by: 'koji'
  });

  const photo2 = createPhoto({
    pin_id: pin.pin_id,
    upload_id: 'upload_test_pin_001',
    file_id: 'file_test_pin_002',
    file_url: 'https://example.com/pin1_photo2.jpg',
    taken_at: '2026-03-06T10:00:00+09:00',
    bridge_number_final: 'B-201',
    comment_final: '2枚目',
    response_status: '1',
    status: 'draft',
    created_by: 'koji',
    updated_by: 'koji'
  });

  Logger.log('photo1: ' + JSON.stringify(photo1));
  Logger.log('photo2: ' + JSON.stringify(photo2));

  const orphans = findOrphanPhotoPinIds();
  Logger.log('orphan pin ids: ' + JSON.stringify(orphans));

  const summaries = buildPinSummaries();
  Logger.log('pin summaries: ' + JSON.stringify(summaries));

  syncPinDerivedFields('koji');

  const pinsAfter = getAllRows(SHEETS.PINS);
  Logger.log('pins after sync: ' + JSON.stringify(pinsAfter));
}

/*********************************
 * STEP5: 地図UI向け pin 一覧
 *********************************/

/**
 * response_status から pin 色を返す
 * @param {string} responseStatus
 * @returns {string}
 */
function getPinColor(responseStatus) {
  const map = {
    '1': 'red',
    '2': 'orange',
    '3': 'yellow',
    '4': 'blue',
    '5': 'gray',
    'unset': 'lightgray',
    '': 'lightgray'
  };
  return map[String(responseStatus)] || 'lightgray';
}

/**
 * 地図UI向けの pin 表示データを返す
 * @returns {Object[]}
 */
function getMapPins() {
  const summaries = buildPinSummaries();

  return summaries
    .filter(pin => pin.pin_lat !== '' && pin.pin_lng !== '')
    .map(pin => {
      return {
        pin_id: pin.pin_id,
        bridge_number: pin.bridge_number || '',
        lat: pin.pin_lat,
        lng: pin.pin_lng,
        photo_count: pin.photo_count,
        has_draft: pin.has_draft,
        max_response_status: pin.max_response_status,
        pin_color: getPinColor(pin.max_response_status),
        badge_text: pin.has_draft ? '未報告あり' : '',
        min_taken_at: pin.min_taken_at,
        last_taken_at: pin.last_taken_at
      };
    });
}

/**
 * フィルタ付きで地図 pin 一覧を返す
 * @param {Object} filters
 * @returns {Object[]}
 */
function getMapPinsWithFilters(filters) {
  const allPins = getMapPins();
  const f = filters || {};

  return allPins.filter(pin => {
    if (f.has_draft_only === true && !pin.has_draft) {
      return false;
    }

    if (f.response_statuses && f.response_statuses.length > 0) {
      if (!f.response_statuses.includes(String(pin.max_response_status))) {
        return false;
      }
    }

    if (f.keyword && String(f.keyword).trim() !== '') {
      const keyword = String(f.keyword).trim().toLowerCase();
      const target = String(pin.bridge_number || '').toLowerCase();
      if (!target.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 地図UI向けの簡易JSONをログ出力
 */
function testStep5() {
  const pins = getMapPins();
  Logger.log('all map pins: ' + JSON.stringify(pins));

  const filtered1 = getMapPinsWithFilters({ has_draft_only: true });
  Logger.log('draft only: ' + JSON.stringify(filtered1));

  const filtered2 = getMapPinsWithFilters({ response_statuses: ['1'] });
  Logger.log('status=1 only: ' + JSON.stringify(filtered2));

  const filtered3 = getMapPinsWithFilters({ keyword: 'B-201' });
  Logger.log('keyword B-201: ' + JSON.stringify(filtered3));
}

/*********************************
 * STEP6: 右パネル用データ
 *********************************/

/**
 * 右パネルの写真並び順用 priority
 * @param {string} responseStatus
 * @returns {number}
 */
function getRightPanelPhotoOrderPriority(responseStatus) {
  const map = {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    'unset': 6,
    '': 6
  };
  return map[String(responseStatus)] || 6;
}

/**
 * @param {*} value
 * @returns {string}
 */
function toSortableString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * 1枚の photo を右パネル表示用オブジェクトに変換
 * @param {Object} photo
 * @returns {Object}
 */
function toRightPanelPhoto(photo) {
  const status = String(photo.status || 'draft');
  const deleted = !!photo.deleted_at;
  const isPublished = status === 'published';

  return {
    photo_id: String(photo.photo_id || ''),
    pin_id: String(photo.pin_id || ''),
    file_url: String(photo.file_url || ''),
    thumb_url: String(photo.thumb_url || ''),
    taken_at: photo.taken_at ? String(photo.taken_at) : '',
    bridge_number_final: String(photo.bridge_number_final || ''),
    comment_final: String(photo.comment_final || ''),
    tag_final: String(photo.tag_final || ''),
    response_status: String(photo.response_status || 'unset'),
    status: status,
    deleted_at: photo.deleted_at ? String(photo.deleted_at) : '',
    updated_at: photo.updated_at ? String(photo.updated_at) : '',
    updated_by: photo.updated_by ? String(photo.updated_by) : '',

    can_edit: !deleted && !isPublished,
    can_delete: !deleted && !isPublished,
    is_locked: isPublished
  };
}

/**
 * pin配下の有効写真一覧を取得
 * @param {string} pinId
 * @returns {Object[]}
 */
function getActivePhotosByPinId(pinId) {
  return getAllRows(SHEETS.PHOTOS).filter(photo => {
    return !photo.deleted_at && String(photo.pin_id) === String(pinId);
  });
}

/**
 * 右パネル表示順で photos を並べ替え
 * @param {Object[]} photos
 * @returns {Object[]}
 */
function sortPhotosForRightPanel(photos) {
  const copied = [...photos];

  copied.sort((a, b) => {
    const statusA = getRightPanelPhotoOrderPriority(a.response_status);
    const statusB = getRightPanelPhotoOrderPriority(b.response_status);

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    const takenAtA = toSortableString(a.taken_at);
    const takenAtB = toSortableString(b.taken_at);
    if (takenAtA !== takenAtB) {
      return takenAtA < takenAtB ? -1 : 1;
    }

    const photoIdA = toSortableString(a.photo_id);
    const photoIdB = toSortableString(b.photo_id);
    if (photoIdA !== photoIdB) {
      return photoIdA < photoIdB ? -1 : 1;
    }

    return 0;
  });

  return copied;
}

/**
 * pin 1件を取得
 * @param {string} pinId
 * @returns {Object|null}
 */
function getPinById(pinId) {
  return findOneBy(SHEETS.PINS, 'pin_id', pinId);
}

/**
 * 右パネル全体データを返す
 * @param {string} pinId
 * @returns {Object}
 */
function getRightPanelData(pinId) {
  const pin = getPinById(pinId);
  if (!pin) {
    throw new Error(`pin が見つかりません: ${pinId}`);
  }

  const rawPhotos = getActivePhotosByPinId(pinId);
  const panelPhotos = rawPhotos.map(toRightPanelPhoto);
  const sortedPhotos = sortPhotosForRightPanel(panelPhotos);

  const summaries = buildPinSummaries();
  const summary = summaries.find(s => String(s.pin_id) === String(pinId)) || null;

  return {
    pin: {
      pin_id: pin.pin_id,
      bridge_number: pin.bridge_number || '',
      pin_lat: pin.pin_lat || '',
      pin_lng: pin.pin_lng || '',
      photo_count: summary ? summary.photo_count : 0,
      has_draft: summary ? summary.has_draft : false,
      max_response_status: summary ? summary.max_response_status : 'unset',
      min_taken_at: summary ? summary.min_taken_at : '',
      last_taken_at: summary ? summary.last_taken_at : ''
    },
    photos: sortedPhotos
  };
}

/**
 * right panel の簡易確認用
 */
function testStep6() {
  const pins = getAllRows(SHEETS.PINS);
  if (pins.length === 0) {
    throw new Error('pins シートにデータがありません。先に testStep4 を実行してください。');
  }

  const pinId = pins[pins.length - 1].pin_id;
  const panelData = getRightPanelData(pinId);

  Logger.log('right panel data: ' + JSON.stringify(panelData));
}

/*********************************
 * STEP7: Web API 化
 *********************************/

/**
 * JSONレスポンスを返す
 * @param {Object} obj
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 成功レスポンス共通
 * @param {*} data
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function successResponse(data) {
  return jsonResponse({
    ok: true,
    data: data
  });
}

/**
 * エラーレスポンス共通
 * @param {Error|string} error
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function errorResponse(error) {
  const message = error instanceof Error ? error.message : String(error);
  return jsonResponse({
    ok: false,
    error: message
  });
}

/**
 * doPost
 */
function doPost(e) {
  console.log('WEBAPP doPost entered', new Date().toISOString());
  try {
    const bodyText = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    console.log('WEBAPP raw body:', bodyText);

    const body = JSON.parse(bodyText);
    const action = body.action || '';
    console.log('WEBAPP action:', action);

    switch (action) {
      case 'saveApprovedPhotoMetadata':
        return successResponse(actionSaveApprovedPhotoMetadata(body.payload || {}));

      case 'resolveGroupingAgainstExistingPins':
        return successResponse(actionResolveGroupingAgainstExistingPins(body.payload || {}));

      case 'draftWorkContent':
        return successResponse(actionDraftWorkContent(body.payload || {}));

      case 'createNewPinAndSaveApprovedMetadata':
        return successResponse(actionCreateNewPinAndSaveApprovedMetadata(body.payload || {}));

      case 'createPhotoBatch':
        return successResponse(actionCreatePhotoBatch(body.payload || {}));

      case 'createReport':
        return successResponse(actionCreateReport(body.payload || {}));

      case 'generateReportPdf':
        return successResponse(actionGenerateReportPdf(body.payload || {}));

      case 'confirmReport':
        return successResponse(actionConfirmReport(body.payload || {}));

      default:
        throw new Error('未対応のPOST actionです: ' + action);
    }
  } catch (error) {
    console.error('WEBAPP doPost error:', error && error.stack ? error.stack : error);
    return errorResponse(error);
  }
}

/*********************************
 * STEP8: HTML画面表示
 *********************************/

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    if (!action) {
      const template = HtmlService.createTemplateFromFile('Index');
      template.apiBaseUrl = ScriptApp.getService().getUrl();

      return template.evaluate()
        .setTitle('橋脚点検マップ＆報告書システム')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    switch (action) {
      case 'healthCheck':
        return successResponse({
          message: 'GAS API is running',
          now: now()
        });

      case 'getMapPins': {
        const hasDraftOnly = String(e.parameter.has_draft_only || '') === 'true';

        let responseStatuses = [];
        if (e.parameter.response_statuses) {
          responseStatuses = String(e.parameter.response_statuses)
            .split(',')
            .map(v => v.trim())
            .filter(v => v !== '');
        }

        const keyword = e.parameter.keyword || '';

        const data = getMapPinsWithFilters({
          has_draft_only: hasDraftOnly,
          response_statuses: responseStatuses,
          keyword: keyword
        });

        return successResponse(data);
      }

      case 'getRightPanelData': {
        const pinId = e.parameter.pin_id || '';
        if (!pinId) {
          throw new Error('pin_id は必須です');
        }

        const data = getRightPanelData(pinId);
        return successResponse(data);
      }

      case 'getReportList': {
        return successResponse(getReportList());
      }

      case 'getReportDetail': {
        const reportId = e.parameter.report_id || '';
        if (!reportId) throw new Error('report_id は必須です');
        return successResponse(getReportDetail(reportId));
      }

      default:
        throw new Error(`未対応のGET actionです: ${action}`);
    }
  } catch (error) {
    return errorResponse(error);
  }
}

/*********************************
 * STEP8補助: HTMLから直接呼ぶ関数
 *********************************/

function apiGetMapPinsFromUi(filters) {
  return getMapPinsWithFilters(filters || {});
}

function apiGetRightPanelDataFromUi(pinId) {
  if (!pinId) {
    throw new Error('pin_id は必須です');
  }
  return getRightPanelData(pinId);
}

/**
 * Web UI から画像バイナリ付きで写真を一括登録する
 * Google Drive に保存して file_url / file_id を記録する
 */
/**
 * ファイル名からhuman-readableなphoto_idを生成する
 * 例: PXL_20260123_015730666.jpg → photo_PXL_20260123_015730666
 * 重複回避のため末尾に4桁のランダム文字列を付ける
 * @param {string} filename
 * @returns {string}
 */
function newPhotoIdFromFilename(filename) {
  if (!filename) return newPhotoId();

  // 拡張子を除去
  const base = String(filename).replace(/\.[^.]+$/, '');

  // ファイル名を安全な文字のみに（英数字・アンダースコア・ハイフン）
  const safe = base.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);

  // 重複回避の4桁サフィックス
  const suffix = Utilities.getUuid().replace(/-/g, '').substring(0, 4);

  return 'photo_' + safe + '_' + suffix;
}

function apiCreatePhotoBatchFromUi(payload) {
  const FOLDER_ID = '1bxM9nM_T4v_6EJlhCAkysvkH8uHu7Bbe';
  const photos    = Array.isArray(payload.photos) ? payload.photos : [];
  const createdBy = payload.created_by || 'web_ui';

  if (!photos.length) {
    throw new Error('photos は必須です');
  }

  let folder;
  try {
    folder = DriveApp.getFolderById(FOLDER_ID);
  } catch (e) {
    throw new Error('Google Drive フォルダが見つかりません: ' + FOLDER_ID);
  }

  const results = photos.map(item => {
    let fileId  = '';
    let fileUrl = '';

    // base64 が含まれていれば Drive に保存
    if (item.image_base64) {
      const mimeType = item.mime_type || 'image/jpeg';
      const filename = item.original_filename || ('photo_' + Utilities.getUuid() + '.jpg');

      const blob = Utilities.newBlob(
        Utilities.base64Decode(item.image_base64),
        mimeType,
        filename
      );

      const driveFile = folder.createFile(blob);
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      fileId  = driveFile.getId();
      fileUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
    }

    const photo = createPhoto({
      photo_id_override:   newPhotoIdFromFilename(item.original_filename),
      pin_id:              '',
      upload_id:           '',
      file_id:             fileId,
      file_url:            fileUrl,
      thumb_file_id:       '',
      thumb_url:           fileUrl,
      taken_at:            item.taken_at          || '',
      lat:                 (item.lat !== null && item.lat !== undefined) ? item.lat : '',
      lng:                 (item.lng !== null && item.lng !== undefined) ? item.lng : '',
      lat_lng_source:      item.lat_lng_source     || 'none',
      ocr_bridge_number:   item.ocr_bridge_number  || '',
      bridge_number_final: item.ocr_bridge_number  || '',
      comment_final:       '',
      tag_final:           '',
      response_status:     'unset',
      status:              'draft',
      created_by:          createdBy,
      updated_by:          createdBy
    });

    return {
      original_filename: item.original_filename || '',
      photo_id:          photo.photo_id,
      updated_at:        String(photo.updated_at),
      file_url:          fileUrl
    };
  });

  return results;
}

function apiDeletePhotoFromUi(payload) {
  const photoId = payload.photo_id || '';
  if (!photoId) throw new Error('photo_id は必須です');
  return logicalDeletePhoto(photoId, payload);
}

function apiUpdatePhotoFromUi(payload) {
  const photoId = payload.photo_id || '';
  if (!photoId) {
    throw new Error('photo_id は必須です');
  }
  return updatePhoto(photoId, payload);
}

/*********************************
 * GPT Actions 用
 *********************************/

/**
 * 日付が同日かどうかを判定
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function isSameDay(a, b) {
  if (!a || !b) return false;

  const da = new Date(a);
  const db = new Date(b);

  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;

  const ya = da.getFullYear();
  const ma = da.getMonth();
  const daDay = da.getDate();

  const yb = db.getFullYear();
  const mb = db.getMonth();
  const dbDay = db.getDate();

  return ya === yb && ma === mb && daDay === dbDay;
}

/**
 * 2地点の距離（m）を概算で返す
 * @param {number|string} lat1
 * @param {number|string} lng1
 * @param {number|string} lat2
 * @param {number|string} lng2
 * @returns {number}
 */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const aLat = Number(lat1);
  const aLng = Number(lng1);
  const bLat = Number(lat2);
  const bLng = Number(lng2);

  if ([aLat, aLng, bLat, bLng].some(v => Number.isNaN(v))) {
    return Number.POSITIVE_INFINITY;
  }

  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const latRad1 = toRad(aLat);
  const latRad2 = toRad(bLat);

  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(latRad1) * Math.cos(latRad2) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

/**
 * pin に紐づく最新写真を1枚返す
 * @param {string} pinId
 * @returns {Object|null}
 */
function getLatestPhotoByPinId(pinId) {
  const photos = getActivePhotosByPinId(pinId);

  if (!photos.length) return null;

  const sorted = [...photos].sort((a, b) => {
    const ta = String(a.taken_at || '');
    const tb = String(b.taken_at || '');
    if (ta !== tb) return ta < tb ? 1 : -1;
    return String(a.photo_id) < String(b.photo_id) ? 1 : -1;
  });

  return sorted[0];
}

/**
 * 既存 pin 候補との照合
 * @param {Object} payload
 * @returns {Object[]}
 */
function actionResolveGroupingAgainstExistingPins(payload) {
  const groups = (payload && payload.groups) ? payload.groups : [];
  const pins = getAllRows(SHEETS.PINS).filter(pin => !pin.deleted_at);

  const results = groups.map(group => {
    const groupBridgeNumber = String(group.suggested_bridge_number || '');
    const groupLat = group.lat;
    const groupLng = group.lng;
    const groupTakenAt = group.taken_at || '';

    const autoCandidates = [];
    const approvalCandidates = [];

    pins.forEach(pin => {
      const latestPhoto = getLatestPhotoByPinId(pin.pin_id);

      const pinBridgeNumber = String(pin.bridge_number || (latestPhoto ? latestPhoto.bridge_number_final || '' : ''));
      const dist = distanceMeters(groupLat, groupLng, pin.pin_lat, pin.pin_lng);
      const within30m = dist <= 30;
      const ocrMatch = !!groupBridgeNumber && !!pinBridgeNumber && groupBridgeNumber === pinBridgeNumber;
      const sameDay = latestPhoto ? isSameDay(groupTakenAt, latestPhoto.taken_at) : false;
      const gpsMissing = groupLat === '' || groupLat === null || groupLat === undefined ||
                         groupLng === '' || groupLng === null || groupLng === undefined;

      if (within30m && ocrMatch && sameDay) {
        autoCandidates.push(pin.pin_id);
        return;
      }

      if (((within30m && !ocrMatch) || (gpsMissing && ocrMatch)) && sameDay) {
        approvalCandidates.push(pin.pin_id);
        return;
      }
    });

    if (autoCandidates.length === 1) {
      return {
        group_id: group.group_id || '',
        resolution_type: 'auto_assign',
        candidate_pin_ids: autoCandidates,
        matched_pin_id: autoCandidates[0],
        resolution_reason: 'GPS30m以内・OCR一致・撮影日時が同日'
      };
    }

    if (autoCandidates.length > 1) {
      return {
        group_id: group.group_id || '',
        resolution_type: 'approval_required',
        candidate_pin_ids: autoCandidates,
        matched_pin_id: '',
        resolution_reason: '自動採用条件を満たす既存pin候補が複数あるため'
      };
    }

    if (approvalCandidates.length > 0) {
      return {
        group_id: group.group_id || '',
        resolution_type: 'approval_required',
        candidate_pin_ids: approvalCandidates,
        matched_pin_id: '',
        resolution_reason: '承認後採用条件を満たす既存pin候補があるため'
      };
    }

    return {
      group_id: group.group_id || '',
      resolution_type: 'create_new_pin',
      candidate_pin_ids: [],
      matched_pin_id: '',
      resolution_reason: '既存pin採用条件を満たす候補がないため'
    };
  });

  return results;
}

/**
 * ユーザーが承認した metadata / pin 紐付けを保存
 * @param {Object} payload
 * @returns {Object[]}
 */
function actionSaveApprovedPhotoMetadata(payload) {
  const items = (payload && payload.items) ? payload.items : [];
  const updatedBy = (payload && payload.updated_by) ? payload.updated_by : 'gpt_action_user';

  const results = items.map(item => {
    const photoId = item.photo_id || '';
    if (!photoId) {
      throw new Error('photo_id は必須です');
    }

    const updated = updatePhotoWithPin(photoId, {
      updated_at: item.updated_at || '',
      comment_final: item.comment_final || '',
      tag_final: item.tag_final || '',
      response_status: item.response_status || 'unset',
      pin_id: item.pin_id || '',
      updated_by: updatedBy
    });

    return updated;
  });

  syncPinDerivedFields(updatedBy);

  return results;
}

/**
 * updatePhoto の pin_id 更新対応版
 * @param {string} photoId
 * @param {Object} input
 * @returns {Object}
 */
function updatePhotoWithPin(photoId, input) {
  const sheet = getSheet(SHEETS.PHOTOS);
  const headers = getHeaders(SHEETS.PHOTOS);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    throw new Error('photos シートにデータがありません');
  }

  const headerIndexMap = {};
  headers.forEach((h, i) => headerIndexMap[h] = i);

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const currentPhotoId = row[headerIndexMap['photo_id']];

    if (currentPhotoId === photoId) {
      const current = {};
      headers.forEach((h, i) => current[h] = row[i]);

      if (current.deleted_at) {
        throw new Error('論理削除済みの写真は更新できません');
      }

      const currentUpdatedAt = current.updated_at;
      const inputUpdatedAt = input.updated_at || '';

      const currentNormalized = normalizeUpdatedAt(currentUpdatedAt);
      const inputNormalized = normalizeUpdatedAt(inputUpdatedAt);

      if (currentNormalized !== inputNormalized) {
        throw new Error(
          'LOCK_MISMATCH'
          + ' photo_id=' + photoId
          + ' currentRaw=' + String(currentUpdatedAt)
          + ' inputRaw=' + String(inputUpdatedAt)
          + ' current=' + currentNormalized
          + ' input=' + inputNormalized
        );
      }

      const updated = { ...current };

      if (Object.prototype.hasOwnProperty.call(input, 'comment_final')) {
        updated.comment_final = input.comment_final;
      }
      if (Object.prototype.hasOwnProperty.call(input, 'response_status')) {
        updated.response_status = input.response_status;
      }
      if (Object.prototype.hasOwnProperty.call(input, 'tag_final')) {
        updated.tag_final = input.tag_final;
      }
      if (Object.prototype.hasOwnProperty.call(input, 'pin_id')) {
        updated.pin_id = input.pin_id;
      }

      updated.updated_by = input.updated_by || 'system';
      updated.updated_at = now();

      headers.forEach((h, colIndex) => {
        sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updated[h]);
      });

      writeAuditLog({
        entity_type: 'photo',
        entity_id: photoId,
        action: 'update',
        before_json: JSON.stringify(current),
        after_json: JSON.stringify(updated),
        actor: updated.updated_by
      });

      return updated;
    }
  }

  throw new Error(`photo が見つかりません: ${photoId}`);
}

/**
 * work_content のたたき台を作る
 * @param {Object} payload
 * @returns {Object}
 */
function actionDraftWorkContent(payload) {
  const photoIds = (payload && payload.photo_ids) ? payload.photo_ids : [];
  if (!photoIds.length) {
    throw new Error('photo_ids は必須です');
  }

  const allPhotos = getAllRows(SHEETS.PHOTOS);
  const targetPhotos = allPhotos.filter(p => photoIds.includes(String(p.photo_id)));

  const comments = targetPhotos
    .map(p => String(p.comment_final || '').trim())
    .filter(v => v !== '');

  return {
    photo_count: targetPhotos.length,
    source_comments: comments,
    work_content_draft: comments.join('／')
  };
}

/*********************************
 * STEP9: create_new_pin フロー
 *********************************/

/**
 * 新規 pin を作成し、写真 metadata を一括保存する
 *
 * payload 例:
 * {
 *   "group_id": "group_101",
 *   "bridge_number": "B-301",
 *   "pin_lat": 35.6805,
 *   "pin_lng": 139.7610,
 *   "pin_lat_lng_method": "gps",
 *   "updated_by": "gpt_action_user",
 *   "items": [
 *     {
 *       "photo_id": "photo_xxx",
 *       "updated_at": "2026/03/09 1:03:22",
 *       "comment_final": "コメント",
 *       "tag_final": "タグ",
 *       "response_status": "5"
 *     }
 *   ]
 * }
 *
 * @param {Object} payload
 * @returns {Object}
 */
function actionCreateNewPinAndSaveApprovedMetadata(payload) {
  const groupId      = payload.group_id           || '';
  const bridgeNum    = payload.bridge_number       || '';
  const pinLat       = (payload.pin_lat  !== undefined && payload.pin_lat  !== null) ? payload.pin_lat  : '';
  const pinLng       = (payload.pin_lng  !== undefined && payload.pin_lng  !== null) ? payload.pin_lng  : '';
  const latLngMethod = payload.pin_lat_lng_method  || 'unknown';
  const updatedBy    = payload.updated_by          || 'gpt_action_user';
  const items        = Array.isArray(payload.items) ? payload.items : [];

  if (!items.length) {
    throw new Error('items は必須です');
  }

  // --- 事前 validation: 全 photo の updated_at を一括チェック ---
  const allPhotos = getAllRows(SHEETS.PHOTOS);
  const photoMap  = {};
  allPhotos.forEach(p => { photoMap[String(p.photo_id)] = p; });

  const validationErrors = [];
  items.forEach(item => {
    const photoId = String(item.photo_id || '');
    if (!photoId) {
      validationErrors.push('photo_id が空の item があります');
      return;
    }
    const dbPhoto = photoMap[photoId];
    if (!dbPhoto) {
      validationErrors.push('photo が見つかりません: ' + photoId);
      return;
    }
    if (dbPhoto.deleted_at) {
      validationErrors.push('論理削除済みの photo: ' + photoId);
      return;
    }
    const currentNorm = normalizeUpdatedAt(dbPhoto.updated_at);
    const inputNorm   = normalizeUpdatedAt(item.updated_at || '');
    if (currentNorm !== inputNorm) {
      validationErrors.push(
        'LOCK_MISMATCH photo_id=' + photoId +
        ' current=' + currentNorm +
        ' input=' + inputNorm
      );
    }
  });

  if (validationErrors.length > 0) {
    throw new Error('事前 validation エラー:\n' + validationErrors.join('\n'));
  }

  // --- pin 作成 ---
  const pin = createPin({
    bridge_number:      bridgeNum,
    pin_lat:            pinLat,
    pin_lng:            pinLng,
    pin_lat_lng_method: latLngMethod,
    created_by:         updatedBy,
    updated_by:         updatedBy
  });

  console.log('createNewPin: pin_id=' + pin.pin_id + ' group_id=' + groupId);

  // --- 各 photo に pin_id を付与して保存 ---
  const savedPhotos = items.map(item => {
    return updatePhotoWithPin(String(item.photo_id), {
      updated_at:      item.updated_at      || '',
      comment_final:   item.comment_final   !== undefined ? item.comment_final   : '',
      tag_final:       item.tag_final       !== undefined ? item.tag_final       : '',
      response_status: item.response_status || 'unset',
      pin_id:          pin.pin_id,
      updated_by:      updatedBy
    });
  });

  // --- pin 集計を同期 ---
  syncPinDerivedFields(updatedBy);

  return {
    group_id:     groupId,
    pin:          pin,
    saved_photos: savedPhotos
  };
}

/**
 * STEP9動作確認
 * GAS エディタから直接実行してテストする
 */
function testStep9() {
  // pin のない photo を1件作成
  const photo = createPhoto({
    upload_id: 'upload_step9_test',
    file_id: 'file_step9_001',
    file_url: 'https://example.com/step9_test.jpg',
    taken_at: '2026-03-14T10:00:00+09:00',
    lat: 35.690,
    lng: 139.770,
    lat_lng_source: 'exif',
    ocr_bridge_number: 'B-999',
    bridge_number_final: 'B-999',
    comment_final: 'step9テスト写真（保存前）',
    tag_final: 'テストタグ',
    response_status: '3',
    status: 'draft',
    created_by: 'koji'
  });
  Logger.log('photo created: ' + JSON.stringify(photo));

  // create_new_pin フロー実行
  const result = actionCreateNewPinAndSaveApprovedMetadata({
    group_id: 'group_step9_test',
    bridge_number: 'B-999',
    pin_lat: 35.690,
    pin_lng: 139.770,
    pin_lat_lng_method: 'gps',
    updated_by: 'koji',
    items: [
      {
        photo_id: photo.photo_id,
        updated_at: String(photo.updated_at),
        comment_final: 'step9 確認済みコメント',
        tag_final: 'ひび割れ',
        response_status: '3'
      }
    ]
  });

  Logger.log('result: ' + JSON.stringify(result));
}

/*********************************
 * デバッグ・ユーティリティ
 *********************************/

function testResolveGroupingAgainstExistingPins() {
  const result = actionResolveGroupingAgainstExistingPins({
    groups: [
      {
        group_id: 'group_1',
        photo_ids: ['photo_xxx'],
        suggested_bridge_number: 'B-201',
        lat: 35.6805,
        lng: 139.7610,
        taken_at: '2026-03-06T10:00:00+09:00'
      }
    ]
  });

  Logger.log(JSON.stringify(result));
}

function testDraftWorkContent() {
  const result = actionDraftWorkContent({
    photo_ids: ['photo_xxx', 'photo_yyy']
  });

  Logger.log(JSON.stringify(result));
}

function testSaveApprovedPhotoMetadata() {
  const photo = getAllRows(SHEETS.PHOTOS).find(p => !p.deleted_at);

  if (!photo) {
    throw new Error('テスト対象の photo がありません');
  }

  const result = actionSaveApprovedPhotoMetadata({
    updated_by: 'gpt_action_user',
    items: [
      {
        photo_id: photo.photo_id,
        updated_at: String(photo.updated_at),
        comment_final: 'テスト更新',
        tag_final: 'テストタグ',
        response_status: '2',
        pin_id: photo.pin_id || ''
      }
    ]
  });

  Logger.log(JSON.stringify(result));
}

function debugGetPhotoRow() {
  const photoId = 'photo_c02891cf-c05f-43ec-8491-a03614732936';
  const ss = getSs();
  const sheet = ss.getSheetByName('photos');
  if (!sheet) throw new Error('photosシートがありません');

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1);

  const photoIdIndex = headers.indexOf('photo_id');
  if (photoIdIndex === -1) throw new Error('photo_id列がありません');

  const row = rows.find(r => String(r[photoIdIndex]) === photoId);
  if (!row) throw new Error('photo が見つかりません: ' + photoId);

  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);

  Logger.log(JSON.stringify(obj));
}

function testDoPostSaveApprovedPhotoMetadata() {
  const photoId = 'photo_c02891cf-c05f-43ec-8491-a03614732936';
  const ss = getSs();
  const sheet = ss.getSheetByName('photos');
  if (!sheet) throw new Error('photosシートがありません');

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1);

  const photoIdIndex = headers.indexOf('photo_id');
  const updatedAtIndex = headers.indexOf('updated_at');

  if (photoIdIndex === -1) throw new Error('photo_id列がありません');
  if (updatedAtIndex === -1) throw new Error('updated_at列がありません');

  const row = rows.find(r => String(r[photoIdIndex]) === photoId);
  if (!row) throw new Error('photo が見つかりません: ' + photoId);

  const latestUpdatedAt = String(row[updatedAtIndex] || '');

  const e = {
    pathInfo: '',
    postData: {
      contents: JSON.stringify({
        action: 'saveApprovedPhotoMetadata',
        payload: {
          updated_by: 'gpt_action_user',
          items: [
            {
              photo_id: photoId,
              updated_at: latestUpdatedAt,
              comment_final: 'doPostテスト保存',
              tag_final: 'doPostテストタグ',
              response_status: '5',
              pin_id: 'pin_2de93094-8483-4b79-a9f8-38566c3352a5'
            }
          ]
        }
      })
    }
  };

  const res = doPost(e);
  Logger.log(res.getContent());
}

function normalizeUpdatedAt(value) {
  if (value === null || value === undefined || value === '') return '';

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy/MM/dd H:mm:ss');
  }

  const s = String(value).trim();
  const d = new Date(s);

  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy/MM/dd H:mm:ss');
  }

  return s;
}

/*********************************
 * STEP10: 写真一括登録（GPT Action用）
 *********************************/

/**
 * ChatGPT からアップロードされた写真を photos シートに一括登録する
 *
 * ・file_url / file_id は持てないため空欄で登録する
 * ・taken_at / lat / lng は ChatGPT が読み取れた場合のみ入れる
 * ・ocr_bridge_number は ChatGPT が読み取れた場合のみ入れる
 *
 * payload 例:
 * {
 *   "photos": [
 *     {
 *       "original_filename": "PXL_20260218_063801310.jpg",
 *       "taken_at": "2026-02-18T06:38:01Z",
 *       "lat": 35.68,
 *       "lng": 139.76,
 *       "lat_lng_source": "exif",
 *       "ocr_bridge_number": "向-515-2"
 *     },
 *     {
 *       "original_filename": "PXL_20260218_063809466.jpg",
 *       "taken_at": "",
 *       "lat": null,
 *       "lng": null,
 *       "lat_lng_source": "none",
 *       "ocr_bridge_number": ""
 *     }
 *   ],
 *   "created_by": "gpt_action_user"
 * }
 *
 * 返却例:
 * [
 *   {
 *     "original_filename": "PXL_20260218_063801310.jpg",
 *     "photo_id": "photo_xxxxxxxx-...",
 *     "updated_at": "2026/03/14 9:12:22"
 *   },
 *   ...
 * ]
 *
 * @param {Object} payload
 * @returns {Object[]}
 */
function actionCreatePhotoBatch(payload) {
  const photos    = Array.isArray(payload.photos) ? payload.photos : [];
  const createdBy = payload.created_by || 'gpt_action_user';

  if (!photos.length) {
    throw new Error('photos は必須です');
  }

  const results = photos.map(item => {
    const photo = createPhoto({
      pin_id:            '',
      upload_id:         '',
      file_id:           '',
      file_url:          '',
      thumb_file_id:     '',
      thumb_url:         '',
      taken_at:          item.taken_at          || '',
      lat:               (item.lat  !== null && item.lat  !== undefined) ? item.lat  : '',
      lng:               (item.lng  !== null && item.lng  !== undefined) ? item.lng  : '',
      lat_lng_source:    item.lat_lng_source     || 'none',
      ocr_bridge_number: item.ocr_bridge_number  || '',
      bridge_number_final: item.ocr_bridge_number || '',
      comment_final:     '',
      tag_final:         '',
      response_status:   'unset',
      status:            'draft',
      created_by:        createdBy,
      updated_by:        createdBy
    });

    return {
      original_filename: item.original_filename || '',
      photo_id:          photo.photo_id,
      updated_at:        String(photo.updated_at)
    };
  });

  return results;
}

/**
 * STEP10動作確認
 */
function testStep10() {
  const result = actionCreatePhotoBatch({
    created_by: 'koji',
    photos: [
      {
        original_filename: 'test_photo_1.jpg',
        taken_at: '2026-03-14T10:00:00+09:00',
        lat: 35.68,
        lng: 139.76,
        lat_lng_source: 'exif',
        ocr_bridge_number: '向-515-2'
      },
      {
        original_filename: 'test_photo_2.jpg',
        taken_at: '',
        lat: null,
        lng: null,
        lat_lng_source: 'none',
        ocr_bridge_number: ''
      }
    ]
  });

  Logger.log('createPhotoBatch result: ' + JSON.stringify(result));
}

/**
 * 既存の photos の file_url / thumb_url を thumbnail URL に一括更新
 * 一度だけ実行すればよい
 */
function fixExistingPhotoUrls() {
  const sheet   = getSheet(SHEETS.PHOTOS);
  const headers = getHeaders(SHEETS.PHOTOS);
  const values  = sheet.getDataRange().getValues();

  const hIdx = {};
  headers.forEach((h, i) => hIdx[h] = i);

  let fixedCount = 0;
  for (let i = 1; i < values.length; i++) {
    const row    = values[i];
    const fileId = String(row[hIdx['file_id']] || '').trim();
    if (!fileId) continue;

    const newUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';

    sheet.getRange(i + 1, hIdx['file_url']  + 1).setValue(newUrl);
    sheet.getRange(i + 1, hIdx['thumb_url'] + 1).setValue(newUrl);
    fixedCount++;
  }

  Logger.log('URL更新完了: ' + fixedCount + '件');
}

/*********************************
 * STEP11: 報告書 CRUD
 *********************************/

/**
 * 報告書IDの発番
 */
function newReportIdLocal() {
  return newId('report');
}

/**
 * report_item IDの発番
 */
function newItemIdLocal() {
  return newId('item');
}

/**
 * report_name を自動生成
 * 例: "2026/02/18 6号向島線高架下（堤通出入口付近）"
 * @param {string} executionDate
 * @param {string} executionPlace
 * @returns {string}
 */
function generateReportName(executionDate, executionPlace) {
  const d = executionDate ? String(executionDate).split('T')[0].replace(/-/g, '/') : '';
  return (d ? d + ' ' : '') + (executionPlace || '');
}

/**
 * order_no を決定する
 * pin順：min(taken_at) 昇順
 * 同一pin内：taken_at 昇順、同順はphoto_id昇順
 *
 * @param {string[]} pinIds
 * @param {Object[]} photos  - pin_id / taken_at / photo_id を持つ配列
 * @returns {Object[]} - { pin_id, photo_id, order_no }[]
 */
function buildOrderedItems(pinIds, photos) {
  // pin ごとに写真をグループ化
  const byPin = {};
  pinIds.forEach(pid => { byPin[pid] = []; });
  photos.forEach(p => {
    if (byPin[p.pin_id]) byPin[p.pin_id].push(p);
  });

  // pin の代表 taken_at (min) を算出
  const pinMinTaken = {};
  pinIds.forEach(pid => {
    const takenAts = byPin[pid]
      .map(p => String(p.taken_at || ''))
      .filter(v => v);
    takenAts.sort();
    pinMinTaken[pid] = takenAts.length ? takenAts[0] : '';
  });

  // pin を min taken_at 昇順にソート
  const sortedPinIds = [...pinIds].sort((a, b) => {
    const ta = pinMinTaken[a] || '';
    const tb = pinMinTaken[b] || '';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a < b ? -1 : 1;
  });

  // 明細を組み立て
  const items = [];
  let orderNo = 1;
  sortedPinIds.forEach(pid => {
    const pinPhotos = [...byPin[pid]].sort((a, b) => {
      const ta = String(a.taken_at || '');
      const tb = String(b.taken_at || '');
      if (ta !== tb) return ta < tb ? -1 : 1;
      return String(a.photo_id) < String(b.photo_id) ? -1 : 1;
    });
    pinPhotos.forEach(p => {
      items.push({
        pin_id:   pid,
        photo_id: p.photo_id,
        order_no: orderNo++
      });
    });
  });

  return items;
}

/**
 * 報告書作成
 *
 * payload:
 * {
 *   execution_date:  "2026-02-18",
 *   execution_place: "6号向島線高架下（堤通出入口付近）",
 *   report_type:     "臨時点検",
 *   work_content:    "・不法投棄の状況確認と回収",
 *   selected_pin_ids: ["pin_xxx", "pin_yyy"],
 *   created_by:      "ui_user"
 * }
 */
function actionCreateReport(payload) {
  const executionDate  = payload.execution_date  || '';
  const executionPlace = payload.execution_place || '';
  const reportType     = payload.report_type     || 'その他';
  const workContent    = payload.work_content    || '';
  const selectedPinIds = Array.isArray(payload.selected_pin_ids) ? payload.selected_pin_ids : [];
  const createdBy      = payload.created_by      || 'ui_user';

  if (!selectedPinIds.length) {
    throw new Error('selected_pin_ids は必須です');
  }

  // pin 存在確認
  const allPins = getAllRows(SHEETS.PINS);
  const pinMap  = {};
  allPins.forEach(p => { pinMap[p.pin_id] = p; });
  selectedPinIds.forEach(pid => {
    if (!pinMap[pid]) throw new Error('pin が見つかりません: ' + pid);
  });

  // 対象写真を取得（pin未確定・論理削除を除く）
  const allPhotos = getAllRows(SHEETS.PHOTOS);
  const targetPhotos = allPhotos.filter(p =>
    !p.deleted_at &&
    p.pin_id &&
    selectedPinIds.includes(String(p.pin_id))
  );

  if (!targetPhotos.length) {
    throw new Error('選択されたpinに有効な写真がありません');
  }

  // 重複 photo チェック（既存 draft/confirmed 報告書に入っていないか）
  const existingItems = getAllRows(SHEETS.REPORT_ITEMS);
  const usedPhotoIds  = new Set(existingItems.map(i => String(i.photo_id)));
  const duplicates    = targetPhotos.filter(p => usedPhotoIds.has(String(p.photo_id)));
  if (duplicates.length > 0) {
    throw new Error('すでに他の報告書に含まれる写真があります: ' +
      duplicates.map(p => p.photo_id).join(', '));
  }

  // 報告書レコード作成
  const reportId   = newReportIdLocal();
  const reportName = generateReportName(executionDate, executionPlace);
  const report = {
    report_id:        reportId,
    report_name:      reportName,
    execution_date:   executionDate,
    execution_place:  executionPlace,
    work_content:     workContent,
    report_type:      reportType,
    status:           'draft',
    report_date:      '',
    pdf_file_id:      '',
    pdf_url:          '',
    created_at:       now(),
    created_by:       createdBy,
    updated_at:       now(),
    updated_by:       createdBy
  };
  appendRowByHeader(SHEETS.REPORTS, report);

  // 明細順を決定してレコード作成
  const orderedItems = buildOrderedItems(selectedPinIds, targetPhotos);
  orderedItems.forEach(item => {
    const reportItem = {
      item_id:    newItemIdLocal(),
      report_id:  reportId,
      pin_id:     item.pin_id,
      photo_id:   item.photo_id,
      order_no:   item.order_no,
      created_at: now(),
      created_by: createdBy
    };
    appendRowByHeader(SHEETS.REPORT_ITEMS, reportItem);
  });

  writeAuditLog({
    entity_type: 'report',
    entity_id:   reportId,
    action:      'create',
    before_json: '',
    after_json:  JSON.stringify(report),
    actor:       createdBy
  });

  return {
    report:       report,
    item_count:   orderedItems.length
  };
}

/**
 * 報告書一覧取得（UI用）
 * @returns {Object[]}
 */
function getReportList() {
  return getAllRows(SHEETS.REPORTS)
    .filter(r => !r.deleted_at)
    .sort((a, b) => {
      const ta = String(a.created_at || '');
      const tb = String(b.created_at || '');
      return ta < tb ? 1 : -1; // 新しい順
    });
}

/**
 * 報告書1件取得（明細・写真・pin情報付き）
 * @param {string} reportId
 * @returns {Object}
 */
function getReportDetail(reportId) {
  const report = findOneBy(SHEETS.REPORTS, 'report_id', reportId);
  if (!report) throw new Error('報告書が見つかりません: ' + reportId);

  const items   = getAllRows(SHEETS.REPORT_ITEMS)
    .filter(i => String(i.report_id) === String(reportId))
    .sort((a, b) => Number(a.order_no) - Number(b.order_no));

  const allPhotos = getAllRows(SHEETS.PHOTOS);
  const photoMap  = {};
  allPhotos.forEach(p => { photoMap[String(p.photo_id)] = p; });

  const allPins = getAllRows(SHEETS.PINS);
  const pinMap  = {};
  allPins.forEach(p => { pinMap[String(p.pin_id)] = p; });

  const enrichedItems = items.map(item => {
    const photo = photoMap[String(item.photo_id)] || {};
    const pin   = pinMap[String(item.pin_id)]     || {};
    return {
      item_id:          item.item_id,
      order_no:         item.order_no,
      pin_id:           item.pin_id,
      photo_id:         item.photo_id,
      bridge_number:    pin.bridge_number   || '',
      comment_final:    photo.comment_final || '',
      tag_final:        photo.tag_final     || '',
      response_status:  photo.response_status || 'unset',
      file_url:         photo.file_url      || '',
      thumb_url:        photo.thumb_url     || '',
      taken_at:         photo.taken_at      || ''
    };
  });

  return {
    report: report,
    items:  enrichedItems
  };
}

/**
 * Web UI 用ラッパー
 */
function apiGetReportListFromUi() {
  return getReportList();
}

function apiGetReportDetailFromUi(reportId) {
  return getReportDetail(reportId);
}

function apiCreateReportFromUi(payload) {
  return actionCreateReport(payload || {});
}

/*********************************
 * STEP12: Googleドキュメント生成→PDF変換
 *********************************/

/**
 * 報告書PDFを生成する
 *
 * 処理:
 * 1. Googleドキュメントを新規作成
 * 2. ヘッダ・明細を書き込む
 * 3. PDFに変換してDriveに保存
 * 4. reports.pdf_url / pdf_file_id / report_date を更新
 *
 * payload:
 * {
 *   report_id: "report_xxx",
 *   folder_id: "任意（省略時はreports用フォルダを自動作成）",
 *   updated_by: "ui_user"
 * }
 */
function actionGenerateReportPdf(payload) {
  const reportId  = payload.report_id  || '';
  const updatedBy = payload.updated_by || 'ui_user';
  const PHOTO_FOLDER_ID = '1bxM9nM_T4v_6EJlhCAkysvkH8uHu7Bbe';

  if (!reportId) throw new Error('report_id は必須です');

  const detail = getReportDetail(reportId);
  const report = detail.report;
  const items  = detail.items;

  if (!items.length) throw new Error('明細が0件です');

  // ---- ファイル名生成 ----
  // 「高架下点検報告書（YYYYMMDD 橋脚番号）」
  // execution_date は "2026-02-18" 形式 → "20260218"
  let dateStr = '';
  if (report.execution_date) {
    const dRaw = String(report.execution_date).trim();
    // ISO形式 or yyyy/mm/dd 形式のどちらでも対応
    const dObj = new Date(dRaw);
    if (!isNaN(dObj.getTime())) {
      const dy = dObj.getFullYear();
      const dm = String(dObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dObj.getDate()).padStart(2, '0');
      dateStr = '' + dy + dm + dd;
    } else {
      dateStr = dRaw.replace(/[-\/]/g, '').substring(0, 8);
    }
  } else {
    const dn = new Date();
    dateStr = '' + dn.getFullYear() +
      String(dn.getMonth() + 1).padStart(2, '0') +
      String(dn.getDate()).padStart(2, '0');
  }
  const bridgeNums = [...new Set(items.map(i => i.bridge_number).filter(v => v))].join('_');
  const docTitle = '高架下点検報告書（' + dateStr + (bridgeNums ? ' ' + bridgeNums : '') + '）';

  // ---- Googleドキュメント作成 ----
  const doc  = DocumentApp.create(docTitle);
  const body = doc.getBody();

  // A4: 余白 上下18mm、左右18mm（詰めてスペース確保）
  const MT = 51; const MB = 51; const ML = 51; const MR = 51;
  body.setMarginTop(MT).setMarginBottom(MB).setMarginLeft(ML).setMarginRight(MR);

  // A4幅595pt - 余白 = コンテンツ幅
  const pageWidth = 595 - ML - MR; // ≒493pt

  // フッター: ページ番号中央
  // GAS DocumentApp でページ番号フィールドを挿入する
  try {
    const footer = doc.addFooter();
    const fp = footer.getParagraphs()[0];
    fp.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    fp.appendText('- ');
    fp.appendPageNumber();
    fp.appendText(' -');
    fp.editAsText().setFontSize(0, fp.getText().length - 1, 9);
  } catch(footerErr) {
    console.warn('フッター追加失敗: ' + footerErr.message);
  }

  // ---- ヘッダ部 ----
  // タイトル + 会社名・報告日（タイトル55%、右45%で1行に収める）
  const titleTable = body.appendTable([
    ['高架下敷地管理（臨時対応）支援業務報告書',
     '首都高アソシエイト（株）　報告日　' + formatDateJp(report.report_date || new Date())]
  ]);
  titleTable.setBorderWidth(0);
  const titleRow = titleTable.getRow(0);

  const TITLE_W = Math.floor(pageWidth * 0.55);
  const RIGHT_HEADER_W = pageWidth - TITLE_W;

  const tc0 = titleRow.getCell(0);
  tc0.setWidth(TITLE_W);
  const tt0 = tc0.editAsText();
  tt0.setFontSize(0, tt0.getText().length - 1, 12);
  tt0.setBold(0, tt0.getText().length - 1, true);

  const tc1 = titleRow.getCell(1);
  tc1.setWidth(RIGHT_HEADER_W);
  const tt1 = tc1.editAsText();
  if (tt1.getText().length > 0) {
    tt1.setFontSize(0, tt1.getText().length - 1, 9);
  }

  // タイトルと表の間隔を最小に
  const spacer1 = body.appendParagraph('');
  spacer1.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);

  // 実施情報テーブル: ラベル列を狭く（約13%）
  const LABEL_W = Math.floor(pageWidth * 0.13);
  const VALUE_W = pageWidth - LABEL_W;

  const infoTable = body.appendTable([
    ['実施日',   formatDateJp(report.execution_date)],
    ['実施場所', report.execution_place || ''],
    ['内　容',   report.work_content   || '']
  ]);
  infoTable.setBorderWidth(1);
  for (let i = 0; i < infoTable.getNumRows(); i++) {
    const row   = infoTable.getRow(i);
    const label = row.getCell(0);
    const value = row.getCell(1);
    label.setWidth(LABEL_W);
    value.setWidth(VALUE_W);
    const lt = label.editAsText();
    lt.setFontSize(0, lt.getText().length - 1, 10);
    lt.setBold(0, lt.getText().length - 1, true);
    const vt = value.editAsText();
    if (vt.getText().length > 0) vt.setFontSize(0, vt.getText().length - 1, 10);
  }

  // 表と明細の間隔を最小に
  const spacer2 = body.appendParagraph('');
  spacer2.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);

  // ---- 明細部 ----
  // 1ページ目: 2件、2ページ目以降: 3件
  const PAGE1_COUNT = 2;
  const PAGE_COUNT  = 3;

  // 明細テーブルの列幅: 左35% 右65%
  const LEFT_W  = Math.floor(pageWidth * 0.35);
  const RIGHT_W = pageWidth - LEFT_W;

  items.forEach((item, idx) => {
    // ページ区切り
    if (idx === PAGE1_COUNT ||
        (idx > PAGE1_COUNT && (idx - PAGE1_COUNT) % PAGE_COUNT === 0)) {
      body.appendPageBreak();
    }

    // 明細を2列テーブルで作る
    const detailTable = body.appendTable([['', '']]);
    detailTable.setBorderWidth(1);

    const detailRow  = detailTable.getRow(0);
    const leftCell   = detailRow.getCell(0);
    const rightCell  = detailRow.getCell(1);
    leftCell.setWidth(LEFT_W);
    rightCell.setWidth(RIGHT_W);

    // --- 左セル: No. / 橋脚番号 / 所見 / （タグ） ---
    const noLine      = 'No.' + item.order_no;
    const bridgeLine  = item.bridge_number || '';
    const commentLine = item.comment_final || '（所見なし）';
    const tagLine     = item.tag_final ? '（' + item.tag_final + '）' : '';

    // 全テキストを組み立て
    const leftLines = [noLine, bridgeLine, commentLine, tagLine].filter(v => v !== '');
    const fullText  = leftLines.join('\n');
    leftCell.setText(fullText);

    const leftText = leftCell.editAsText();
    let pos = 0;

    // No.行: bold 10pt
    leftText.setFontSize(pos, pos + noLine.length - 1, 10);
    leftText.setBold(pos, pos + noLine.length - 1, true);
    pos += noLine.length + 1;

    // 橋脚番号行: bold 10pt
    if (bridgeLine) {
      leftText.setFontSize(pos, pos + bridgeLine.length - 1, 10);
      leftText.setBold(pos, pos + bridgeLine.length - 1, true);
      pos += bridgeLine.length + 1;
    }

    // 所見行: normal 9pt
    leftText.setFontSize(pos, pos + commentLine.length - 1, 9);
    leftText.setBold(pos, pos + commentLine.length - 1, false);
    pos += commentLine.length + 1;

    // タグ行: italic 8pt
    if (tagLine) {
      leftText.setFontSize(pos, pos + tagLine.length - 1, 8);
      leftText.setBold(pos, pos + tagLine.length - 1, false);
      leftText.setItalic(pos, pos + tagLine.length - 1, true);
    }

    // --- 右セル: 写真 ---
    rightCell.setText('');
    if (item.file_url) {
      try {
        const fileIdMatch = item.file_url.match(/[?&]id=([^&]+)/);
        if (fileIdMatch) {
          const driveFile = DriveApp.getFileById(fileIdMatch[1]);
          const blob      = driveFile.getBlob();
          // appendImage でセルに直接画像を挿入
          const inlineImg = rightCell.appendImage(blob);

          // 右セル幅いっぱいにリサイズ
          const maxW  = RIGHT_W * 0.95;
          const origW = inlineImg.getWidth();
          const origH = inlineImg.getHeight();
          const scale = Math.min(1, maxW / origW);
          inlineImg.setWidth(Math.floor(origW * scale));
          inlineImg.setHeight(Math.floor(origH * scale));
        }
      } catch (imgErr) {
        console.warn('写真挿入失敗: ' + item.photo_id + ' ' + imgErr.message);
        rightCell.editAsText().insertText(0, '（写真読込失敗）');
      }
    } else {
      rightCell.editAsText().insertText(0, '（写真なし）');
    }
  });

  doc.saveAndClose();

  // ---- PDF変換 ----
  const docFile = DriveApp.getFileById(doc.getId());
  const pdfBlob = docFile.getAs('application/pdf');
  pdfBlob.setName(docTitle + '.pdf');

  // 保存先フォルダ（写真と同じフォルダ）
  const folder    = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  const pdfFile   = folder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const pdfFileId = pdfFile.getId();
  const pdfUrl    = 'https://drive.google.com/file/d/' + pdfFileId + '/view';

  // 元のGoogleドキュメントは削除（不要）
  docFile.setTrashed(true);

  // ---- reports シート更新 ----
  const sheet   = getSheet(SHEETS.REPORTS);
  const headers = getHeaders(SHEETS.REPORTS);
  const values  = sheet.getDataRange().getValues();
  const hIdx    = {};
  headers.forEach((h, i) => hIdx[h] = i);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][hIdx['report_id']]) === String(reportId)) {
      sheet.getRange(i + 1, hIdx['pdf_file_id'] + 1).setValue(pdfFileId);
      sheet.getRange(i + 1, hIdx['pdf_url']     + 1).setValue(pdfUrl);
      sheet.getRange(i + 1, hIdx['report_date'] + 1).setValue(formatDateJp(new Date()));
      sheet.getRange(i + 1, hIdx['updated_at']  + 1).setValue(now());
      sheet.getRange(i + 1, hIdx['updated_by']  + 1).setValue(updatedBy);
      break;
    }
  }

  writeAuditLog({
    entity_type: 'report',
    entity_id:   reportId,
    action:      'generate_pdf',
    before_json: '',
    after_json:  JSON.stringify({ pdf_file_id: pdfFileId, pdf_url: pdfUrl }),
    actor:       updatedBy
  });

  return {
    report_id:   reportId,
    pdf_file_id: pdfFileId,
    pdf_url:     pdfUrl
  };
}

/**
 * 報告書を確定する（status → confirmed、写真 → published）
 *
 * payload:
 * {
 *   report_id:  "report_xxx",
 *   updated_by: "ui_user"
 * }
 */
function actionConfirmReport(payload) {
  const reportId  = payload.report_id  || '';
  const updatedBy = payload.updated_by || 'ui_user';

  if (!reportId) throw new Error('report_id は必須です');

  const report = findOneBy(SHEETS.REPORTS, 'report_id', reportId);
  if (!report) throw new Error('報告書が見つかりません: ' + reportId);
  if (report.status === 'confirmed') throw new Error('すでに確定済みです');
  if (!report.pdf_url) throw new Error('PDF生成が完了していません。先にPDFを生成してください');

  // report を confirmed に更新
  const rSheet   = getSheet(SHEETS.REPORTS);
  const rHeaders = getHeaders(SHEETS.REPORTS);
  const rValues  = rSheet.getDataRange().getValues();
  const rHIdx    = {};
  rHeaders.forEach((h, i) => rHIdx[h] = i);

  for (let i = 1; i < rValues.length; i++) {
    if (String(rValues[i][rHIdx['report_id']]) === String(reportId)) {
      rSheet.getRange(i + 1, rHIdx['status']     + 1).setValue('confirmed');
      rSheet.getRange(i + 1, rHIdx['updated_at'] + 1).setValue(now());
      rSheet.getRange(i + 1, rHIdx['updated_by'] + 1).setValue(updatedBy);
      break;
    }
  }

  // 対象写真を published に更新
  const items = getAllRows(SHEETS.REPORT_ITEMS)
    .filter(i => String(i.report_id) === String(reportId));

  const pSheet   = getSheet(SHEETS.PHOTOS);
  const pHeaders = getHeaders(SHEETS.PHOTOS);
  const pValues  = pSheet.getDataRange().getValues();
  const pHIdx    = {};
  pHeaders.forEach((h, i) => pHIdx[h] = i);

  const photoIdSet = new Set(items.map(i => String(i.photo_id)));
  let publishedCount = 0;

  for (let i = 1; i < pValues.length; i++) {
    const pid = String(pValues[i][pHIdx['photo_id']]);
    if (photoIdSet.has(pid)) {
      pSheet.getRange(i + 1, pHIdx['status']     + 1).setValue('published');
      pSheet.getRange(i + 1, pHIdx['updated_at'] + 1).setValue(now());
      pSheet.getRange(i + 1, pHIdx['updated_by'] + 1).setValue(updatedBy);
      publishedCount++;
    }
  }

  writeAuditLog({
    entity_type: 'report',
    entity_id:   reportId,
    action:      'confirm',
    before_json: JSON.stringify({ status: 'draft' }),
    after_json:  JSON.stringify({ status: 'confirmed', published_photos: publishedCount }),
    actor:       updatedBy
  });

  return {
    report_id:       reportId,
    status:          'confirmed',
    published_photos: publishedCount
  };
}

/**
 * ヘッダテーブルのスタイル設定
 */
function styleHeaderTable(table, pageWidth) {
  table.setBorderWidth(0);
  const row = table.getRow(0);

  // タイトルセル
  const cell0 = row.getCell(0);
  cell0.setText('高架下敷地管理（臨時対応）支援業務報告書');
  const text0 = cell0.editAsText();
  text0.setFontSize(0, cell0.getText().length - 1, 14);
  text0.setBold(0, cell0.getText().length - 1, true);

  // 会社名・報告日セル（テキストはすでにテーブル作成時に設定済み）
  const cell1 = row.getCell(1);
  const text1 = cell1.editAsText();
  if (text1.getText().length > 0) {
    text1.setFontSize(0, text1.getText().length - 1, 10);
  }
}

/**
 * 実施情報テーブルのスタイル設定
 */
function styleInfoTable(table, pageWidth) {
  table.setBorderWidth(1);

  for (let i = 0; i < table.getNumRows(); i++) {
    const row   = table.getRow(i);
    const label = row.getCell(0);
    const value = row.getCell(1);

    // ラベル列をbold
    const labelText = label.editAsText();
    if (labelText.getText().length > 0) {
      labelText.setFontSize(0, labelText.getText().length - 1, 10);
      labelText.setBold(0, labelText.getText().length - 1, true);
    }

    // 値列
    const valueText = value.editAsText();
    if (valueText.getText().length > 0) {
      valueText.setFontSize(0, valueText.getText().length - 1, 10);
    }
  }
}

/**
 * 日付を日本語形式にフォーマット
 * @param {*} value
 * @returns {string}
 */
function formatDateJp(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y + '/' + String(m).padStart(2, '0') + '/' + String(day).padStart(2, '0');
}

/**
 * STEP11/12 動作確認
 * 既存のpinから報告書を1件作成してPDFを生成する
 */
function testStep11And12() {
  // 有効なpinを取得
  const pins = getAllRows(SHEETS.PINS).filter(p => !p.deleted_at && p.pin_lat);
  if (!pins.length) throw new Error('有効なpinがありません');

  const testPin = pins[0];
  Logger.log('テスト対象pin: ' + JSON.stringify(testPin));

  // 報告書作成
  const result = actionCreateReport({
    execution_date:   '2026-02-18',
    execution_place:  '6号向島線高架下（堤通出入口付近）',
    report_type:      '臨時点検',
    work_content:     '・不法投棄の状況確認と回収',
    selected_pin_ids: [testPin.pin_id],
    created_by:       'koji'
  });

  Logger.log('報告書作成: ' + JSON.stringify(result));

  // PDF生成
  const pdfResult = actionGenerateReportPdf({
    report_id:  result.report.report_id,
    updated_by: 'koji'
  });

  Logger.log('PDF生成: ' + JSON.stringify(pdfResult));
  Logger.log('PDF URL: ' + pdfResult.pdf_url);
}

/**
 * Web UI 用ラッパー（PDF生成・確定）
 */
function apiGenerateReportPdfFromUi(reportId) {
  return actionGenerateReportPdf({ report_id: reportId, updated_by: 'ui_user' });
}

function apiConfirmReportFromUi(reportId) {
  return actionConfirmReport({ report_id: reportId, updated_by: 'ui_user' });
}

/**
 * 選択されたpinからレポートヘッダの提案値を返す
 * 実施場所と内容はOpenAI APIで生成する
 *
 * @param {string[]} pinIds
 * @returns {Object}
 */
function apiSuggestReportHeaderFromUi(pinIds) {
  if (!Array.isArray(pinIds) || !pinIds.length) {
    return { execution_date: '', execution_place: '', work_content: '' };
  }

  const allPhotos = getAllRows(SHEETS.PHOTOS).filter(p =>
    !p.deleted_at && p.pin_id && pinIds.includes(String(p.pin_id))
  );

  const allPins = getAllRows(SHEETS.PINS);
  const pinMap  = {};
  allPins.forEach(p => { pinMap[String(p.pin_id)] = p; });

  // 実施日: taken_at の最大値
  const takenAts = allPhotos
    .map(p => String(p.taken_at || '').trim())
    .filter(v => v);
  takenAts.sort();
  const maxTakenAt = takenAts.length ? takenAts[takenAts.length - 1] : '';

  let executionDate = '';
  if (maxTakenAt) {
    const d = new Date(maxTakenAt);
    if (!isNaN(d.getTime())) {
      const y   = d.getFullYear();
      const m   = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      executionDate = y + '-' + m + '-' + day;
    }
  }

  // 橋脚番号と所見を収集
  const bridgeNumbers = [];
  pinIds.forEach(pid => {
    const pin = pinMap[pid];
    if (pin && pin.bridge_number && !bridgeNumbers.includes(pin.bridge_number)) {
      bridgeNumbers.push(pin.bridge_number);
    }
  });

  const comments = [];
  allPhotos.forEach(p => {
    const c = String(p.comment_final || '').trim();
    if (c && !comments.includes(c)) comments.push(c);
  });

  // OpenAI API で実施場所と内容を生成
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  let executionPlace = bridgeNumbers.join('、') + ' 高架下';
  let workContent    = comments.map(c => '・' + c).join('\n');

  if (OPENAI_API_KEY && comments.length > 0) {
    try {
      const prompt =
        'あなたは橋梁点検の報告書作成を支援するアシスタントです。\n' +
        '以下の情報をもとに、報告書の「実施場所」と「内容」を日本語で作成してください。\n\n' +
        '【橋脚番号】\n' + (bridgeNumbers.length ? bridgeNumbers.join('、') : '不明') + '\n\n' +
        '【写真ごとの所見】\n' + comments.map((c, i) => (i + 1) + '. ' + c).join('\n') + '\n\n' +
        '以下のJSON形式のみで返してください（前後の説明不要）:\n' +
        '{\n' +
        '  "execution_place": "実施場所の文字列（例: 6号向島線高架下（堤通出入口付近））",\n' +
        '  "work_content": "内容の文字列（箇条書き、改行は改行文字で）"\n' +
        '}';

      const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + OPENAI_API_KEY },
        payload: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 300
        }),
        muteHttpExceptions: true
      });

      const json = JSON.parse(response.getContentText());
      const text = json.choices && json.choices[0]
        ? json.choices[0].message.content.trim()
        : '';

      // JSON部分だけ抽出してパース
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.execution_place) executionPlace = parsed.execution_place;
        if (parsed.work_content)    workContent    = parsed.work_content;
      }
    } catch (aiErr) {
      console.warn('OpenAI API 呼び出し失敗、フォールバック値を使用: ' + aiErr.message);
    }
  }

  return {
    execution_date:  executionDate,
    execution_place: executionPlace,
    work_content:    workContent
  };
}

/**
 * Web UI 用ラッパー（PDF生成・確定）
 */
function apiGenerateReportPdfFromUi(reportId) {
  return actionGenerateReportPdf({ report_id: reportId, updated_by: 'ui_user' });
}

function apiConfirmReportFromUi(reportId) {
  return actionConfirmReport({ report_id: reportId, updated_by: 'ui_user' });
}

/**
 * 報告書ヘッダを更新（draft のみ）
 */
function apiUpdateReportFromUi(payload) {
  const reportId = payload.report_id || '';
  if (!reportId) throw new Error('report_id は必須です');

  const report = findOneBy(SHEETS.REPORTS, 'report_id', reportId);
  if (!report) throw new Error('報告書が見つかりません: ' + reportId);
  if (report.status === 'confirmed') throw new Error('確定済みの報告書は編集できません');

  const sheet   = getSheet(SHEETS.REPORTS);
  const headers = getHeaders(SHEETS.REPORTS);
  const values  = sheet.getDataRange().getValues();
  const hIdx    = {};
  headers.forEach((h, i) => hIdx[h] = i);

  const updatedBy = payload.updated_by || 'ui_user';

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][hIdx['report_id']]) === String(reportId)) {
      const fields = ['report_name','execution_date','execution_place','report_type','work_content'];
      fields.forEach(f => {
        if (Object.prototype.hasOwnProperty.call(payload, f)) {
          sheet.getRange(i + 1, hIdx[f] + 1).setValue(payload[f]);
        }
      });
      sheet.getRange(i + 1, hIdx['updated_at'] + 1).setValue(now());
      sheet.getRange(i + 1, hIdx['updated_by'] + 1).setValue(updatedBy);
      break;
    }
  }

  writeAuditLog({
    entity_type: 'report',
    entity_id:   reportId,
    action:      'update',
    before_json: JSON.stringify(report),
    after_json:  JSON.stringify(payload),
    actor:       updatedBy
  });

  return { report_id: reportId, ok: true };
}
