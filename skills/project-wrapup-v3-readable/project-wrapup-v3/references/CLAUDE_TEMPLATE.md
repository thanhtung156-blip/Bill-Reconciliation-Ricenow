# CLAUDE.md Template

> **Mục đích:** File này được thiết kế để paste vào Claude khi cần AI làm việc tiếp với dự án.
> Độ dài: 100-200 dòng — đủ context, không dư thừa.

---

```markdown
# CLAUDE.md — [Tên dự án]

> **Version:** v[X.X]  
> **Last updated:** YYYY-MM-DD  
> **Repo:** [GitHub link]

---

## TÓM TẮT 30 GIÂY

[2-3 câu mô tả hệ thống làm gì, input/output]

**Ví dụ:**
> Hệ thống đối soát hóa đơn tự động từ Google Sheet. Đọc dữ liệu từ sheet "Bills", so khớp với database RiceNow, xuất PDF báo cáo và gửi email. Chạy hàng ngày lúc 8AM qua trigger.

---

## TECH STACK

| Component | Technology | Note |
|-----------|-----------|------|
| Platform | [GAS / Python / Node / ...] | [Version nếu cần] |
| Storage | [Sheet / DB / File / ...] | [ID hoặc path] |
| Integration | [APIs used] | [Auth method] |
| Trigger | [Manual / Scheduled / Event] | [Frequency] |

---

## CẤU TRÚC CODE

```
📁 src/
├── main.[ext]        ← Entry point: hàm [tênHàm]()
├── utils.[ext]       ← Helpers: [liệt kê hàm quan trọng]
├── config.[ext]      ← Constants & credentials
└── [module].[ext]    ← [Mô tả module]
```

**Flow chính:**
```
[Hàm entry] → [Bước 1] → [Bước 2] → [Output]
```

---

## CRITICAL CONSTRAINTS ⚠️

> **Những điều BẮT BUỘC phải biết trước khi sửa code**

### Hard constraints (KHÔNG được thay đổi)
- ⚠️ [Ví dụ: Sheet name PHẢI là "Bills" — hard-coded nhiều chỗ]
- ⚠️ [Ví dụ: PDF template ID = 1a2b3c... — nếu đổi sẽ break]
- ⚠️ [Ví dụ: Hàm processBills() đang dùng production — không refactor]

### Known gotchas
- 🐛 [Ví dụ: Currency format phải dùng formatCurrency() — toLocaleString() sai]
- 🐛 [Ví dụ: Email CC list có hard limit 50 addresses]
- 🐛 [Ví dụ: Execution timeout = 6 phút, batch size tối đa 200 records]

### Config quan trọng
```javascript
// Đây là config hiện tại — nếu thay đổi phải test kỹ
const CONFIG = {
  SHEET_ID: "...",
  SHEET_NAME: "Bills",  // ← Hard-coded
  PDF_TEMPLATE: "...",
  EMAIL_RECIPIENTS: ["..."]
}
```

---

## COMMON TASKS

### Task 1: Thêm field mới vào output
```
1. Mở file: [tên file]
2. Sửa schema tại dòng [X]
3. Cập nhật hàm [Y] để xử lý field mới
4. Test với data mẫu: [mô tả test case]
```

### Task 2: Debug lỗi [Tên lỗi thường gặp]
```
Triệu chứng: [Mô tả]
Nguyên nhân: [Lý do]
Fix: [Cách sửa cụ thể]
```

### Task 3: [Task quan trọng khác]
```
[Hướng dẫn từng bước]
```

---

## DATA SCHEMAS (nếu có)

### Sheet: [Sheet name]
| Column | Type | Required | Note |
|--------|------|----------|------|
| A (ID) | string | Yes | Unique identifier |
| B (Amount) | number | Yes | Format: 1000.50 |
| ... | ... | ... | ... |

### API Response: [API name]
```json
{
  "field1": "type — description",
  "field2": "type — description"
}
```

---

## EDGE CASES HANDLED

- ✅ [Edge case 1 + cách xử lý]
- ✅ [Edge case 2 + cách xử lý]
- ⚠️ [Edge case chưa handle + workaround tạm]

---

## QUICK REFERENCE

**Chạy local:**
```bash
[Command để chạy]
```

**Deploy:**
```bash
[Command để deploy]
```

**Logs ở đâu:** [Path hoặc UI location]

**Full docs:**
- `README.md` → overview cho con người
- `SPEC.md` → chi tiết kỹ thuật đầy đủ
- `SOP.md` → quy trình vận hành
- `CHANGELOG.md` → lịch sử version

---

## KHI NÀO ĐỌC FILE NÀO?

| Tình huống | Đọc file |
|-----------|----------|
| Cần sửa code nhanh | **CLAUDE.md** này (đủ context) |
| Onboard member mới | README.md + SOP.md |
| Implement tính năng mới | SPEC.md (chi tiết đầy đủ) |
| Debug production | SOP.md (troubleshooting guide) |
| Review code cũ | CODE_SNAPSHOT.md |
```

---

## Template này được dùng khi nào?

**Trong `specs-design-agent`:**
- Sau khi xuất SPEC.md → tự động tạo CLAUDE.md tóm tắt
- Extract từ SPEC.md những phần AI cần biết nhất

**Trong `project-wrapup`:**
- Thu thập thông tin từ code + conversation
- Tạo CLAUDE.md để paste vào session mới

---

## Nguyên tắc viết CLAUDE.md

1. **Ngắn gọn** — 100-200 dòng, không dài hơn
2. **Actionable** — mỗi section phải có info cụ thể để AI hành động
3. **Critical-first** — Constraints & gotchas lên đầu
4. **No fluff** — Không có lời giới thiệu, mở đầu dài dòng
5. **Code examples** — Luôn có snippet minh họa config/pattern quan trọng
