# PROJECT.md — Bill Reconciliation System (RiceNow)

**Version:** 1.0 (code v2.3) | **Repo:** github.com/thanhtung156-blip/bill-reconciliation-ricenow-GAS | **Tháng 4/2026**

---

## Tóm tắt

Hệ thống tự động đối soát bill chuyển khoản học phí bán trú cho trường học. Tích hợp vào Google Sheets. Phụ huynh ghi tên con vào **Nội dung / Lời nhắn** khi chuyển khoản → hệ thống đọc ảnh bill → OCR → AI parse → tự điền tiền đúng dòng.

---

## Pipeline (v2.3 / v1.0)

```
Ảnh bill (upload / Drive folder)
    ↓  Bước 1: Google Cloud Vision API (Service Account JWT)
Raw OCR text
    ↓  Bước 2: Gemini AI (API Key ô D1)
{matched_name, amount, confidence}
    ↓  Bước 3: Fuzzy match (normalize tiếng Việt, 4 cấp)
Xác nhận tên trong sheet
    ↓  Bước 4: Ghi sheet + rename file → [DONE] + /Done
```

---

## Cấu hình Sheet "Cấu hình"

| Ô | Nội dung |
|---|---------|
| A1 | `cloud-vision` |
| B1 | Service Account JSON (Cloud Vision) |
| C1 | Gemini model (vd: `gemini-2.0-flash`) |
| D1 | Gemini API Key (aistudio.google.com) |
| A3:B... | Tên sheet | Folder Drive ID |

## Cấu trúc sheet dữ liệu

| Cột | Index | Mô tả |
|-----|-------|-------|
| D | 4 (STUDENT_COL) | Họ và tên học sinh |
| AR | 44 (AMOUNT_COL) | Tiền đã đóng |
| Dòng 3+ | DATA_START_ROW | Bắt đầu dữ liệu |

---

## Files trong repo

| File | Mô tả |
|------|-------|
| `BillReconciliation_v2.3.gs` | Code Apps Script chính |
| `README.md` | Hướng dẫn đầy đủ |
| `CHANGELOG.md` | Lịch sử thay đổi |
| `PROJECT.md` | File này — context cho Claude |
| `docs/TaiLieu_v1.0.docx` | Tài liệu kỹ thuật |

---

## Ngân hàng đã test

| Ngân hàng | Label | Trạng thái |
|-----------|-------|-----------|
| Techcombank | "Lời nhắn" (cùng dòng) | ✅ OK |
| SHB | "Lời nhắn" (cách 4 dòng) | ✅ OK |
| Các ngân hàng khác | — | Gemini tự xử lý |

---

## Hằng số code

```javascript
CONFIG_SHEET_NAME = 'Cấu hình'
STUDENT_COL       = 4       // cột D
AMOUNT_COL        = 44      // cột AR
DATA_START_ROW    = 3
MIN_CONFIDENCE    = 0.7
DONE_PREFIX       = '[DONE] '
DONE_SUBFOLDER    = 'Done'
```

---

## Backlog

- [ ] Cột "Ngày đóng" tự động
- [ ] Báo cáo tổng hợp cuối tháng
- [ ] Xử lý bill chụp ngược / xoay
- [ ] Hỗ trợ nhiều tháng song song
- [ ] Email/webhook thông báo
- [ ] Cảnh báo số tiền bất thường

---

## Cách dùng lại với Claude

Paste `PROJECT.md` + `CHANGELOG.md` vào đầu conversation → Claude có đủ context tiếp tục phát triển.
