# 🏦 Bill Reconciliation System — RiceNow (v2.3)

Hệ thống tự động đối soát bill chuyển khoản học phí sử dụng Google Apps Script, Google Cloud Vision OCR và Gemini AI.

## 🌟 Tính năng
- **Tự động hóa 100%:** Đọc ảnh → Parse tên & số tiền → Khớp danh sách → Ghi Sheet.
- **Fuzzy Match:** Nhận diện tên thông minh kể cả khi thiếu dấu hoặc sai sót nhỏ.
- **Quản lý file:** Tự động di chuyển file đã xử lý vào thư mục `/Done`.
- **Đa nền tảng:** Hỗ trợ upload trực tiếp từ máy tính hoặc quét từ Google Drive.

## 📂 Cấu trúc dự án
- `Doisoat_ricenow.js`: Mã nguồn chính (v2.3).
- `SOP.md`: Hướng dẫn vận hành nhanh (Root).
- `CLAUDE.md`: Ngữ cảnh cho AI (Root).
- `CHANGELOG.md`: Lịch sử các phiên bản (Root).
- `docs/`: Thư mục lưu trữ tài liệu kỹ thuật và backup.

## 🔧 Cài đặt
1. Copy mã nguồn vào Apps Script.
2. Cấu hình các API Key trong sheet `Cấu hình`.
3. Cấp quyền và bắt đầu sử dụng từ Menu `🏦 Đối Soát Bill`.

---
*Built for RiceNow · v2.3 · 2026*
