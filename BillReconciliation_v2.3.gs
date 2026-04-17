/**
 * ============================================================
 *  HỆ THỐNG ĐỐI SOÁT BILL CHUYỂN KHOẢN
 *  Bill Reconciliation System — Google Apps Script v2.3
 *
 *  Pipeline:
 *    Bước 1 — Cloud Vision API  : OCR ảnh → raw text
 *    Bước 2 — Gemini AI         : parse raw text → tên HS + số tiền (JSON)
 *    Bước 3 — Fuzzy match       : xác nhận tên với danh sách HS trong sheet
 *    Bước 4 — Ghi sheet         : điền số tiền vào đúng dòng
 *
 *  Cấu hình (sheet "Cấu hình"):
 *    A1 = "cloud-vision"           Vision provider
 *    B1 = Service Account JSON     Cloud Vision auth (paste nội dung file .json)
 *    C1 = Gemini model             vd: gemini-2.0-flash
 *    D1 = Gemini API Key           aistudio.google.com → Get API Key
 *    A3:B... = Tên sheet | Folder Drive ID
 * ============================================================
 */

// ─── CONSTANTS ───────────────────────────────────────────────
const CONFIG_SHEET_NAME = 'Cấu hình';
const STUDENT_COL       = 4;    // Cột D — Họ và tên học sinh
const AMOUNT_COL        = 44;   // Cột AR — Tiền đã đóng
const DATA_START_ROW    = 3;    // Dữ liệu học sinh bắt đầu từ dòng 3
const MIN_CONFIDENCE    = 0.7;  // Ngưỡng confidence tối thiểu
const DONE_PREFIX       = '[DONE] ';
const DONE_SUBFOLDER    = 'Done';

// ─── MENU ────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏦 Đối Soát Bill')
    .addItem('📤 Tải ảnh & Đối soát',        'showUploadDialog')
    .addItem('📁 Quét Folder Drive',           'processFromFolder')
    .addSeparator()
    .addItem('🔧 Kiểm tra cấu hình',          'testConfig')
    .addItem('🔑 Test OAuth2 Token',           'testServiceAccountToken')
    .addItem('🤖 Test Gemini API',             'testGeminiConnection')
    .addItem('👥 Kiểm tra danh sách HS',       'testGetStudents')
    .addItem('📂 Kiểm tra kết nối Folder',     'testFolderAccess')
    .addItem('🔍 Debug OCR + AI ảnh đầu tiên', 'testOCRDebug')
    .addSeparator()
    .addItem('❓ Hướng dẫn sử dụng',          'showHelp')
    .addToUi();
}

// ─── UPLOAD FROM LOCAL MACHINE ───────────────────────────────

function showUploadDialog() {
  const html = HtmlService.createHtmlOutput(getUploadDialogHTML())
    .setWidth(560).setHeight(640)
    .setTitle('📤 Tải ảnh bill & Đối soát');
  SpreadsheetApp.getUi().showModalDialog(html, '📤 Tải ảnh bill & Đối soát');
}

/**
 * Xử lý MỘT file từ dialog HTML.
 * Dialog gọi tuần tự từng file → tránh giới hạn payload của google.script.run.
 *
 * @param {Object} fileData  {name, mimeType, base64}
 * @returns {string}         Kết quả xử lý hiển thị trong log
 */
function handleUploadSingle(fileData) {
  try {
    const sheet     = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const sheetName = sheet.getName();
    Logger.log(`[handleUploadSingle] File: "${fileData.name}" | Sheet: "${sheetName}"`);

    if (!fileData || !fileData.base64) return `❌ "${fileData.name}": Không nhận được dữ liệu.`;

    const folderId = getFolderIdForSheet(sheetName);
    if (!folderId) return `❌ Không tìm thấy Folder ID cho sheet "${sheetName}". Kiểm tra sheet Cấu hình.`;

    let folder;
    try { folder = DriveApp.getFolderById(folderId); }
    catch (e) { return `❌ Không truy cập được Folder: ${e.message}`; }

    const cfg = getConfig();
    if (!cfg.visionJson) return '❌ Chưa điền Service Account JSON vào ô B1.';
    if (!cfg.geminiKey)  return '❌ Chưa điền Gemini API Key vào ô D1.';

    const bytes     = Utilities.base64Decode(fileData.base64);
    deleteExistingFiles(folder, fileData.name);
    const driveFile = folder.createFile(Utilities.newBlob(bytes, fileData.mimeType, fileData.name));
    Logger.log(`[handleUploadSingle] Uploaded → ${driveFile.getId()}`);

    return processImage(Utilities.base64Encode(bytes), fileData.mimeType, sheet, driveFile, cfg);

  } catch (e) {
    Logger.log(`[handleUploadSingle] ❌ ${e.message}\n${e.stack || ''}`);
    return `❌ "${fileData ? fileData.name : '?'}": ${e.message}`;
  }
}

