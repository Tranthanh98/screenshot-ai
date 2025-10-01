import { analyzeImageWithGemini } from "~lib/analyzeImageWithGemini"
import { analyzeTextWithGemini } from "~lib/analyzeTextWithGemini"
import type { ScreenshotData } from "~types"
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

        // Thông báo cho popup, sidepanel và content script cập nhật
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

    // Thông báo cho popup và sidepanel cập nhật
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

        // Thông báo cho popup và sidepanel cập nhật
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

  if (message.action === "ANALYZE_TEXT_QUESTION") {
    const { question, messageId } = message

    // Set analyzing state
    isAnalyzing = true
    storageHelpers.setIsAnalyzing(true)
    updateContextMenus()

    // Analyze text question with Gemini
    analyzeTextWithGemini(question)
      .then((result) => {
        // Save result to storage
        storageHelpers.setLastAnalysis(result)

        // Reset analyzing state
        isAnalyzing = false
        storageHelpers.setIsAnalyzing(false)
        updateContextMenus()

        // Notify components
        chrome.runtime.sendMessage({
          action: "ANALYSIS_COMPLETE",
          result,
          messageId
        })
      })
      .catch((error) => {
        console.error("Error analyzing text question:", error)

        // Reset analyzing state
        isAnalyzing = false
        storageHelpers.setIsAnalyzing(false)
        updateContextMenus()

        chrome.runtime.sendMessage({
          action: "ANALYSIS_ERROR",
          error: error.message,
          messageId
        })
      })
  }
})

export {}
