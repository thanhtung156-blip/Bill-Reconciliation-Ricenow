# 🏦 Bill Reconciliation System — RiceNow

> **Hệ thống tự động đối soát bill chuyển khoản học phí bán trú**  
> Google Apps Script · Google Cloud Vision · Gemini AI · Google Sheets

[![Version](https://img.shields.io/badge/version-1.0-blue)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Google%20Apps%20Script-orange)](https://script.google.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Tổng quan

Hệ thống đọc ảnh bill chuyển khoản ngân hàng, tự động nhận diện tên học sinh và số tiền, rồi điền vào đúng dòng trong Google Sheets — không cần nhập tay.

**Vấn đề giải quyết:** Phụ huynh ghi tên con vào phần *Nội dung / Lời nhắn* khi chuyển học phí. Thay vì đối soát thủ công từng bill, hệ thống xử lý tự động hàng loạt ảnh cùng lúc.

---

## Pipeline xử lý

```
Ảnh bill (upload từ máy / quét folder Drive)
         │
         ▼  Bước 1 — Google Cloud Vision API
    Raw OCR Text  ←  toàn bộ chữ trong ảnh
         │
         ▼  Bước 2 — Gemini AI
    { tên học sinh, số tiền }  ←  AI tự tìm phần Nội dung/Lời nhắn
         │
         ▼  Bước 3 — Fuzzy Match
    Xác nhận tên trong danh sách sheet (normalize tiếng Việt)
         │
         ▼  Bước 4 — Ghi Sheet
    Điền số tiền vào cột AR + rename file → [DONE] + move /Done
```

---

## Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 📷 Upload từ máy | Drag & drop nhiều ảnh, xử lý tuần tự từng file |
| 📁 Quét Drive | Tự động quét folder Drive, bỏ qua file đã xử lý |
| 🔤 OCR chính xác | Cloud Vision TEXT_DETECTION — chuyên biệt cho text in |
| 🤖 AI parse | Gemini tự hiểu ngữ cảnh, không cần regex theo ngân hàng |
| 🔍 Fuzzy match | 4 cấp so khớp tiếng Việt (exact / subset / superset / includes) |
| 🔁 Ghi đè | Upload trùng tên tự xóa file cũ (cả trong /Done) |
| 📂 Quản lý file | Thành công → `[DONE]` + `/Done`; thất bại → giữ nguyên |
| 🛠️ Debug tools | 5 hàm test độc lập, log chi tiết từng bước |

---

## Ngân hàng hỗ trợ

| Ngân hàng | Label bill | Trạng thái |
|-----------|-----------|-----------|
| Techcombank | "Lời nhắn" | ✅ Đã test |
| SHB | "Lời nhắn" (giá trị cách xa 4 dòng) | ✅ Đã test |
| Vietcombank | "Nội dung" | 🔲 Gemini tự xử lý |
| MBBank | "Nội dung" / "Memo" | 🔲 Gemini tự xử lý |
| VPBank | "Nội dung chuyển tiền" | 🔲 Gemini tự xử lý |
| BIDV | "Nội dung thanh toán" | 🔲 Gemini tự xử lý |
| TPBank | "Lời nhắn" / "Ghi chú" | 🔲 Gemini tự xử lý |

> Với Gemini AI parse (v1.0), mọi ngân hàng đều được xử lý tự động — không cần thêm code khi gặp ngân hàng mới.

---

## Cài đặt & Cấu hình

### 1. Cài đặt script

```
1. Mở Google Sheets → Extensions → Apps Script
2. Paste toàn bộ nội dung BillReconciliation_v2.3.gs
3. Lưu (Ctrl+S) → Run onOpen() → Cấp quyền
```

### 2. Sheet "Cấu hình"

| Ô | Nội dung |
|---|---------|
| **A1** | `cloud-vision` |
| **B1** | Service Account JSON *(paste nguyên nội dung file .json)* |
| **C1** | Gemini model *(vd: `gemini-2.0-flash`)* |
| **D1** | Gemini API Key *(từ [aistudio.google.com](https://aistudio.google.com))* |
| **A3:B...** | Tên sheet \| Folder Drive ID |

### 3. Lấy Service Account JSON (Cloud Vision)

```
Google Cloud Console
  → APIs & Services → Enable "Cloud Vision API"
  → IAM & Admin → Service Accounts → Create
  → Role: "Cloud Vision API User"
  → Keys → Add Key → JSON → tải file .json
  → Mở file → Ctrl+A → Copy → Paste vào ô B1
```

### 4. Lấy Gemini API Key

```
aistudio.google.com → Get API Key → Copy → Paste vào ô D1
```

### 5. Kiểm tra cấu hình

```
Menu "🏦 Đối Soát Bill"
  → 🔧 Kiểm tra cấu hình
  → 🔑 Test OAuth2 Token       (xác nhận Cloud Vision JSON)
  → 🤖 Test Gemini API         (xác nhận Gemini Key)
```

---

## Cấu trúc Sheet dữ liệu

| Cột | Index | Nội dung |
|-----|-------|---------|
| D | 4 (`STUDENT_COL`) | ⭐ Họ và tên học sinh |
| AR | 44 (`AMOUNT_COL`) | ⭐ Tiền đã đóng *(hệ thống ghi vào đây)* |
| Dòng 3+ | `DATA_START_ROW` | Bắt đầu dữ liệu |

---

## Cấu trúc Folder Drive

```
📁 Folder chính  (ID cấu hình ô B3:B...)
├── 🖼️ bill_001.jpg           ← chờ xử lý
├── 🖼️ bill_002.png           ← chờ xử lý
└── 📁 Done/
    ├── [DONE] bill_001.jpg   ← đã xử lý thành công
    └── [DONE] bill_xxx.jpg
```

---

## Debug & Troubleshooting

### Hàm debug

| Hàm | Dùng khi |
|-----|----------|
| `testConfig()` | Kiểm tra tổng quan cấu hình |
| `testServiceAccountToken()` | Cloud Vision JSON lỗi |
| `testGeminiConnection()` | Gemini API Key lỗi |
| `testOCRDebug()` | ⭐ Tên không match — xem full pipeline từng bước |
| `testGetStudents()` | Xem danh sách HS đã normalize |
| `testFolderAccess()` | Kiểm tra kết nối folder Drive |

### Quy trình debug khi bill không nhận được

```
1. Menu → 🔍 Debug OCR + AI ảnh đầu tiên
2. Đọc alert:
   - Bước 1 (OCR): bao nhiêu ký tự đọc được?
   - Bước 2 (Gemini): tên đọc là gì? matched_name?
   - Bước 3 (Match): score bao nhiêu?
3. Nếu OCR rỗng → ảnh mờ hoặc JSON sai
4. Nếu Gemini null → phụ huynh ghi sai tên trong bill
5. Nếu match fail → testGetStudents() → so sánh normalized
6. Xem full OCR text: Apps Script → View → Logs
```

---

## Cấu trúc code

```
BillReconciliation_v2.3.gs
│
├── MENU
│   └── onOpen()
│
├── UPLOAD (từ máy tính)
│   ├── showUploadDialog()       — mở dialog drag & drop
│   └── handleUploadSingle()     — xử lý 1 file, gọi tuần tự
│
├── SCAN (từ Drive)
│   └── processFromFolder()
│
├── CORE PIPELINE
│   └── processImage()           — orchestrator 4 bước
│
├── BƯỚC 1 — CLOUD VISION OCR
│   ├── runCloudVisionOCR()
│   └── getServiceAccountToken() — OAuth2 JWT flow
│
├── BƯỚC 2 — GEMINI AI PARSE
│   ├── parseWithGemini()
│   ├── buildGeminiPrompt()
│   └── parseGeminiResponse()
│
├── BƯỚC 3 — FUZZY MATCH
│   └── fuzzyMatchStudent()      — 4 cấp: exact/subset/superset/includes
│
├── SHEET OPERATIONS
│   ├── getStudentList()
│   └── findStudentRow()
│
├── DRIVE HELPERS
│   ├── deleteExistingFiles()
│   ├── getOrCreateSubFolder()
│   └── getImagesFromFolder()
│
├── UTILITY
│   ├── normalize()              — bỏ dấu tiếng Việt
│   └── formatCurrency()
│
├── DIALOG HTML
│   └── getUploadDialogHTML()    — pipeline badge + log màu
│
└── DEBUG / TEST
    ├── testConfig()
    ├── testServiceAccountToken()
    ├── testGeminiConnection()
    ├── testOCRDebug()           — full pipeline debug
    ├── testGetStudents()
    ├── testFolderAccess()
    └── showHelp()
```

---

## Hằng số quan trọng

```javascript
const CONFIG_SHEET_NAME = 'Cấu hình';  // Tên sheet cấu hình
const STUDENT_COL       = 4;           // Cột D — tên học sinh
const AMOUNT_COL        = 44;          // Cột AR — tiền đã đóng
const DATA_START_ROW    = 3;           // Dữ liệu bắt đầu từ dòng 3
const MIN_CONFIDENCE    = 0.7;         // Ngưỡng match tối thiểu
const DONE_PREFIX       = '[DONE] ';   // Prefix file đã xử lý
const DONE_SUBFOLDER    = 'Done';      // Subfolder chứa file thành công
```

---

## Roadmap

- [ ] Thêm cột "Ngày đóng" tự động
- [ ] Báo cáo tổng hợp cuối tháng (tổng thu, danh sách chưa đóng)
- [ ] Xử lý bill chụp ngược / xoay ảnh
- [ ] Hỗ trợ nhiều tháng song song
- [ ] Email/webhook thông báo kết quả xử lý
- [ ] Cảnh báo số tiền bất thường

---

## Files trong repo

```
bill-reconciliation-ricenow-GAS/
├── BillReconciliation_v2.3.gs   # Code chính — paste vào Apps Script
├── README.md                    # File này
├── CHANGELOG.md                 # Lịch sử thay đổi chi tiết
└── docs/
    └── TaiLieu_v1.0.docx        # Tài liệu kỹ thuật đầy đủ
```

---

## Tiếp tục phát triển với Claude

Paste 2 file sau vào Claude để tiếp tục mà không cần giải thích lại:

```
PROJECT.md   — context tổng quan, pipeline, cấu hình
CHANGELOG.md — lịch sử thay đổi và lý do
```

---

## License

MIT — sử dụng tự do cho mục đích giáo dục và phi lợi nhuận.

---

*Built for RiceNow · Google Apps Script · Tháng 4/2026*