/**
 * Xóa file trùng tên trong folder chính và /Done (bỏ prefix [DONE] khi so sánh).
 */
function deleteExistingFiles(folder, fileName) {
  const base = fileName.replace(/^\[DONE\]\s*/i, '').trim();
  function sweep(iter) {
    while (iter.hasNext()) {
      const f = iter.next();
      if (f.getName().replace(/^\[DONE\]\s*/i, '').trim() === base) {
        Logger.log(`[deleteExistingFiles] Xóa: "${f.getName()}"`);
        f.setTrashed(true);
      }
    }
  }
  sweep(folder.getFiles());
  const df = folder.getFoldersByName(DONE_SUBFOLDER);
  if (df.hasNext()) sweep(df.next().getFiles());
}

// ─── SCAN FROM DRIVE FOLDER ──────────────────────────────────

function processFromFolder() {
  const sheet     = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const sheetName = sheet.getName();
  const folderId  = getFolderIdForSheet(sheetName);

  if (!folderId) { SpreadsheetApp.getUi().alert(`❌ Không tìm thấy Folder ID cho sheet "${sheetName}".`); return; }

  const cfg = getConfig();
  if (!cfg.visionJson) { SpreadsheetApp.getUi().alert('❌ Chưa điền Service Account JSON vào ô B1.'); return; }
  if (!cfg.geminiKey)  { SpreadsheetApp.getUi().alert('❌ Chưa điền Gemini API Key vào ô D1.'); return; }

  const images = getImagesFromFolder(DriveApp.getFolderById(folderId));
  if (images.length === 0) { SpreadsheetApp.getUi().alert('📂 Không có ảnh nào chờ xử lý.'); return; }

  const logs = images.map(({ file, base64, mimeType }) =>
    processImage(base64, mimeType, sheet, file, cfg)
  );

  SpreadsheetApp.getUi().alert(`✅ Hoàn tất ${images.length} ảnh!\n\n${logs.join('\n')}`);
}

// ─── CORE PIPELINE ────────────────────────────────────────────

/**
 * Pipeline chính — 4 bước:
 *
 *   Bước 1: Cloud Vision OCR  → raw text
 *   Bước 2: Gemini AI parse   → {studentName, amount, confidence}
 *   Bước 3: Fuzzy match       → xác nhận tên trong danh sách sheet
 *   Bước 4: Ghi sheet         → điền tiền, rename file → /Done
 *
 * @param {string} base64     Ảnh base64
 * @param {string} mimeType   MIME type ảnh
 * @param {Sheet}  sheet      Sheet dữ liệu đang active
 * @param {File}   driveFile  File trên Drive (để rename/move sau khi xử lý)
 * @param {Object} cfg        Cấu hình {visionJson, geminiModel, geminiKey}
 * @returns {string}          Thông báo kết quả
 */
function processImage(base64, mimeType, sheet, driveFile, cfg) {
  const fileName = driveFile ? driveFile.getName() : 'unknown';
  Logger.log(`\n${'─'.repeat(50)}\n[processImage] "${fileName}"`);

  const students = getStudentList(sheet);
  if (students.length === 0) return `❌ "${fileName}": Danh sách học sinh trống.`;

  // ── Bước 1: Cloud Vision OCR ──────────────────────────────
  Logger.log('[processImage] Bước 1: Cloud Vision OCR...');
  const ocrResult = runCloudVisionOCR(base64, cfg.visionJson);
  if (ocrResult.error) return `❌ "${fileName}": [OCR] ${ocrResult.error}`;
  Logger.log(`[processImage] OCR: ${ocrResult.text.length} ký tự`);

  // ── Bước 2: Gemini AI parse ────────────────────────────────
  Logger.log('[processImage] Bước 2: Gemini AI parse...');
  const parsed = parseWithGemini(ocrResult.text, students, cfg.geminiModel, cfg.geminiKey);
  if (parsed.error) return `❌ "${fileName}": [Gemini] ${parsed.error}`;
  Logger.log(`[processImage] Gemini → name="${parsed.studentName}" amount=${parsed.amount} conf=${parsed.confidence}`);

  // ── Bước 3: Fuzzy match ────────────────────────────────────
  Logger.log('[processImage] Bước 3: Fuzzy match...');
  const match = fuzzyMatchStudent(parsed.studentName, students);
  Logger.log(`[processImage] Match: "${match.name}" score=${match.confidence} (${match.reason})`);

  if (!match.name)
    return `❌ "${fileName}": Không khớp HS (Gemini: "${parsed.studentName || 'null'}" | ${match.reason}).`;

  if (match.confidence < MIN_CONFIDENCE)
    return `❌ "${fileName}": Confidence ${match.confidence} < ${MIN_CONFIDENCE}.`;

  if (!parsed.amount || parsed.amount <= 0 || isNaN(parsed.amount))
    return `❌ "${fileName}": Số tiền không hợp lệ (${parsed.amount}).`;

  // ── Bước 4: Ghi sheet ─────────────────────────────────────
  const row = findStudentRow(sheet, match.name);
  if (!row) return `❌ "${fileName}": Không tìm thấy "${match.name}" trong sheet.`;

  const cell = sheet.getRange(row, AMOUNT_COL);
  if (cell.getValue() !== '' && cell.getValue() !== 0)
    return `⚠️ "${fileName}": Ô đã có dữ liệu (${formatCurrency(cell.getValue())}) — bỏ qua.`;

  cell.setValue(parsed.amount);
  Logger.log(`[processImage] ✅ Ghi ${parsed.amount} → row ${row} (${match.name})`);

  if (driveFile) {
    try {
      const doneFolder = getOrCreateSubFolder(driveFile.getParents().next(), DONE_SUBFOLDER);
      const newName    = DONE_PREFIX + driveFile.getName().replace(/^\[DONE\]\s*/i, '');
      driveFile.setName(newName);
      driveFile.moveTo(doneFolder);
      Logger.log(`[processImage] File → /Done: "${newName}"`);
    } catch (e) {
      Logger.log(`[processImage] Không move file: ${e.message}`);
    }
  }

  return `✅ "${fileName}": ${match.name} — ${formatCurrency(parsed.amount)}`;
}

