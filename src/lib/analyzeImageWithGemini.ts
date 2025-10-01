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
                text: `Phân tích hình ảnh này và trích xuất tất cả câu hỏi và các đáp án (nếu có).
                Nếu có nhiều câu hỏi trong hình ảnh, hãy trích xuất tất cả và trả về theo dạng array như format dưới đây theo từng loại câu hỏi
                Nếu là câu hỏi trắc nghiệm:
                    [{
                        "question": "câu hỏi", 
                        "options": ["A. đáp án A", "B. đáp án B", ...], 
                        "correctAnswer": "đáp án đúng",
                        "type": "multiple-choice"
                    }]
                Nếu là câu hỏi ngắn:
                    [{
                        "question": "câu hỏi",
                        "correctAnswer": "câu trả lời",
                        "type": "short-answer"
                    }]
                Nếu là câu hỏi điền chỗ trống:
                    [{
                        "question": "câu hỏi (nếu có)",
                        "correctAnswer": ["đáp án 1", "đáp án 2", "..."],
                        "type": "fill-in-the-blank"
                    }]
                Có thể có nhiều câu hỏi trong 1 hình ảnh. Phải trả về đúng format JSON array, không thêm chú thích.`
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
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: {
                  type: "string",
                  description: "Câu hỏi (optional cho fill-in-the-blank)"
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

    console.log("Gemini response text:", text)
    try {
      // Parse JSON response từ Gemini
      const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        // Nếu trả về là array, giữ nguyên; nếu là object, wrap thành array
        return Array.isArray(parsed) ? parsed : [parsed]
      } else {
        // Fallback nếu không parse được JSON
        return [
          {
            correctAnswer: text,
            type: "short-answer"
          }
        ]
      }
    } catch (e) {
      return [
        {
          correctAnswer: text,
          type: "short-answer"
        }
      ]
    }
  }

  throw new Error("No response from Gemini AI")
}
