# 🏦 Bill Reconciliation System — RiceNow (v2.3)

Hệ thống tự động đối soát bill chuyển khoản học phí sử dụng công nghệ OCR và AI tiên tiến, chạy trực tiếp trên nền tảng Google Apps Script.

## 🚀 Tính năng nổi bật
- **Pipeline 2 tầng AI:** Kết hợp Google Cloud Vision (OCR) để đọc văn bản và Gemini AI để phân tích ngữ cảnh nội dung chuyển khoản.
- **Đối soát thông minh:** Thuật toán Fuzzy Match 4 cấp độ giúp nhận diện tên học sinh chính xác ngay cả khi phụ huynh viết thiếu dấu hoặc sai chính tả.
- **Quản lý linh hoạt:** Hỗ trợ cả việc tải ảnh trực tiếp từ máy tính (Upload) và quét tự động từ thư mục Google Drive (Scan).
- **Tự động hóa hoàn toàn:** Tự động điền số tiền vào Sheet, đổi tên file và di chuyển vào thư mục lưu trữ `/Done`.

## 🛠 Tech Stack
- **Language:** JavaScript (Google Apps Script)
- **APIs:** Cloud Vision API, Gemini Pro/Flash API
- **Infrastructure:** Google Sheets, Google Drive

## 📂 Cấu trúc dự án
- `BillReconciliation_v2.3.gs`: Toàn bộ mã nguồn xử lý.
- `docs/`: Thư mục chứa tài liệu hướng dẫn và đặc tả.
  - `CLAUDE.md`: Ngữ cảnh dành cho AI (sử dụng khi tiếp tục phát triển).
  - `SOP.md`: Hướng dẫn vận hành cho người dùng cuối.
  - `CODE_SNAPSHOT.md`: Sao lưu các đoạn mã cốt lõi.
  - `CHANGELOG.md`: Lịch sử thay đổi các phiên bản.

## ⚙️ Cài đặt nhanh
1. Paste code vào Apps Script của Google Sheets.
2. Thiết lập Sheet `Cấu hình` với API Key và Service Account JSON.
3. Chạy `onOpen` để kích hoạt menu và bắt đầu đối soát.

---
*Phát triển bởi Vibecode dành cho RiceNow — Tháng 4/2026*
