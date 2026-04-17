---
name: project-wrapup
description: >
  Tự động tổng hợp và đóng gói một dự án thành công thành bộ tài liệu chuẩn (README.md, CLAUDE.md, SOP.md, CHANGELOG.md) để lưu trữ lâu dài và Claude có thể đọc lại trong các session mới. LUÔN dùng skill này khi người dùng nói "wrap up dự án", "tổng hợp dự án", "đóng gói project", "lưu lại dự án", "viết doc cho dự án", "project done", "dự án xong rồi", "tạo documentation", "tôi muốn lưu lại", hoặc khi họ mô tả một hệ thống/workflow đã hoàn chỉnh và muốn ghi lại để dùng sau. Skill này tạo ra bộ file .md chuẩn có thể paste vào Claude hoặc upload lên hệ thống skill (antigravity) để Claude tự động nhận diện context trong các session mới.
---

# Project Wrap-Up Skill v3

Skill này đóng gói dự án hoàn chỉnh thành bộ tài liệu chuẩn, tối ưu để:
1. **Paste vào Claude** ở session mới → CLAUDE.md là file tối ưu nhất
2. **Lưu vào Notion/Drive** → README.md + docs folder
3. **Push lên GitHub** → toàn bộ docs vào `/docs` trong repo

**Thay đổi quan trọng v3:**
- ❌ Loại bỏ PROJECT.md (trùng với README.md)
- ✅ Thêm CLAUDE.md — context tối ưu cho AI
- ✅ Đồng nhất với output của specs-design-agent

---

## Quy trình thực hiện (5 bước)

### Bước 1: Thu thập thông tin (Interview)

Nếu conversation đã chứa đủ thông tin (dự án vừa build xong), tự extract. Nếu thiếu, hỏi:

**Bắt buộc:**
- Tên dự án, mục tiêu chính?
- Tech stack / platform?
- Input → Xử lý → Output?
- Workflow chính (3-5 bước)?
- Hoạt động tốt / hạn chế / lessons learned?

**Về code:**
- Code ở đâu? (GitHub repo / local / GAS editor)
- Nếu GitHub → lấy link repo
- Nếu local/GAS → yêu cầu paste code quan trọng nhất

**Critical constraints:**
- Có config hard-coded nào không được thay đổi không?
- Có gotcha / bug đã biết nhưng chưa fix?
- Có execution time limits / platform constraints?

---

### Bước 2: Xác định version

```
v1.0  → Lần đầu wrap up (MVP chạy được)
v1.x  → Fix bug nhỏ, thêm tính năng nhỏ
v2.0  → Refactor lớn, đổi kiến trúc hoặc platform
```

Ghi version vào frontmatter của tất cả file.

---

### Bước 3: Tạo bộ tài liệu (5 file)

Tạo theo thứ tự — template chi tiết trong `references/`.

#### File 1: `README.md` ← Tổng quan cho con người (1-2 trang)

Dùng template: `references/README_TEMPLATE.md`

**Nội dung:**
- Mục tiêu dự án (2-3 câu)
- Tech stack
- Cách cài đặt / chạy (cho team member mới)
- Link đến các docs khác

**Độ dài:** 50-100 dòng, không dài hơn.

---

#### File 2: `CLAUDE.md` ← Context tối ưu cho AI (100-200 dòng)

**ĐÂY LÀ FILE QUAN TRỌNG NHẤT** — paste file này vào Claude session mới để AI có đủ context làm việc tiếp.

Dùng template: `references/CLAUDE_TEMPLATE.md`

**Structure bắt buộc:**
```markdown
# CLAUDE.md — [Tên dự án]

## TÓM TẮT 30 GIÂY
[2-3 câu: hệ thống làm gì, input/output]

## TECH STACK
[Bảng ngắn gọn]

## CẤU TRÚC CODE
[File tree + flow chính]

## CRITICAL CONSTRAINTS ⚠️
### Hard constraints (KHÔNG được thay đổi)
- ⚠️ [Config hard-coded]
- ⚠️ [Breaking changes nếu sửa]

### Known gotchas
- 🐛 [Bug/issue đã biết]

## COMMON TASKS
[2-3 tasks thường làm + hướng dẫn step-by-step]

## DATA SCHEMAS (nếu có)
[Chỉ schemas quan trọng nhất]

## QUICK REFERENCE
- Chạy local: [command]
- Deploy: [command]
- Logs: [location]
```

**Nguyên tắc viết CLAUDE.md:**
- Ngắn gọn: 100-200 dòng MAX
- Critical-first: constraints & gotchas lên đầu
- Actionable: mỗi section phải có info cụ thể
- Code examples: luôn có snippet minh họa

---

#### File 3: `SOP.md` ← Quy trình vận hành

Dùng template: `references/SOP_TEMPLATE.md`

Dành cho operator / team member vận hành hệ thống.