// ─── CONFIG ──────────────────────────────────────────────────

/**
 * Đọc cấu hình từ sheet "Cấu hình":
 *   A1 = Vision provider ("cloud-vision")
 *   B1 = Service Account JSON (Cloud Vision)
 *   C1 = Gemini model
 *   D1 = Gemini API Key
 *   A3:B... = Tên sheet | Folder ID
 */
function getConfig() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!cfg) return {};
  const visionProvider = cfg.getRange('A1').getValue().toString().trim();
  const visionJson     = cfg.getRange('B1').getValue().toString().trim();
  const geminiModel    = cfg.getRange('C1').getValue().toString().trim() || 'gemini-2.0-flash';
  const geminiKey      = cfg.getRange('D1').getValue().toString().trim();
  Logger.log(`[getConfig] provider="${visionProvider}" geminiModel="${geminiModel}" key[0:12]="${geminiKey.substring(0,12)}..."`);
  return { visionProvider, visionJson, geminiModel, geminiKey };
}

function getFolderIdForSheet(sheetName) {
  const cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET_NAME);
  if (!cfg) return null;
  const data = cfg.getRange('A3:B50').getValues();
  for (const row of data) {
    if (row[0].toString().trim() === sheetName) return row[1].toString().trim();
  }
  return null;
}

// ─── BƯỚC 1: CLOUD VISION OCR ────────────────────────────────

/**
 * Gọi Google Cloud Vision API (TEXT_DETECTION) để lấy raw text từ ảnh.
 * Auth: Service Account JSON → OAuth2 JWT Bearer token.
 *
 * @param {string} base64            Ảnh dạng base64
 * @param {string} serviceAccountJson  Nội dung file .json Service Account
 * @returns {{text: string}|{error: string}}
 */
function runCloudVisionOCR(base64, serviceAccountJson) {
  let token;
  try {
    token = getServiceAccountToken(serviceAccountJson, 'https://www.googleapis.com/auth/cloud-vision');
  } catch (e) {
    return { error: `Auth: ${e.message}` };
  }

  try {
    const resp = UrlFetchApp.fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'post', contentType: 'application/json',
      headers: { 'Authorization': `Bearer ${token}` },
      payload: JSON.stringify({
        requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }]
      }),
      muteHttpExceptions: true
    });
    const code = resp.getResponseCode();
    if (code !== 200) return { error: `HTTP ${code}: ${resp.getContentText().substring(0, 150)}` };
    const text = JSON.parse(resp.getContentText()).responses?.[0]?.fullTextAnnotation?.text || '';
    if (!text) return { error: 'Không đọc được text (ảnh mờ hoặc không có chữ).' };
    return { text };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── OAUTH2 — SERVICE ACCOUNT JWT ────────────────────────────

/**
 * Lấy OAuth2 Access Token từ Service Account JSON (JWT flow).
 * Không cần thư viện ngoài — dùng Utilities.computeRsaSha256Signature() built-in GAS.
 */
