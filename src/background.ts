import type { AnalysisResult, ScreenshotData } from "~types"
import { storageHelpers } from "~utils/storage"

// In-memory storage for screenshot data
let currentScreenshot: ScreenshotData | null = null
let isAnalyzing = false

// Khôi phục isAnalyzing state từ storage khi khởi động
storageHelpers.getIsAnalyzing().then((analyzing) => {
  isAnalyzing = analyzing
  updateContextMenus()
})

// Tạo context menu khi extension được cài đặt
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "start-screenshot",
    title: "Start Screenshot",
    contexts: ["page", "selection", "image", "link", "all"],
    enabled: true // Luôn enabled để có thể chụp mới
  })

  chrome.contextMenus.create({
    id: "ask-question",
    title: "Hỏi",
    contexts: ["page", "selection", "image", "link", "all"],
    enabled: false // Disabled by default until we have a screenshot
  })
})

// Helper function để reset analyzing state
function resetAnalyzingState() {
  isAnalyzing = false
  storageHelpers.setIsAnalyzing(false)
  updateContextMenus()
}

// Helper functions để manage context menu state
function updateContextMenus() {
  const hasScreenshot = currentScreenshot !== null

  // "Start Screenshot" luôn enable để có thể chụp mới
  chrome.contextMenus.update("start-screenshot", {
    enabled: true
  })

  // "Hỏi" chỉ enable khi có screenshot và không đang phân tích
  chrome.contextMenus.update("ask-question", {
    enabled: hasScreenshot && !isAnalyzing
  })
}

// Xử lý khi user click vào context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "start-screenshot" && tab?.id) {
    // Gửi message đến content script để bắt đầu screenshot
    chrome.tabs.sendMessage(tab.id, {
      action: "START_SCREENSHOT"
    })
  }

  if (
    info.menuItemId === "ask-question" &&
    tab?.id &&
    currentScreenshot &&
    !isAnalyzing
  ) {
    // Set analyzing state và update menu
    isAnalyzing = true
    storageHelpers.setIsAnalyzing(true)
    updateContextMenus()

    // Phân tích screenshot hiện tại
    analyzeImageWithGemini(currentScreenshot.imageBase64)
      .then((result) => {
        // Lưu kết quả vào storage
        storageHelpers.setLastAnalysis(result)

        // Reset analyzing state
        isAnalyzing = false
        storageHelpers.setIsAnalyzing(false)
        updateContextMenus()

        // Thông báo cho popup và content script cập nhật
        chrome.runtime.sendMessage({
          action: "ANALYSIS_COMPLETE",
          result
        })
      })
      .catch((error) => {
        console.error("Error analyzing image:", error)

        // Reset analyzing state
        isAnalyzing = false
        updateContextMenus()

        chrome.runtime.sendMessage({
          action: "ANALYSIS_ERROR",
          error: error.message
        })
      })
  }
})

// Lắng nghe message từ content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "CAPTURE_SCREENSHOT") {
    console.log("CAPTURE_SCREENSHOT message received")
    const { area } = message

    // Capture visible tab
    chrome.tabs.captureVisibleTab(
      sender.tab?.windowId,
      { format: "png" },
      (dataUrl) => {
        if (dataUrl) {
          // Gửi dataUrl về content script để crop
          chrome.tabs.sendMessage(sender.tab!.id!, {
            action: "CROP_SCREENSHOT",
            dataUrl,
            area
          })
        }
      }
    )
  }

  if (message.action === "SAVE_SCREENSHOT") {
    const { croppedImage, area } = message

    // Lưu screenshot vào in-memory storage
    currentScreenshot = {
      imageBase64: croppedImage,
      timestamp: Date.now(),
      area
    }

    // Update context menu state
    updateContextMenus()

    // Thông báo cho popup cập nhật
    chrome.runtime.sendMessage({
      action: "SCREENSHOT_SAVED",
      screenshot: currentScreenshot
    })
  }

  if (message.action === "GET_SCREENSHOT") {
    // Trả về screenshot hiện tại cho popup
    sendResponse({ screenshot: currentScreenshot })
    return true // Keep message channel open for async response
  }

  if (message.action === "CLEAR_SCREENSHOT") {
    // Xóa screenshot khỏi memory
    currentScreenshot = null
    updateContextMenus()

    // Thông báo screenshot đã được clear
    chrome.runtime.sendMessage({
      action: "SCREENSHOT_CLEARED"
    })

    sendResponse({ success: true })
    return true
  }

  if (message.action === "ANALYZE_SCREENSHOT") {
    const { imageBase64 } = message

    // Set analyzing state và update menu
    isAnalyzing = true
    storageHelpers.setIsAnalyzing(true)
    updateContextMenus()

    // Gọi Gemini AI API để phân tích
    analyzeImageWithGemini(imageBase64)
      .then((result) => {
        // Lưu kết quả vào storage
        storageHelpers.setLastAnalysis(result)

        // Reset analyzing state
        isAnalyzing = false
        storageHelpers.setIsAnalyzing(false)
        updateContextMenus()

        // Thông báo cho popup cập nhật
        chrome.runtime.sendMessage({
          action: "ANALYSIS_COMPLETE",
          result
        })
      })
      .catch((error) => {
        console.error("Error analyzing image:", error)

        // Reset analyzing state
        isAnalyzing = false
        updateContextMenus()

        chrome.runtime.sendMessage({
          action: "ANALYSIS_ERROR",
          error: error.message
        })
      })
  }
})

// Hàm gọi Gemini AI API
async function analyzeImageWithGemini(
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

export {}
