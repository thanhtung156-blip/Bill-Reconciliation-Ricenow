# CHANGELOG — Bill Reconciliation System

---

## v2.3 — Tháng 4/2026 (CURRENT / v1.0 release)

### 🆕 Thay đổi lớn: Pipeline 2 tầng AI
- **Kiến trúc mới:** Cloud Vision OCR → Gemini AI parse → Fuzzy match → Ghi sheet
- **Trước (v2.2):** Cloud Vision → regex/rule-based extract → Fuzzy match
- **Sau (v2.3):** Cloud Vision → Gemini AI tự hiểu ngữ cảnh → Fuzzy match

### Thêm mới
- `runCloudVisionOCR()` — tách riêng bước OCR, trả raw text thuần
- `parseWithGemini()` — gọi Gemini AI parse raw text → JSON chuẩn
- `buildGeminiPrompt()` — prompt cung cấp raw OCR + danh sách HS cho AI
- `parseGeminiResponse()` — parse JSON response từ Gemini
- Cấu hình mới: **C1** = Gemini model, **D1** = Gemini API Key
- Menu: "🤖 Test Gemini API" — kiểm tra kết nối Gemini độc lập
- `testGeminiConnection()` — debug function mới
- Dialog upload hiển thị pipeline 4 bước, log màu (✅ xanh / ❌ đỏ / ⚠️ vàng)

### Thay đổi
- `processImage()` refactor thành pipeline rõ ràng 4 bước với log từng bước
- `testOCRDebug()` cập nhật hiển thị cả Gemini parse result
- MIN_CONFIDENCE giảm từ 0.8 → 0.7 (Gemini thường trả confidence cao hơn regex)

---

## v2.2 — Tháng 4/2026

### 🆕 Thay đổi lớn: đọc từ Nội dung/Lời nhắn thay vì tên người chuyển
- **Trước:** extract tên người chuyển (tên bố/mẹ) — **sai**
- **Sau:** chỉ đọc phần **Nội dung / Lời nhắn** — tên con do phụ huynh ghi

### Thêm mới
- `extractNameFromMemo()` — tìm tên từ label Nội dung/Lời nhắn/Memo/ND...
- `extractLeadingName()` — tách tên từ đầu chuỗi, dừng khi gặp số/từ khoá
  - Xử lý: `"Nguyen Minh Duc 11.09.2009 Lop 11A2 Tien an T04"` → `"Nguyen Minh Duc"`
- Hỗ trợ **Dạng A** (label + giá trị liền nhau) và **Dạng B** (label + giá trị cách xa — SHB)
- `MEMO_BLACKLIST` — lọc từ khoá không phải tên (học phí, tháng, lớp...)
- `testOCRDebug()` — debug function: OCR ảnh đầu tiên, xem full text + kết quả extract
- `testServiceAccountToken()` — test lấy OAuth2 token riêng
- Menu cập nhật: thêm "🔍 Debug OCR", "🔑 Test OAuth2 Token"

### Fix bugs
- **Fix syntax error dòng 1201:** `showHelp()` bị mất khai báo `function`
- **Fix upload nhiều file:** đổi từ `handleUpload(filesData[])` → `handleUploadSingle(fileData)` gọi tuần tự từng file
  - Nguyên nhân: `google.script.run` giới hạn payload ~50MB/lần — gom nhiều ảnh fail im lặng
  - Giải pháp: dialog dùng `async/await` + `for...of`, gọi từng file, hiện kết quả ngay
- **Fix "tài khoản" bị nhận nhầm là tên:** thêm blacklist + validate tên người

### Đã test
- ✅ Techcombank — "Lời nhắn" cùng dòng/dòng kế
- ✅ SHB — "Lời nhắn" cách 4 dòng (Dạng B)

---

## v2.1 — Tháng 4/2026

### 🆕 Thay đổi lớn: Service Account JSON thay API Key
- **Trước (v2.0):** Cloud Vision dùng API Key (`?key=...` trong URL)
- **Sau (v2.1):** Cloud Vision dùng **Service Account JSON → OAuth2 JWT Bearer token**

### Thêm mới
- `getServiceAccountToken()` — OAuth2 JWT flow thuần GAS (không cần thư viện ngoài)
  - Dùng `Utilities.computeRsaSha256Signature()` built-in
  - Flow: Parse JSON → Build JWT → Ký RSA-SHA256 → POST token endpoint → access_token
- Cấu hình B1 đổi từ API Key → Service Account JSON string
- `getConfig()` thay `getAIConfig()` — đọc cả B1 (JSON) lẫn D1 (Gemini key)

### Thay đổi
- `callCloudVision()` gọi API với `Authorization: Bearer <token>` thay `?key=`
- `testConfig()` validate JSON trong B1 thay vì chỉ check string

---

## v2.0 — Tháng 4/2026

### 🆕 Thay đổi lớn: Cloud Vision là primary provider
- Đổi từ LLM-only (Gemini/MiniMax đọc ảnh trực tiếp) sang Cloud Vision OCR

### Thêm mới
- `callCloudVision()` — gọi Cloud Vision TEXT_DETECTION
- `extractAmountFromText()` — regex parse số tiền từ raw text
- `extractSenderNameFromText()` — regex parse tên từ raw text (v2.0)
- `fuzzyMatchStudent()` — 4 cấp match: exact (1.0) → subset (0.9) → superset (0.85) → includes (0.8)
- Kiến trúc pluggable: `detectProvider()` + `callAI()` router
- Upload: xóa file trùng tên (ghi đè)
- Move file thành công → `/Done` với prefix `[DONE]`

### Providers hỗ trợ
- ★ Cloud Vision (primary, A1=`cloud-vision`)
- Gemini (fallback, A1=`gemini-*`)
- MiniMax (fallback, A1=`MiniMax-*`)
- Claude/Anthropic (fallback, A1=`claude-*`)

---

## v1.x — Phiên bản gốc (baseline)

- LLM đọc ảnh trực tiếp (Gemini/MiniMax multimodal)
- Match tên trong prompt AI
- Không có upload ghi đè
- Không có /Done folder management
