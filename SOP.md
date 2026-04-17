# SOP — Hướng dẫn Vận hành Hệ thống Đối soát Bill (RiceNow)

Tài liệu này hướng dẫn cách thiết lập và sử dụng hệ thống dành cho Kế toán và Quản trị viên.

---

## 1. Thiết lập Cấu hình (Ô A1 - D1 sheet "Cấu hình")

| Ô | Nội dung | Ghi chú |
|---|---------|---------|
| **A1** | `cloud-vision` | Không thay đổi |
| **B1** | Service Account JSON | Copy toàn bộ nội dung file .json từ Google Cloud |
| **C1** | `gemini-2.0-flash` | Có thể đổi sang `gemini-1.5-pro` nếu cần chính xác hơn |
| **D1** | Gemini API Key | Lấy từ aistudio.google.com |

---

## 2. Quy trình sử dụng hàng ngày

### Bước 1: Chuẩn bị dữ liệu
- Đảm bảo danh sách học sinh nằm ở cột **D**, bắt đầu từ dòng **3**.
- Kiểm tra tên sheet hiện tại đã được khai báo ID thư mục Drive trong sheet "Cấu hình" (dòng 3 trở đi).

### Bước 2: Tải hóa đơn (Bill)
Có 2 cách để xử lý:
1. **Upload trực tiếp:** Menu `🏦 Đối Soát Bill` -> `📤 Tải ảnh & Đối soát`. Bạn có thể kéo thả nhiều ảnh cùng lúc.
2. **Quét từ Drive:** Tải ảnh vào thư mục Drive của lớp, sau đó chọn Menu `📁 Quét Folder Drive`.

### Bước 3: Kiểm tra kết quả
- Các dòng khớp thành công sẽ được điền số tiền vào cột **AR**.
- Các file ảnh xử lý xong sẽ được đổi tên thành `[DONE] ...` và chuyển vào thư mục con tên là `Done`.

---

## 3. Xử lý khi có lỗi (Troubleshooting)

- **Lỗi OCR:** Kiểm tra lại file JSON trong ô B1. Nếu ảnh quá mờ, Cloud Vision sẽ không đọc được chữ.
- **Lỗi không khớp tên:** Chạy Menu -> `🔍 Debug OCR + AI ảnh đầu tiên`. Xem AI đọc được tên gì (extracted_name). Nếu tên trong bill quá khác danh sách (ví dụ phụ huynh ghi tên biệt danh), bạn cần sửa lại tên trong danh sách hoặc ghi tiền thủ công.
- **Lỗi "Ô đã có dữ liệu":** Hệ thống sẽ không ghi đè nếu ô tiền đã có số (tránh trùng lặp). Nếu muốn ghi lại, hãy xóa ô đó đi trước.

---
*Phiên bản: v2.3 (Tháng 4/2026)*
