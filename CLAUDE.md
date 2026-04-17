# CLAUDE.md — Bill Reconciliation System (RiceNow)

## TÓM TẮT 30 GIÂY
Hệ thống tự động đối soát bill chuyển khoản học phí dựa trên Google Apps Script. Quy trình: OCR ảnh (Cloud Vision) → AI Parse (Gemini) → Fuzzy Match tên học sinh → Ghi số tiền vào Google Sheets và quản lý file trên Drive.

## TECH STACK
| Component | Technology |
|---|---|
| Runtime | Google Apps Script (GAS) |
| OCR Engine | Google Cloud Vision API (TEXT_DETECTION) |
| AI Reasoning | Gemini 2.0 Flash |
| Storage | Google Sheets & Google Drive |
| Auth | OAuth2 JWT Bearer (Service Account) |

## CẤU TRÚC CODE & FLOW
- `Doisoat_ricenow.js`: File chính chứa toàn bộ logic xử lý.
- **Flow chính:** `processImage()`
  1. `runCloudVisionOCR()`: Lấy raw text từ ảnh qua Cloud Vision.
  2. `parseWithGemini()`: Gemini bóc tách {tên, số tiền} từ raw text.
  3. `fuzzyMatchStudent()`: Khớp tên tìm được với danh sách HS (4 cấp độ).
  4. `Ghi Sheet & Di chuyển file`: Cập nhật cột AR và move vào folder `Done/`.

## CRITICAL CONSTRAINTS ⚠️
### Hard constraints
- ⚠️ **Config Sheet:** Phải có tên chính xác là `Cấu hình`.
- ⚠️ **Cột dữ liệu:** Tên HS tại cột D (index 4), Tiền đóng tại cột AR (index 44).
- ⚠️ **Dòng bắt đầu:** Dữ liệu học sinh bắt đầu từ dòng 3.
- ⚠️ **Auth:** Yêu cầu Service Account JSON chuẩn dán vào ô B1 sheet Cấu hình.

## COMMON TASKS
- **Thay đổi cột ghi tiền:** Sửa hằng số `AMOUNT_COL` ở đầu file.
- **Debug lỗi nhận diện:** Chạy hàm `testOCRDebug()` trong Menu để xem chi tiết pipeline.
- **Cập nhật danh sách lớp:** Điền Tên sheet và Folder ID vào từ dòng A3 sheet Cấu hình.

## QUICK REFERENCE
- **Cấu hình:** Sheet `Cấu hình` (A1: Provider, B1: JSON Key, C1: Model, D1: Gemini Key).
- **Test kết nối:** Menu `🏦 Đối Soát Bill` -> `🔧 Kiểm tra cấu hình`.
