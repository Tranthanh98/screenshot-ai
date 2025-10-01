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
                text: `Phân tích câu hỏi sau và đưa ra câu trả lời chính xác. Trả về theo format JSON array:
                
Câu hỏi: "${question}"

Nếu là câu hỏi trắc nghiệm, trả về:
[{
  "question": "câu hỏi",
  "options": ["A. đáp án A", "B. đáp án B", "..."],
  "correctAnswer": "đáp án đúng",
  "type": "multiple-choice"
}]

Nếu là câu hỏi ngắn hoặc tự luận, trả về:
[{
  "question": "câu hỏi",
  "correctAnswer": "câu trả lời chi tiết",
  "type": "short-answer"
}]

Nếu là câu hỏi điền chỗ trống, trả về:
[{
  "question": "câu hỏi",
  "correctAnswer": ["đáp án 1", "đáp án 2", "..."],
  "type": "fill-in-the-blank"
}]

Phải trả về đúng format JSON array, không thêm chú thích.`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: {
                  type: "string",
                  description: "Câu hỏi"
                },
                options: {
                  type: "array",
                  items: { type: "string" },
                  description: "Các đáp án cho multiple-choice"
                },
                correctAnswer: {
                  description:
                    "Đáp án đúng - có thể là string hoặc array of strings"
                },
                type: {
                  type: "string",
                  enum: [
                    "multiple-choice",
                    "short-answer",
                    "fill-in-the-blank"
                  ],
                  description: "Loại câu hỏi"
                }
              },
              required: ["type", "correctAnswer"]
            }
          }
        }
      })
    }
  )

  const data = await response.json()

  if (data.candidates && data.candidates[0]) {
    const text = data.candidates[0].content.parts[0].text

    console.log("Gemini text response:", text)
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return Array.isArray(parsed) ? parsed : [parsed]
      } else {
        // Fallback for text questions
        return [
          {
            question: question,
            correctAnswer: text,
            type: "short-answer"
          }
        ]
      }
    } catch (e) {
      return [
        {
          question: question,
          correctAnswer: text,
          type: "short-answer"
        }
      ]
    }
  }

  throw new Error("No response from Gemini AI")
}
