# CLAUDE.md — Bill Reconciliation System (RiceNow)

## TÓM TẮT 30 GIÂY
Hệ thống tự động đối soát bill chuyển khoản học phí dựa trên Google Apps Script. Quy trình: OCR ảnh (Cloud Vision) → AI Parse (Gemini) → Fuzzy Match tên học sinh → Ghi số tiền vào Google Sheets và quản lý file trên Drive.

## TECH STACK
| Component | Technology |
|---|---|
| Runtime | Google Apps Script (GAS) |
| OCR Engine | Google Cloud Vision API (TEXT_DETECTION) |
| AI Reasoning | Gemini 2.0 Flash (hoặc Pro) |
| Storage | Google Sheets & Google Drive |
| Auth | OAuth2 JWT Bearer (Service Account) |

## CẤU TRÚC CODE & FLOW
- `BillReconciliation_v2.3.gs`: File duy nhất chứa toàn bộ logic.
- **Flow chính:** `processImage()`
  1. `runCloudVisionOCR()`: Lấy raw text từ ảnh.
  2. `parseWithGemini()`: AI bóc tách {tên, số tiền} từ raw text.
  3. `fuzzyMatchStudent()`: Khớp tên tìm được với danh sách học sinh (4 cấp độ).
  4. `Ghi Sheet & Di chuyển file`: Cập nhật cột AR và move vào folder `Done/`.

## CRITICAL CONSTRAINTS ⚠️
### Hard constraints
- ⚠️ **Config Sheet:** Phải có tên là `Cấu hình`.
- ⚠️ **Cột dữ liệu:** Tên HS tại cột D (index 4), Tiền đóng tại cột AR (index 44).
- ⚠️ **Dòng bắt đầu:** Dữ liệu học sinh bắt đầu từ dòng 3.
- ⚠️ **Auth:** Cloud Vision yêu cầu Service Account JSON chuẩn (không dùng API Key đơn giản).

### Known gotchas
- 🐛 `google.script.run` giới hạn payload 50MB. Khi upload nhiều ảnh, hệ thống gọi tuần tự `handleUploadSingle` để tránh crash.
- 🐛 Tên học sinh trong nội dung bill thường thiếu dấu hoặc sai chính tả -> Fuzzy Match được thiết lập ở ngưỡng 0.7.

## COMMON TASKS
- **Thêm ngân hàng mới:** Không cần sửa code, Gemini tự động xử lý dựa trên ngữ cảnh prompt.
- **Thay đổi cột ghi tiền:** Sửa hằng số `AMOUNT_COL` ở đầu file.
- **Debug lỗi nhận diện:** Chạy hàm `testOCRDebug()` để xem log chi tiết từng bước của pipeline.
- **Cập nhật danh sách học sinh:** Hệ thống tự động load lại danh sách từ Sheet mỗi khi chạy.

## QUICK REFERENCE
- **Cấu hình:** Sheet `Cấu hình` (A1: Provider, B1: JSON Key, C1: Model, D1: Gemini Key).
- **Test kết nối:** Menu `🏦 Đối Soát Bill` -> `🔧 Kiểm tra cấu hình`.
- **Logs:** Xem trong Apps Script Editor (Execution log).