---

#### File 4: `CHANGELOG.md` ← Lịch sử version

Format chuẩn:
```markdown
# Changelog

## [v1.0] — YYYY-MM-DD
### Added
- [Tính năng chính]

### Technical
- Platform: [...]
- Stack: [...]

### Lessons Learned
- [Điều quan trọng nhất]
```

---

#### File 5: `CODE_SNAPSHOT.md` ← Code backup (nếu cần)

Chỉ tạo khi:
- Code dài > 200 dòng
- Nhiều file cần backup
- Không có GitHub repo public

**Quy tắc đóng gói code:**
- ✅ Hàm cốt lõi, entry point, helpers quan trọng
- ✅ Config structure (KHÔNG có credentials thật)
- ❌ Boilerplate, utility đơn giản
- ❌ Code auto-generated
- 📏 Mỗi đoạn < 50 dòng, tổng < 500 dòng

---

### Bước 3b: Tạo SPEC.md (nếu cần chi tiết kỹ thuật)

Chỉ tạo nếu:
- Dự án phức tạp (> 5 modules)
- Có nhiều integration
- Team cần implement thêm tính năng

Dùng format giống specs-design-agent → Data schemas, Module map, Business logic chi tiết.

---

### Bước 4: Review checklist (bắt buộc)

Claude phải tự review trước khi xuất:

**Completeness:**
- [ ] CLAUDE.md đủ để Claude mới làm việc tiếp không cần hỏi thêm?
- [ ] README.md có hướng dẫn cài đặt / chạy?
- [ ] SOP.md đủ chi tiết cho operator?
- [ ] CHANGELOG.md có version và ngày?

**CLAUDE.md quality:**
- [ ] CRITICAL CONSTRAINTS section có ít nhất 2 items cụ thể?
- [ ] COMMON TASKS có step-by-step guide?
- [ ] Độ dài 100-200 dòng (không dài hơn)?

**Code (nếu có CODE_SNAPSHOT):**
- [ ] Code quan trọng nhất đã capture?
- [ ] Không có credentials thật?
- [ ] Có comment giải thích phần phức tạp?

**Consistency:**
- [ ] Version nhất quán giữa các file?
- [ ] Không có placeholder chưa điền?

Nếu có mục chưa đạt → tự sửa. Sau đó báo người dùng đã review và điều chỉnh gì.

---

### Bước 5: Đóng gói và xuất

**Cấu trúc output:**
```
[project-name]-docs/
├── README.md          ← Tổng quan cho con người
├── CLAUDE.md          ← Context cho AI (file chính để paste)
├── SOP.md             ← Quy trình vận hành
├── CHANGELOG.md       ← Lịch sử version
├── CODE_SNAPSHOT.md   ← Code backup (nếu có)
└── SPEC.md            ← Chi tiết kỹ thuật (nếu phức tạp)
```

**Sau khi xuất, hướng dẫn:**

1. **Để làm việc với Claude:**
   - Paste `CLAUDE.md` vào session mới
   - Thêm link GitHub repo nếu có

2. **Để lưu vào Notion:**
   - Paste `README.md` vào page chính
   - Tạo sub-page cho SOP + CHANGELOG
   - Link đến GitHub repo

3. **Để push lên GitHub:**
   ```bash
   mkdir docs
   mv *-docs/* docs/
   git add docs/
   git commit -m "docs: add project documentation v1.0"
   git push
   ```

4. **Khi có update nhỏ:**
   - Chỉ cập nhật CHANGELOG (không cần wrap up lại)

5. **Khi refactor lớn:**
   - Wrap up lại với version mới (v2.0)

---

## So sánh với specs-design-agent

| | specs-design-agent | project-wrapup |
|---|---|---|
| **Khi nào dùng** | Thiết kế hệ thống MỚI | Tổng hợp dự án ĐÃ XONG |
| **Output chính** | SPEC.md (coding-ready) | CLAUDE.md (context cho AI) |
| **README.md** | ✅ Có | ✅ Có (format giống) |
| **SOP.md** | ✅ Có | ✅ Có (format giống) |
| **CLAUDE.md** | ✅ Tóm tắt từ SPEC | ✅ Tạo từ code + interview |
| **CHANGELOG.md** | ❌ Không (chưa có code) | ✅ Có |
| **CODE_SNAPSHOT.md** | ❌ Không | ✅ Có (nếu cần) |

**Hai skill bổ trợ cho nhau:**
- Dùng specs-design → implement code → dùng project-wrapup

---

## Đọc thêm

- `references/README_TEMPLATE.md` — Template cho README.md
- `references/CLAUDE_TEMPLATE.md` — Template cho CLAUDE.md (QUAN TRỌNG)
- `references/SOP_TEMPLATE.md` — Template cho SOP.md
- `references/LESSONS_LEARNED.md` — Cách viết lessons learned hiệu quả