function getServiceAccountToken(serviceAccountJson, scope) {
  let sa;
  try { sa = JSON.parse(serviceAccountJson); }
  catch (e) { throw new Error(`JSON không hợp lệ: ${e.message}`); }
  if (!sa.private_key || !sa.client_email)
    throw new Error('JSON thiếu "private_key" hoặc "client_email"');

  const now = Math.floor(Date.now() / 1000);
  const hB64 = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=+$/, '');
  const pB64 = Utilities.base64EncodeWebSafe(JSON.stringify({
    iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  })).replace(/=+$/, '');
  const sig  = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(`${hB64}.${pB64}`, sa.private_key)
  ).replace(/=+$/, '');

  const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post', contentType: 'application/x-www-form-urlencoded',
    payload: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${hB64}.${pB64}.${sig}`,
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code !== 200) throw new Error(`OAuth2 HTTP ${code}: ${resp.getContentText().substring(0, 200)}`);
  const json = JSON.parse(resp.getContentText());
  if (!json.access_token) throw new Error(`Không có access_token: ${JSON.stringify(json).substring(0, 150)}`);
  Logger.log(`[getServiceAccountToken] ✅ OK (expires_in=${json.expires_in}s)`);
  return json.access_token;
}

// ─── BƯỚC 2: GEMINI AI PARSE ─────────────────────────────────

/**
 * Gọi Gemini để parse raw OCR text → tên học sinh + số tiền.
 *
 * AI nhận vào:
 *   - Toàn bộ raw text OCR (không filter trước)
 *   - Danh sách tên học sinh
 *
 * AI tự động:
 *   - Tìm phần Nội dung / Lời nhắn / Memo trong bill
 *   - Tách tên khỏi thông tin thừa (ngày sinh, lớp, ghi chú)
 *   - Match tên với danh sách (bỏ dấu, sai chính tả nhẹ)
 *   - Trích xuất số tiền
 *
 * @param {string} rawText     Raw OCR text từ Cloud Vision
 * @param {Array}  students    [{name, normalized, row}]
 * @param {string} model       Gemini model
 * @param {string} apiKey      Gemini API Key (ô D1)
 * @returns {{studentName, amount, confidence, extractedName}|{error}}
 */
function parseWithGemini(rawText, students, model, apiKey) {
  const studentList = students.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
  const prompt      = buildGeminiPrompt(rawText, studentList);
  const url         = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    Logger.log(`[parseWithGemini] Gọi model="${model}"...`);
    const resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
      }),
      muteHttpExceptions: true
    });
    const code = resp.getResponseCode();
    if (code !== 200) return { error: `Gemini HTTP ${code}: ${resp.getContentText().substring(0, 200)}` };
    const aiText = JSON.parse(resp.getContentText()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    Logger.log(`[parseWithGemini] AI response: ${aiText}`);
    return parseGeminiResponse(aiText);
  } catch (e) {
    return { error: `Exception: ${e.message}` };
  }
}

/**
 * Prompt cho Gemini — cung cấp raw OCR text + danh sách HS.
 */
function buildGeminiPrompt(rawText, studentListText) {
  return `Bạn là hệ thống đối soát bill chuyển khoản học phí trường học Việt Nam.

Nhiệm vụ: Đọc raw text OCR từ ảnh bill ngân hàng, tìm tên học sinh và số tiền.

=== RAW OCR TEXT ===
${rawText}
=== HẾT OCR TEXT ===

=== DANH SÁCH HỌC SINH ===
${studentListText}
=== HẾT DANH SÁCH ===

Hướng dẫn:
1. Tìm phần "Nội dung" / "Lời nhắn" / "Memo" / "Ghi chú" / "ND" trong bill.
   Đây là nơi phụ huynh ghi tên con khi chuyển khoản.
   Ví dụ OCR: "Lời nhắn\\nNguyen Minh Duc 11.09.2009 Lop 11A2 Tien an T04"
   → Tên học sinh là "Nguyen Minh Duc" (bỏ ngày sinh, lớp, ghi chú phía sau)

2. Match tên vừa tìm được với DANH SÁCH HỌC SINH.
   Chú ý: tên trong bill thường không có dấu tiếng Việt.
   Ví dụ: "Nguyen Minh Duc" → "NGUYỄN MINH ĐỨC"

3. Tìm số tiền chuyển khoản (số lớn nhất, đơn vị VND).

Trả về JSON (KHÔNG thêm text khác, KHÔNG dùng markdown backtick):
{
  "matched_name": "TÊN ĐẦY ĐỦ chính xác trong danh sách hoặc null",
  "extracted_name": "tên đọc được từ phần nội dung bill",
  "amount": 990000,
  "confidence": 0.95,
  "reason": "giải thích ngắn"
}

