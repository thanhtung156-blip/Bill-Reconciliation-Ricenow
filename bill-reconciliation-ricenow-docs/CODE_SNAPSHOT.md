# CODE SNAPSHOT — Bill Reconciliation Ricenow (v2.3)

Tài liệu này lưu trữ các đoạn mã cốt lõi nhất của hệ thống để tham khảo nhanh. Toàn bộ mã nguồn nằm trong file `BillReconciliation_v2.3.gs`.

## 1. Pipeline chính (Orchestrator)

```javascript
function processImage(fileData, folderId) {
  try {
    // Bước 1: OCR lấy raw text
    const rawText = runCloudVisionOCR(fileData.bytes);
    
    // Bước 2: AI Parse lấy dữ liệu có cấu trúc
    const studentList = getStudentList();
    const aiResult = parseWithGemini(rawText, studentList);
    
    // Bước 3: Fuzzy Match kiểm chứng tên
    const match = fuzzyMatchStudent(aiResult.student_name, studentList);
    
    // Bước 4: Ghi kết quả
    if (match.score >= MIN_CONFIDENCE) {
      writeToSheet(match.studentName, aiResult.amount);
      manageDriveFile(fileData, folderId, true);
      return { success: true, name: match.studentName, amount: aiResult.amount };
    }
    return { success: false, error: "Không tìm thấy học sinh phù hợp" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

## 2. Gemini AI Parse Logic

```javascript
function parseWithGemini(rawText, studentList) {
  const prompt = `
    Phân tích văn bản OCR từ bill ngân hàng sau:
    "${rawText}"
    
    Nhiệm vụ: Tìm tên học sinh và số tiền chuyển khoản trong phần "Nội dung" hoặc "Lời nhắn".
    Danh sách học sinh gợi ý: ${studentList.join(", ")}
    
    Trả về định dạng JSON:
    {
      "student_name": "Tên đầy đủ",
      "amount": 123456,
      "confidence": 0.9
    }
  `;
  const response = callGeminiAPI(prompt);
  return JSON.parse(response);
}
```

## 3. Fuzzy Match Algorithm (4 cấp độ)

```javascript
function fuzzyMatchStudent(inputName, list) {
  const normInput = normalize(inputName);
  let bestMatch = { name: null, score: 0 };

  for (let student of list) {
    const normStudent = normalize(student);
    let score = 0;

    if (normInput === normStudent) score = 1.0; // Exact
    else if (normInput.includes(normStudent)) score = 0.9; // Subset
    else if (normStudent.includes(normInput)) score = 0.85; // Superset
    else if (calculateLevenshtein(normInput, normStudent) > 0.8) score = 0.8;

    if (score > bestMatch.score) {
      bestMatch = { name: student, score: score };
    }
  }
  return bestMatch;
}
```

## 4. Auth: OAuth2 JWT Flow (Service Account)

```javascript
function getServiceAccountToken(jsonKey) {
  const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
  const claimSet = JSON.stringify({
    iss: jsonKey.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  });
  
  const signature = Utilities.computeRsaSha256Signature(
    base64Encode(header) + "." + base64Encode(claimSet),
    jsonKey.private_key
  );
  // ... POST to token endpoint ...
}
```
