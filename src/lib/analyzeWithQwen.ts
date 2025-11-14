import type { AnalysisResult } from "~types"

// Hàm gọi LM Studio API (Qwen VL model running locally)
export async function analyzeImageWithQwen(
  imageBase64: string
): Promise<AnalysisResult[]> {
  const LM_STUDIO_URL = "http://127.0.0.1:1234/v1/chat/completions"

  // Extract base64 data without prefix
  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64

  try {
    const response = await fetch(LM_STUDIO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen-vl-4b",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image carefully. Your task is to:
1. READ and EXTRACT all questions/problems from the image
2. ANSWER each question with the CORRECT answer ONLY

IMPORTANT RULES:
- Provide ONLY the correct answer, NO explanations or steps
- For multiple choice: give the correct option (e.g., "B. Hanoi")
- For math problems: give ONLY the final result
- For coding problems: provide ONLY the complete working code
- For text questions: give direct, concise answers

Format your response in markdown:

**Structure:**
- Use heading (##) to separate each question
- Use **bold** for the question text
- Use > blockquote for the answer
- Use --- to separate multiple questions

**Example 1 - Multiple Choice:**
## Question 1
**What is the capital of Vietnam?**

> **Answer:** B. Hanoi

---

**Example 2 - Math:**
## Question 2
**Solve: 2x + 5 = 13**

> **Answer:** x = 4

---

**Example 3 - Programming:**
## Question 3
**Write a factorial function in Python**

> **Answer:**
> \`\`\`python
> def factorial(n):
>     if n <= 1:
>         return 1
>     return n * factorial(n - 1)
> \`\`\`

CRITICAL: You MUST provide the ANSWER to each question, not just extract the question text. Read the image, understand the question, and give the correct answer.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `LM Studio API error: ${response.status} - ${errorText}`
      )
    }

    const data = await response.json()

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const markdownText = data.choices[0].message.content

      console.log("Qwen VL response:", markdownText)

      return [
        {
          correctAnswer: markdownText,
          type: "markdown"
        }
      ]
    }

    throw new Error("No response from Qwen VL model")
  } catch (error) {
    console.error("Qwen VL API error:", error)
    throw new Error(
      `Không thể kết nối với LM Studio. Đảm bảo LM Studio đang chạy tại http://127.0.0.1:1234 và model qwen-vl-4b đã được load. Chi tiết: ${error.message}`
    )
  }
}

// Hàm gọi LM Studio API cho text question
export async function analyzeTextWithQwen(
  question: string
): Promise<AnalysisResult[]> {
  const LM_STUDIO_URL = "http://127.0.0.1:1234/v1/chat/completions"

  try {
    const response = await fetch(LM_STUDIO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen-vl-4b",
        messages: [
          {
            role: "user",
            content: `Analyze this question and provide ONLY the correct answer.

Question: "${question}"

IMPORTANT RULES:
- Provide ONLY the correct answer, NO explanations
- For multiple choice: give the correct option
- For math problems: give ONLY the final result
- For coding problems: provide ONLY complete working code
- Be direct and concise

Format your response in markdown:
- Use **bold** for the question
- Use > blockquote for the answer
- For code: use \`\`\`language blocks

**Example 1:**
**What is 5 + 3?**

> **Answer:** 8

**Example 2:**
**Write hello world in Python**

> **Answer:**
> \`\`\`python
> print("Hello, World!")
> \`\`\`

CRITICAL: Provide the ANSWER, not just restating the question.`
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `LM Studio API error: ${response.status} - ${errorText}`
      )
    }

    const data = await response.json()

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const markdownText = data.choices[0].message.content

      console.log("Qwen VL text response:", markdownText)

      return [
        {
          question: question,
          correctAnswer: markdownText,
          type: "markdown"
        }
      ]
    }

    throw new Error("No response from Qwen VL model")
  } catch (error) {
    console.error("Qwen VL API error:", error)
    throw new Error(
      `Không thể kết nối với LM Studio. Đảm bảo LM Studio đang chạy tại http://127.0.0.1:1234 và model qwen-vl-4b đã được load. Chi tiết: ${error.message}`
    )
  }
}