Quy tắc:
- matched_name: copy nguyên văn từ danh sách (kể cả dấu tiếng Việt). null nếu không chắc.
- amount: số nguyên dương, không dấu phẩy, không đơn vị.
- confidence: 0.0–1.0.`;
}

/**
 * Parse JSON từ Gemini response.
 */
function parseGeminiResponse(text) {
  if (!text) return { error: 'Gemini trả về rỗng' };
  try {
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
    if (s === -1 || e === -1) return { error: `Không có JSON: ${clean.substring(0, 100)}` };
    const obj = JSON.parse(clean.substring(s, e + 1));
    if (!('matched_name' in obj && 'amount' in obj)) return { error: 'JSON thiếu trường' };
    return {
      studentName:   obj.matched_name || null,
      extractedName: obj.extracted_name || '',
      amount:        obj.amount ? parseInt(String(obj.amount).replace(/[^0-9]/g, ''), 10) : null,
      confidence:    Number(obj.confidence) || 0,
      reason:        obj.reason || ''
    };
  } catch (e) {
    return { error: `Parse lỗi: ${e.message} | raw: ${text.substring(0, 100)}` };
  }
}

// ─── BƯỚC 3: FUZZY MATCH ─────────────────────────────────────

/**
 * Xác nhận tên từ Gemini với danh sách HS (normalize cả 2 phía).
 * Gemini thường đã trả matched_name chính xác, bước này là safety check.
 */
function fuzzyMatchStudent(name, students) {
  if (!name) return { name: null, confidence: 0, reason: 'Tên rỗng' };
  const normN  = normalize(name);
  const wordsN = normN.split(' ').filter(Boolean);
  const hits   = [];

  for (const s of students) {
    const normS  = s.normalized;
    const wordsS = normS.split(' ').filter(Boolean);
    if (normS === normN)                                                               { hits.push({ s, score: 1.0,  type: 'exact'     }); continue; }
    if (wordsS.length >= 2 && wordsS.every(w => wordsN.includes(w)))                  { hits.push({ s, score: 0.9,  type: 'subset'    }); continue; }
    if (wordsN.length >= 2 && wordsN.every(w => wordsS.includes(w)))                  { hits.push({ s, score: 0.85, type: 'superset'  }); continue; }
    if (normN.length >= 6 && (normS.includes(normN) || normN.includes(normS)))        { hits.push({ s, score: 0.8,  type: 'includes'  }); }
  }

  if (hits.length === 0) return { name: null, confidence: 0, reason: `Không khớp: "${name}"` };
  if (hits.length === 1) {
    Logger.log(`[fuzzyMatchStudent] ✅ (${hits[0].type}) "${hits[0].s.name}" ${hits[0].score}`);
    return { name: hits[0].s.name, confidence: hits[0].score, reason: hits[0].type };
  }
  const exact = hits.filter(h => h.type === 'exact');
  if (exact.length === 1) return { name: exact[0].s.name, confidence: 1.0, reason: 'exact unique' };
  return { name: null, confidence: 0, reason: `Mơ hồ: ${hits.map(h => h.s.name).join(', ')}` };
}

// ─── SHEET OPERATIONS ─────────────────────────────────────────

function getStudentList(sheet) {
  const last = sheet.getLastRow();
  if (last < DATA_START_ROW) return [];
  const vals = sheet.getRange(DATA_START_ROW, STUDENT_COL, last - DATA_START_ROW + 1, 1).getValues();
  const out  = [];
  vals.forEach((r, i) => { const n = r[0].toString().trim(); if (n) out.push({ name: n, normalized: normalize(n), row: DATA_START_ROW + i }); });
  Logger.log(`[getStudentList] ${out.length} HS`);
  return out;
}

function findStudentRow(sheet, matchedName) {
  const norm = normalize(matchedName);
  for (const s of getStudentList(sheet)) {
    if (s.normalized === norm) { Logger.log(`[findStudentRow] "${s.name}" row ${s.row}`); return s.row; }
  }
  return null;
}

// ─── DRIVE HELPERS ────────────────────────────────────────────

function getOrCreateSubFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function getImagesFromFolder(folder) {
  const types = ['image/jpeg','image/png','image/gif','image/webp','image/bmp'];
  const out   = [];
  const it    = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getName().startsWith(DONE_PREFIX) || !types.includes(f.getMimeType())) continue;
    try { out.push({ file: f, base64: Utilities.base64Encode(f.getBlob().getBytes()), mimeType: f.getMimeType() }); }
    catch (e) { Logger.log(`[getImagesFromFolder] Lỗi "${f.getName()}": ${e.message}`); }
  }
  Logger.log(`[getImagesFromFolder] ${out.length} ảnh chờ xử lý`);
  return out;
}

// ─── UTILITY ─────────────────────────────────────────────────

function normalize(str) {
  if (!str) return '';
  const map = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
    'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a','è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e','ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o','ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u','ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y','đ':'d',
    'À':'a','Á':'a','Ả':'a','Ã':'a','Ạ':'a','Ă':'a','Ằ':'a','Ắ':'a','Ẳ':'a','Ẵ':'a','Ặ':'a',
    'Â':'a','Ầ':'a','Ấ':'a','Ẩ':'a','Ẫ':'a','Ậ':'a','È':'e','É':'e','Ẻ':'e','Ẽ':'e','Ẹ':'e',
    'Ê':'e','Ề':'e','Ế':'e','Ể':'e','Ễ':'e','Ệ':'e','Ì':'i','Í':'i','Ỉ':'i','Ĩ':'i','Ị':'i',
    'Ò':'o','Ó':'o','Ỏ':'o','Õ':'o','Ọ':'o','Ô':'o','Ồ':'o','Ố':'o','Ổ':'o','Ỗ':'o','Ộ':'o',
    'Ơ':'o','Ờ':'o','Ớ':'o','Ở':'o','Ỡ':'o','Ợ':'o','Ù':'u','Ú':'u','Ủ':'u','Ũ':'u','Ụ':'u',
    'Ư':'u','Ừ':'u','Ứ':'u','Ử':'u','Ữ':'u','Ự':'u','Ỳ':'y','Ý':'y','Ỷ':'y','Ỹ':'y','Ỵ':'y','Đ':'d'
  };
  return str.toLowerCase().split('').map(c => map[c]||c).join('')
    .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
}

function formatCurrency(n) { return n ? Number(n).toLocaleString('vi-VN') + 'đ' : '0đ'; }

// ─── DIALOG HTML ──────────────────────────────────────────────

function getUploadDialogHTML() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;font-size:14px;color:#333;background:#f9f9f9;padding:16px}
  h3{color:#1a73e8;margin-bottom:10px;font-size:16px}
  .badge{background:#e8f0fe;color:#1a73e8;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;margin-left:6px}
  .pipeline{background:#f0f4ff;border:1px solid #c5d8ff;border-radius:8px;padding:9px 12px;margin-bottom:12px;font-size:12px;color:#444;line-height:1.7}
  .pipeline b{color:#1a73e8}
  #dropzone{border:2px dashed #1a73e8;border-radius:10px;padding:24px 16px;text-align:center;
    cursor:pointer;background:#fff;margin-bottom:12px;transition:background .2s}
  #dropzone.hover{background:#e8f0fe}
  #dropzone p{color:#888;margin-top:6px;font-size:12px}
  #fileInput{display:none}
  #fileList{margin-bottom:12px;max-height:100px;overflow-y:auto}
  .fi{background:#e8f0fe;border-radius:6px;padding:4px 10px;margin-bottom:4px;font-size:12px;
      display:flex;justify-content:space-between;align-items:center}
  .rm{cursor:pointer;color:#d93025;font-weight:bold;padding:0 4px}
  #btnRun{width:100%;padding:11px;background:#1a73e8;color:#fff;border:none;border-radius:8px;
    font-size:15px;font-weight:600;cursor:pointer;margin-bottom:8px}
  #btnRun:disabled{background:#aaa;cursor:not-allowed}
  #prog{font-size:12px;color:#555;margin-bottom:6px;display:none}
  #log{background:#0d1117;color:#58d68d;padding:10px;border-radius:8px;font-size:12px;
    font-family:monospace;min-height:80px;max-height:240px;overflow-y:auto;white-space:pre-wrap;display:none}
  .step{color:#85c1e9}.ok{color:#58d68d}.err{color:#ec7063}.warn{color:#f9e79f}
  .sp{display:inline-block;animation:spin 1s linear infinite;margin-right:6px}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<h3>📤 Đối soát bill <span class="badge">v2.3</span></h3>
<div class="pipeline">
  <b>Bước 1</b> Cloud Vision → OCR text &nbsp;▶&nbsp;
  <b>Bước 2</b> Gemini AI → parse tên + tiền &nbsp;▶&nbsp;
  <b>Bước 3</b> Fuzzy match &nbsp;▶&nbsp;
  <b>Bước 4</b> Ghi sheet
</div>

<div id="dropzone" onclick="document.getElementById('fileInput').click()"
     ondragover="event.preventDefault();this.classList.add('hover')"
     ondragleave="this.classList.remove('hover')"
     ondrop="handleDrop(event)">
  📂 <strong>Kéo & thả ảnh vào đây</strong>
  <p>hoặc click để chọn · JPG, PNG, WEBP · Nhiều file</p>
</div>
<input type="file" id="fileInput" accept="image/*" multiple onchange="addFiles(this.files)">
<div id="fileList"></div>
<button id="btnRun" onclick="runProcess()" disabled>🚀 Bắt đầu đối soát</button>
<div id="prog"></div>
<div id="log"></div>

<script>
  const files=[];
  function handleDrop(e){e.preventDefault();document.getElementById('dropzone').classList.remove('hover');addFiles(e.dataTransfer.files)}
  function addFiles(fl){Array.from(fl).forEach(f=>{if(!files.find(x=>x.name===f.name))files.push(f)});renderList()}
  function removeFile(n){const i=files.findIndex(f=>f.name===n);if(i>-1)files.splice(i,1);renderList()}
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function renderList(){
    document.getElementById('fileList').innerHTML=files.map(f=>
      '<div class="fi"><span>🖼️ '+esc(f.name)+' <small style="color:#999">('+Math.round(f.size/1024)+' KB)</small></span>'+
      '<span class="rm" onclick="removeFile('+JSON.stringify(f.name)+')">✕</span></div>'
    ).join('');
    document.getElementById('btnRun').disabled=files.length===0;
  }
  function log(m,cls){
    const el=document.getElementById('log');
    el.style.display='block';
    if(cls){el.innerHTML+='<span class="'+cls+'">'+m.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</span>\\n';}
    else{el.textContent+=m+'\\n';}
    el.scrollTop=el.scrollHeight;
  }
  function setP(c,t){const el=document.getElementById('prog');el.style.display='block';el.textContent='⏳ Đang xử lý: '+c+' / '+t+'...'}
  function readB64(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res({name:f.name,mimeType:f.type,base64:e.target.result.split(',')[1]});r.onerror=()=>rej(new Error('Không đọc được: '+f.name));r.readAsDataURL(f)})}

  async function runProcess(){
    if(!files.length)return;
    document.getElementById('btnRun').disabled=true;
    document.getElementById('btnRun').innerHTML='<span class="sp">⏳</span> Đang xử lý...';
    log('Bắt đầu: '+files.length+' ảnh — pipeline 4 bước\\n','step');
    let done=0;
    for(const file of files){
      setP(done+1,files.length);
      log('▶ '+file.name,'step');
      try{
        const fd=await readB64(file);
        const result=await new Promise((res,rej)=>{
          google.script.run
            .withSuccessHandler(res)
            .withFailureHandler(e=>rej(new Error(e.message||String(e))))
            .handleUploadSingle(fd);
        });
        const cls=result.startsWith('✅')?'ok':result.startsWith('⚠️')?'warn':'err';
        log(result,cls);
      }catch(e){log('❌ '+file.name+': '+e.message,'err')}
      done++;log('');
    }
    document.getElementById('prog').textContent='✅ Xong '+done+'/'+files.length+' ảnh';
    document.getElementById('btnRun').innerHTML='✅ Hoàn tất!';
    log('─── XONG ───','step');
  }
</script>
</body>
</html>`;
}

