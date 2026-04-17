# Hướng dẫn viết Lessons Learned hiệu quả

Phần Lessons Learned là phần **có giá trị nhất** trong bộ docs, nhưng thường bị viết qua loa nhất.
Mục tiêu: Claude (hoặc bạn) đọc phần này và làm dự án tiếp theo TỐTHƠN, NHANH HƠN.

---

## Framework viết Lessons Learned

### 1. Kỹ thuật & Code

**Câu hỏi để khai thác:**
- Approach nào bạn thử trước nhưng không hiệu quả?
- Pattern nào bạn đã dùng và muốn dùng lại?
- Thư viện / API nào có hành vi bất ngờ?
- Đoạn code nào tốn nhiều thời gian debug nhất?

**Ví dụ viết tốt:**
```markdown
## Kỹ thuật
- ✅ Dùng batch API calls thay vì loop → giảm 80% execution time
- ✅ Lưu state vào Script Properties để tránh mất data khi timeout
- ❌ KHÔNG dùng UrlFetchApp trong loop > 100 items → bị rate limit
- ⚠️ Google Sheets API trả về string cho mọi số nếu không set valueInputOption="RAW"
```

### 2. Quy trình & Làm việc

**Câu hỏi để khai thác:**
- Giai đoạn nào tốn nhiều thời gian hơn dự kiến?
- Bước nào bạn sẽ làm khác nếu làm lại?
- Điều gì gây ra blockers lớn nhất?

**Ví dụ viết tốt:**
```markdown
## Quy trình
- ✅ Viết schema data trước khi code → tiết kiệm 3 lần refactor
- ❌ Test trên production data thật từ đầu → nên dùng sandbox
- ⚠️ Nên confirm với stakeholder về output format TRƯỚC khi build
```

### 3. Những gì KHÔNG làm lại (Dead Ends)

Đây là phần quan trọng nhất và thường bị bỏ qua.

**Ví dụ viết tốt:**
```markdown
## Dead Ends - Đừng thử lại
- ❌ Dùng Zapier để xử lý logic phức tạp → quá tốn credits, không debug được
- ❌ Parse HTML bằng regex → dùng proper HTML parser
- ❌ Lưu data vào Google Doc → Sheet dễ query hơn nhiều
```

### 4. Patterns hay dùng lại (Reusable)

```markdown
## Patterns đáng tái sử dụng
- 🔄 Error handling wrapper: [link to code snippet]
- 🔄 Rate limit retry logic: exponential backoff với max 3 retries
- 🔄 Cache pattern: check cache → if miss → fetch → save → return
```

---

## Template Lessons Learned đầy đủ

```markdown
## 📚 Lessons Learned

### ✅ Làm đúng (tiếp tục dùng)
- [Điều 1]
- [Điều 2]

### ❌ Làm sai (không làm lại)
- [Điều 1] → [Lý do / Vấn đề gặp phải]
- [Điều 2] → [Lý do]

### ⚠️ Gotchas (điều bất ngờ cần biết)
- [Hành vi bất ngờ của tool/API X]
- [Assumption sai đã mất thời gian]

### 🔄 Patterns tái sử dụng
- [Pattern 1]: [Mô tả ngắn + link code nếu có]

### ⏱ Time sinks (tốn thời gian nhất)
- [Vấn đề X] tốn [Y giờ] → Lần sau: [cách tránh]

### 💡 Insight lớn nhất
[1–2 câu về điều bạn hiểu khác đi sau dự án này]
```

---

## Anti-patterns khi viết Lessons Learned

❌ **Quá chung chung:**
> "Cần test kỹ hơn" → Vô nghĩa

✅ **Cụ thể và actionable:**
> "Cần viết test case cho edge case khi input là empty string trước khi ship"

❌ **Chỉ viết success:**
> "API hoạt động tốt"

✅ **Ghi cả failure:**
> "API OAuth timeout sau 1 giờ → cần implement token refresh, không chỉ check expiry"

❌ **Không có context:**
> "Dùng caching"

✅ **Có context:**
> "Cache kết quả geocoding API vào Sheet → tiết kiệm 90% API calls khi re-run"
