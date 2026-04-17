# SOP — Hướng dẫn Vận hành Hệ thống Đối soát Bill (RiceNow)

Tài liệu này hướng dẫn cách thiết lập và sử dụng hệ thống đối soát tự động dành cho quản trị viên và kế toán.

---

## 1. Thiết lập ban đầu (Chỉ thực hiện 1 lần)

### Bước 1: Cài đặt mã nguồn
1. Mở file Google Sheets của trường.
2. Vào **Extensions** -> **Apps Script**.
3. Copy toàn bộ code từ file `BillReconciliation_v2.3.gs` vào editor.
4. Lưu lại và nhấn F5 để hiện Menu `🏦 Đối Soát Bill`.

### Bước 2: Cấu hình hệ thống
Tạo sheet mới tên là **"Cấu hình"** và điền thông tin vào các ô sau:
- **A1:** `cloud-vision`
- **B1:** Dán nội dung file JSON của Service Account (Google Cloud).
- **C1:** `gemini-2.0-flash`
- **D1:** Dán API Key của Gemini.
- **Dưới dòng 3:** Cột A điền tên các Sheet lớp, cột B điền ID thư mục Drive tương ứng để quét ảnh.

### Bước 3: Kiểm tra kết nối
Vào menu `🏦 Đối Soát Bill` -> `🔧 Kiểm tra cấu hình` để đảm bảo AI và OCR đã thông suốt.

---

## 2. Quy trình làm việc hàng ngày

### Cách 1: Tải lên trực tiếp từ máy tính (Nhanh)
1. Vào menu `🏦 Đối Soát Bill` -> `📷 Upload từ máy tính`.
2. Kéo thả các ảnh bill vào vùng nhận diện hoặc nhấn chọn file.
3. Chờ hệ thống xử lý (hiện log ✅ Xanh là thành công).
4. Kiểm tra số tiền tự động điền tại cột **AR**.

### Cách 2: Xử lý theo lô từ Google Drive (Tự động)
1. Tải ảnh bill của phụ huynh vào thư mục lớp trên Drive.
2. Vào menu `🏦 Đối Soát Bill` -> `📁 Quét Folder Drive`.
3. Hệ thống sẽ quét toàn bộ ảnh chưa xử lý. Các ảnh thành công sẽ được đổi tên thành `[DONE]...` và chuyển vào thư mục `/Done`.

---

## 3. Xử lý sự cố (Troubleshooting)

| Vấn đề | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Menu không xuất hiện | Script chưa được cấp quyền | Chạy hàm `onOpen()` trong editor và cấp quyền. |
| Log báo ❌ OCR Fail | JSON Key hết hạn hoặc sai | Kiểm tra ô B1 trong sheet Cấu hình. |
| Log báo ❌ Match Fail | Tên trong bill quá khác danh sách | Dùng hàm `testOCRDebug()` để xem AI đọc được tên gì, sau đó sửa tên HS trong danh sách cho chuẩn. |
| Ảnh không di chuyển vào `/Done` | Quyền ghi Drive bị hạn chế | Kiểm tra quyền của tài khoản chạy script với thư mục Drive. |

---

## 4. Lưu ý quan trọng
- **Chất lượng ảnh:** Bill cần rõ nét, không bị lóa sáng phần "Nội dung".
- **Ghi đè:** Nếu bạn upload file trùng tên, hệ thống sẽ tự động xóa file cũ để tránh trùng lặp dữ liệu.
- **Số tiền:** Nếu AI không tìm thấy số tiền, hệ thống sẽ bỏ qua dòng đó và báo lỗi để kiểm tra thủ công.