// ─── DEBUG / TEST ─────────────────────────────────────────────

function testConfig() {
  const cfg      = getConfig();
  const sheet    = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const folderId = getFolderIdForSheet(sheet.getName());
  let vSt = '❌ Chưa điền (B1)';
  if (cfg.visionJson) {
    try { JSON.parse(cfg.visionJson); vSt = '✅ JSON hợp lệ'; }
    catch (e) { vSt = `⚠️ JSON lỗi: ${e.message.substring(0,40)}`; }
  }
  SpreadsheetApp.getUi().alert(
    `Sheet: ${sheet.getName()}\n` +
    `[A1] Vision provider: ${cfg.visionProvider || '(trống)'}\n` +
    `[B1] Cloud Vision JSON: ${vSt}\n` +
    `[C1] Gemini model: ${cfg.geminiModel}\n` +
    `[D1] Gemini API Key: ${cfg.geminiKey ? '✅ Có' : '❌ Chưa điền'}\n` +
    `Folder ID: ${folderId || '❌ Không tìm thấy'}`
  );
}

function testServiceAccountToken() {
  const cfg = getConfig();
  if (!cfg.visionJson) { SpreadsheetApp.getUi().alert('❌ B1 trống'); return; }
  try {
    const t = getServiceAccountToken(cfg.visionJson, 'https://www.googleapis.com/auth/cloud-vision');
    SpreadsheetApp.getUi().alert(`✅ OAuth2 Token OK!\n${t.substring(0,40)}...`);
  } catch (e) { SpreadsheetApp.getUi().alert(`❌ ${e.message}`); }
}

