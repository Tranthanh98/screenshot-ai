import type { AnalysisResult } from "~types"
import { storageHelpers } from "~utils/storage"

// Hàm gọi Gemini AI API
export async function analyzeImageWithGemini(
  imageBase64: string
): Promise<AnalysisResult[]> {
  const API_KEY = storageHelpers.getApiKey()

  if (!API_KEY) {
    throw new Error(
      "Gemini API key not found. Please set PLASMO_PUBLIC_GEMINI_API_KEY in .env file."
    )
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Phân tích hình ảnh này và trích xuất tất cả câu hỏi cùng các đáp án trong format markdown.

Hãy phân tích và trả về kết quả dưới dạng markdown format với các quy tắc sau:
- Nếu có nhiều câu hỏi, sử dụng heading (##) để phân biệt từng câu
- Dùng **bold** để highlight câu hỏi chính
- Dùng > blockquote cho đáp án đúng hoặc giải thích
- Dùng bullet points (-) cho các lựa chọn trắc nghiệm
- Dùng numbered list (1.) cho câu trả lời có thứ tự hoặc bước giải
- Dùng \`code\` cho từ khóa, công thức, hay thuật ngữ quan trọng
- Dùng *italic* để nhấn mạnh
- Dùng tables cho dữ liệu có cấu trúc
- Dùng --- để ngăn cách giữa các câu hỏi

Ví dụ format:
## Câu 1
**Thủ đô của Việt Nam là gì?**

- A. TP.HCM
- B. Hà Nội  
- C. Đà Nẵng
- D. Cần Thơ

> **Đáp án:** B. Hà Nội
> 
> *Giải thích:* Hà Nội là thủ đô chính thức của Việt Nam từ năm 1945.

---

## Câu 2
**Tính \`2 + 3 × 4\`?**

> **Đáp án:** 14
>
> **Cách giải:**
> 1. Thực hiện phép nhân trước: 3 × 4 = 12
> 2. Cộng với 2: 2 + 12 = 14

> Phần giải thích phải ngắn ngọn, không dài dòng.
---

Trả về markdown thuần túy, không wrap trong code block.`
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: imageBase64.split(",")[1] // Remove data:image/png;base64, prefix
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    }
  )

  const data = await response.json()

  if (data.candidates && data.candidates[0]) {
    const markdownText = data.candidates[0].content.parts[0].text

    console.log("Gemini image response:", markdownText)

    // Trả về markdown content thay vì JSON structured data
    return [
      {
        correctAnswer: markdownText,
        type: "markdown"
      }
    ]
  }

  throw new Error("No response from Gemini AI")
}
