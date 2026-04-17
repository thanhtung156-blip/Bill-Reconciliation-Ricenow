# CODE SNAPSHOT — v2.3 (Doisoat_ricenow.js)

## 1. Pipeline chính
```javascript
function processImage(base64, mimeType, sheet, driveFile, cfg) {
  // 1. Cloud Vision OCR
  const ocrResult = runCloudVisionOCR(base64, cfg.visionJson);
  
  // 2. Gemini AI Parse
  const parsed = parseWithGemini(ocrResult.text, students, cfg.geminiModel, cfg.geminiKey);
  
  // 3. Fuzzy Match
  const match = fuzzyMatchStudent(parsed.studentName, students);
  
  // 4. Ghi Sheet
  cell.setValue(parsed.amount);
}
```

## 2. Gemini Prompt
```javascript
function buildGeminiPrompt(rawText, studentListText) {
  return `Tìm phần "Nội dung" / "Lời nhắn" trong bill. 
          Tách tên học sinh và số tiền. 
          Match với danh sách: ${studentListText}`;
}
```
