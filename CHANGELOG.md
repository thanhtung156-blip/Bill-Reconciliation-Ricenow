# CHANGELOG — Bill Reconciliation System

## [v2.3] — 2026-04-17 (Current)
### Added
- Tích hợp Gemini AI để parse nội dung bill thay vì dùng Regex.
- Pipeline 4 bước rõ ràng: OCR -> Gemini -> Match -> Write.
- Giao diện Upload mới với log màu sắc và tiến trình pipeline.

## [v2.2] — 2026-04
### Added
- Hỗ trợ đọc bill từ label "Lời nhắn" (SHB, Techcombank).
- Cơ chế xóa file trùng tên (ghi đè) khi upload.

## [v2.1] — 2026-04
### Added
- Chuyển sang dùng Service Account JSON cho Cloud Vision (Bảo mật hơn API Key).

## [v2.0] — 2026-04
### Added
- Sử dụng Cloud Vision làm OCR chính thay cho LLM multimodal.