function testGeminiConnection() {
  const cfg = getConfig();
  if (!cfg.geminiKey) { SpreadsheetApp.getUi().alert('❌ D1 trống — chưa điền Gemini API Key'); return; }
  const resp = UrlFetchApp.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${cfg.geminiModel}:generateContent?key=${cfg.geminiKey}`, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ contents: [{ parts: [{ text: 'Trả lời bằng chữ OK' }] }] }),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() === 200) {
    SpreadsheetApp.getUi().alert(`✅ Gemini OK!\nModel: ${cfg.geminiModel}`);
  } else {
    SpreadsheetApp.getUi().alert(`❌ Gemini HTTP ${resp.getResponseCode()}\n${resp.getContentText().substring(0,200)}`);
  }
}

/**
 * Debug toàn bộ pipeline với ảnh đầu tiên trong folder.
 * Chạy khi có lỗi để xem từng bước đang hoạt động như thế nào.
 * Kết quả: alert tóm tắt + full log trong Apps Script → View → Logs
 */
function testOCRDebug() {
  const sheet    = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const folderId = getFolderIdForSheet(sheet.getName());
  if (!folderId) { SpreadsheetApp.getUi().alert('❌ Không tìm thấy Folder ID.'); return; }
  const images = getImagesFromFolder(DriveApp.getFolderById(folderId));
  if (images.length === 0) { SpreadsheetApp.getUi().alert('📂 Không có ảnh nào.'); return; }

  const cfg = getConfig();
  const { file, base64 } = images[0];
  Logger.log(`\n${'='.repeat(60)}\ntestOCRDebug: "${file.getName()}"\n${'='.repeat(60)}`);

  // Bước 1
  const ocr = runCloudVisionOCR(base64, cfg.visionJson);
  if (ocr.error) { SpreadsheetApp.getUi().alert(`❌ OCR: ${ocr.error}`); return; }
  Logger.log(`\n--- FULL OCR TEXT ---\n${ocr.text}\n--- END ---`);

  // Bước 2
  const students = getStudentList(sheet);
  const parsed   = parseWithGemini(ocr.text, students, cfg.geminiModel, cfg.geminiKey);
  Logger.log(`\n--- GEMINI PARSE ---\n${JSON.stringify(parsed, null, 2)}`);

  // Bước 3
  const match = fuzzyMatchStudent(parsed.studentName, students);
  Logger.log(`\n--- FUZZY MATCH ---\n${JSON.stringify(match, null, 2)}\n${'='.repeat(60)}`);

  SpreadsheetApp.getUi().alert(
    `File: "${file.getName()}"\n\n` +
    `[Bước 1 — OCR] ${ocr.text.length} ký tự đọc được\n\n` +
    `[Bước 2 — Gemini]\n` +
    `  Tên đọc từ bill: "${parsed.extractedName || '(không tìm thấy)'}"\n` +
    `  Match AI:        "${parsed.studentName || 'null'}"\n` +
    `  Số tiền:         ${parsed.amount ? formatCurrency(parsed.amount) : '(không tìm thấy)'}\n` +
    `  Lỗi:             ${parsed.error || 'không có'}\n\n` +
    `[Bước 3 — Fuzzy match]\n` +
    `  Kết quả: "${match.name || 'Không khớp'}"\n` +
    `  Confidence: ${match.confidence}\n\n` +
    `📋 Xem full OCR text: Apps Script → View → Logs`
  );
}

function testGetStudents() {
  const list = getStudentList(SpreadsheetApp.getActiveSpreadsheet().getActiveSheet());
  list.slice(0,10).forEach(s => Logger.log(`Row ${s.row}: "${s.name}" → "${s.normalized}"`));
  SpreadsheetApp.getUi().alert(`Tổng: ${list.length} học sinh\nXem chi tiết: View → Logs`);
}

function testFolderAccess() {
  const cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET_NAME);
  if (!cfg) { SpreadsheetApp.getUi().alert('Không tìm thấy sheet Cấu hình!'); return; }
  const log = [];
  cfg.getRange('A3:B50').getValues().forEach(r => {
    const name = r[0].toString().trim(), id = r[1].toString().trim();
    if (!name || !id) return;
    try { log.push(`✅ "${name}" → "${DriveApp.getFolderById(id).getName()}"`); }
    catch (e) { log.push(`❌ "${name}" → ${e.message}`); }
  });
  SpreadsheetApp.getUi().alert(log.length ? log.join('\n') : 'Chưa có cấu hình.');
}

function showHelp() {
  SpreadsheetApp.getUi().alert(
    '🏦 HƯỚNG DẪN SỬ DỤNG v2.3\n\n' +
    '📋 SHEET CẤU HÌNH:\n' +
    '  A1 = "cloud-vision"\n' +
    '  B1 = Service Account JSON (Cloud Vision)\n' +
    '  C1 = Gemini model  (vd: gemini-2.0-flash)\n' +
    '  D1 = Gemini API Key\n' +
    '  A3:B... = Tên sheet | Folder Drive ID\n\n' +
    '🔄 PIPELINE:\n' +
    '  1. Cloud Vision OCR → raw text từ ảnh\n' +
    '  2. Gemini AI → tên HS + số tiền\n' +
    '  3. Fuzzy match → xác nhận trong danh sách\n' +
    '  4. Ghi sheet → điền tiền đúng dòng\n\n' +
    '🔑 SERVICE ACCOUNT JSON:\n' +
    '  Cloud Console → IAM → Service Accounts\n' +
    '  → Role "Cloud Vision API User" → Keys → JSON\n' +
    '  → Mở file → Ctrl+A → Copy → Paste vào B1\n\n' +
    '🤖 GEMINI API KEY:\n' +
    '  aistudio.google.com → Get API Key → Paste vào D1\n\n' +
    '🔧 KIỂM TRA TRƯỚC KHI DÙNG:\n' +
    '  Menu → Kiểm tra cấu hình\n' +
    '  Menu → Test OAuth2 Token\n' +
    '  Menu → Test Gemini API\n' +
    '  Menu → Debug OCR + AI ảnh đầu tiên\n\n' +
    '✅ THÀNH CÔNG: file → /Done với prefix [DONE]\n' +
    '❌ THẤT BẠI: file giữ nguyên → chạy Debug để xem lý do'
  );
}
