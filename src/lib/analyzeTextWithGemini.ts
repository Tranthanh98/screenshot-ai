import type { AnalysisResult } from "~types"
import { storageHelpers } from "~utils/storage"

// Hàm gọi Gemini AI API cho text question
export async function analyzeTextWithGemini(
  question: string
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
                text: `Phân tích câu hỏi sau và đưa ra câu trả lời chính xác trong format markdown:
                
Câu hỏi: "${question}"

Hãy trả về kết quả phân tích dưới dạng markdown format với các quy tắc sau:
- Sử dụng heading (##) để phân biệt các câu hỏi nếu có nhiều câu
- Dùng **bold** để highlight câu hỏi chính
- Dùng > blockquote cho đáp án đúng
- Dùng bullet points (-) cho các lựa chọn trắc nghiệm
- Dùng numbered list (1.) cho câu trả lời có thứ tự
- Dùng \`code\` cho từ khóa quan trọng
- Dùng *italic* để nhấn mạnh

Ví dụ format:
## Câu hỏi 1
**Thủ đô của Việt Nam là gì?**

- A. TP.HCM
- B. Hà Nội  
- C. Đà Nẵng
- D. Cần Thơ

> **Đáp án:** B. Hà Nội

---

Trả về markdown thuần túy, không wrap trong code block hay JSON.`
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

    console.log("Gemini text response:", markdownText)

    // Trả về markdown content thay vì JSON structured data
    return [
      {
        question: question,
        correctAnswer: markdownText,
        type: "markdown"
      }
    ]
  }

  throw new Error("No response from Gemini AI")
}
