import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"

import { useStorage } from "@plasmohq/storage/hook"

import { AnalysisResultsDisplay } from "~components/AnalysisResults"
import { AnswerDisplay } from "~features/answer-display"
import type { AnalysisResults, ScreenshotData } from "~types"
import { screenshotHelpers, storageHelpers } from "~utils/storage"

import "~style.css"

function IndexPopup() {
  const [lastScreenshot, setLastScreenshot] = useState<ScreenshotData | null>(
    null
  )
  const [lastAnalysis, setLastAnalysis] =
    useStorage<AnalysisResults>("lastAnalysis")
  const [isAnalyzing, setIsAnalyzing] = useStorage("isAnalyzing", false)
  const [error, setError] = useState<string | null>(null)
  const [showAnswerOverlay, setShowAnswerOverlay] = useStorage(
    "showAnswerOverlay",
    false
  )
  const [apiKey, setApiKey] = useStorage<string>("geminiApiKey", "")
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState("")

  console.log("lastAnalysis:", lastAnalysis)

  // Check if API key is available
  const hasApiKey = Boolean(apiKey)

  useEffect(() => {
    // Load existing screenshot from background on popup open
    screenshotHelpers.getLastScreenshot().then((screenshot) => {
      setLastScreenshot(screenshot)
    })

    // Sync isAnalyzing state từ storage khi popup mở
    storageHelpers.getIsAnalyzing().then((analyzing) => {
      setIsAnalyzing(analyzing)
    })

    // Lắng nghe message từ background
    const handleMessage = (message: any) => {
      if (message.action === "SCREENSHOT_SAVED") {
        setLastScreenshot(message.screenshot)
        setError(null)
      }

      if (message.action === "SCREENSHOT_CLEARED") {
        setLastScreenshot(null)
        setError(null)
      }

      if (message.action === "ANALYSIS_COMPLETE") {
        setLastAnalysis(message.result)
        setIsAnalyzing(false)
        setError(null)
      }

      if (message.action === "ANALYSIS_ERROR") {
        setError(message.error)
        setIsAnalyzing(false)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  const handleAnalyzeImage = () => {
    if (!lastScreenshot || isAnalyzing) return

    setIsAnalyzing(true)
    setError(null)
    setLastAnalysis(null) // Xóa kết quả cũ
    setShowAnswerOverlay(false) // Tắt overlay

    // Gửi request đến background để phân tích
    chrome.runtime.sendMessage({
      action: "ANALYZE_SCREENSHOT",
      imageBase64: lastScreenshot.imageBase64
    })
  }

  const handleClearScreenshot = () => {
    screenshotHelpers.clearScreenshot()
    setLastScreenshot(null)
    setError(null)
  }

  const handleSaveApiKey = async () => {
    const trimmedKey = apiKeyInput.trim()
    if (!trimmedKey) {
      setError("Vui lòng nhập API key")
      return
    }
    if (!trimmedKey.startsWith("AIza")) {
      setError("API key không hợp lệ (phải bắt đầu với 'AIza')")
      return
    }
    await storageHelpers.setApiKey(trimmedKey)
    setApiKey(trimmedKey)
    setApiKeyInput("")
    setShowApiKeyInput(false)
    setError(null)
  }

  const handleChangeApiKey = () => {
    setApiKeyInput(apiKey || "")
    setShowApiKeyInput(true)
  }

  const handleRemoveApiKey = async () => {
    if (confirm("Bạn có chắc muốn xóa API key?")) {
      await storageHelpers.removeApiKey()
      setApiKey("")
      setApiKeyInput("")
      setShowApiKeyInput(true)
    }
  }

  return (
    <div className="plasmo-w-96 plasmo-p-4 plasmo-bg-white">
      <div className="plasmo-mb-4">
        <h1 className="plasmo-text-lg plasmo-font-bold plasmo-text-center plasmo-mb-2">
          Screenshot AI
        </h1>
      </div>

      {/* API Key Section */}
      {!hasApiKey || showApiKeyInput ? (
        <div className="plasmo-mb-4 plasmo-p-4 plasmo-bg-yellow-50 plasmo-rounded-lg plasmo-border plasmo-border-yellow-200">
          <h3 className="plasmo-font-semibold plasmo-text-sm plasmo-mb-2 plasmo-text-yellow-800">
            🔑 Cấu hình Gemini API Key
          </h3>
          <p className="plasmo-text-xs plasmo-text-yellow-700 plasmo-mb-3">
            Lấy API key miễn phí tại:{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              className="plasmo-underline plasmo-text-blue-600">
              Google AI Studio
            </a>
          </p>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Nhập API key của bạn..."
            className="plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-border plasmo-border-gray-300 plasmo-rounded-lg plasmo-mb-2 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-blue-500"
            onKeyPress={(e) => e.key === "Enter" && handleSaveApiKey()}
          />
          <div className="plasmo-flex plasmo-space-x-2">
            <button
              onClick={handleSaveApiKey}
              className="plasmo-flex-1 plasmo-py-2 plasmo-rounded-lg plasmo-font-medium plasmo-text-sm plasmo-bg-blue-600 plasmo-text-white hover:plasmo-bg-blue-700">
              Lưu API Key
            </button>
            {hasApiKey && (
              <button
                onClick={() => {
                  setShowApiKeyInput(false)
                  setApiKeyInput("")
                  setError(null)
                }}
                className="plasmo-px-4 plasmo-py-2 plasmo-rounded-lg plasmo-font-medium plasmo-text-sm plasmo-bg-gray-200 plasmo-text-gray-700 hover:plasmo-bg-gray-300">
                Hủy
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="plasmo-mb-4 plasmo-p-3 plasmo-bg-green-50 plasmo-rounded-lg plasmo-border plasmo-border-green-200 plasmo-flex plasmo-items-center plasmo-justify-between">
          <div className="plasmo-flex plasmo-items-center">
            <span className="plasmo-text-green-600 plasmo-mr-2">✓</span>
            <span className="plasmo-text-sm plasmo-text-green-800 plasmo-font-medium">
              API Key đã cấu hình
            </span>
          </div>
          <div className="plasmo-flex plasmo-space-x-2">
            <button
              onClick={handleChangeApiKey}
              className="plasmo-text-xs plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-underline">
              Đổi
            </button>
            <button
              onClick={handleRemoveApiKey}
              className="plasmo-text-xs plasmo-text-red-600 hover:plasmo-text-red-800 plasmo-underline">
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* Screenshot Section */}
      {lastScreenshot ? (
        <div className="plasmo-border-t plasmo-pt-4 plasmo-space-y-4">
          <h2 className="plasmo-font-bold plasmo-text-base plasmo-mb-3 plasmo-text-blue-600">
            Screenshot đã chụp:
          </h2>

          {/* Screenshot Image */}
          <div className="plasmo-mb-4">
            <div className="plasmo-relative plasmo-group">
              <img
                src={lastScreenshot.imageBase64}
                alt="Screenshot"
                className="plasmo-w-full plasmo-rounded-lg plasmo-border plasmo-border-gray-200 plasmo-shadow-sm plasmo-cursor-pointer plasmo-hover:shadow-md plasmo-transition-shadow"
                style={{ maxHeight: "200px", objectFit: "contain" }}
                onClick={() =>
                  window.open(lastScreenshot.imageBase64, "_blank")
                }
                title="Click để xem ảnh full size"
              />
              <div className="plasmo-absolute plasmo-top-2 plasmo-right-2 plasmo-bg-black plasmo-bg-opacity-50 plasmo-text-white plasmo-text-xs plasmo-px-2 plasmo-py-1 plasmo-rounded plasmo-opacity-0 group-hover:plasmo-opacity-100 plasmo-transition-opacity">
                Click để phóng to
              </div>
            </div>
            <div className="plasmo-mt-2 plasmo-text-xs plasmo-text-gray-500 plasmo-text-center">
              Chụp lúc:{" "}
              {new Date(lastScreenshot.timestamp).toLocaleString("vi-VN")} •
              Kích thước: {lastScreenshot.area.width}x
              {lastScreenshot.area.height}px
            </div>
          </div>

          {/* Action Buttons */}
          <div className="plasmo-mb-4 plasmo-space-y-2">
            <button
              onClick={handleAnalyzeImage}
              disabled={!hasApiKey || isAnalyzing}
              className={`plasmo-w-full plasmo-py-3 plasmo-rounded-lg plasmo-font-medium plasmo-text-sm ${
                hasApiKey && !isAnalyzing
                  ? "plasmo-bg-blue-600 plasmo-text-white hover:plasmo-bg-blue-700"
                  : "plasmo-bg-gray-300 plasmo-text-gray-500 plasmo-cursor-not-allowed"
              }`}>
              {isAnalyzing
                ? "Đang phân tích..."
                : !hasApiKey
                  ? "Cần API Key"
                  : "Hỏi"}
            </button>

            <div className="plasmo-flex plasmo-space-x-2">
              <button
                onClick={handleClearScreenshot}
                className="plasmo-flex-1 plasmo-py-2 plasmo-rounded-lg plasmo-font-medium plasmo-text-sm plasmo-bg-gray-100 plasmo-text-gray-700 hover:plasmo-bg-gray-200 plasmo-border plasmo-border-gray-300">
                Chụp lại
              </button>

              {lastAnalysis &&
                lastAnalysis.length > 0 &&
                lastAnalysis.some((result) => result.type === "markdown") && (
                  <button
                    onClick={() => setShowAnswerOverlay(!showAnswerOverlay)}
                    className={`plasmo-flex-1 plasmo-py-2 plasmo-rounded-lg plasmo-font-medium plasmo-text-sm plasmo-border ${
                      showAnswerOverlay
                        ? "plasmo-bg-green-100 plasmo-text-green-700 plasmo-border-green-300"
                        : "plasmo-bg-yellow-100 plasmo-text-yellow-700 plasmo-border-yellow-300"
                    }`}>
                    {showAnswerOverlay ? "Ẩn đáp án" : "Hiện đáp án"}
                  </button>
                )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="plasmo-p-3 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-lg">
              <h3 className="plasmo-font-medium plasmo-text-sm plasmo-mb-1 plasmo-text-red-700">
                Lỗi:
              </h3>
              <p className="plasmo-text-sm plasmo-text-red-800">{error}</p>
            </div>
          )}

          {/* Analysis Results */}
          {isAnalyzing ? (
            <div className="plasmo-space-y-4">
              <h2 className="plasmo-font-bold plasmo-text-base plasmo-mb-3 plasmo-text-blue-600">
                Đang phân tích...
              </h2>
              <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-p-8">
                <div className="plasmo-animate-spin plasmo-rounded-full plasmo-h-8 plasmo-w-8 plasmo-border-b-2 plasmo-border-blue-600"></div>
                <span className="plasmo-ml-3 plasmo-text-sm plasmo-text-gray-600">
                  Gemini AI đang phân tích hình ảnh...
                </span>
              </div>
            </div>
          ) : (
            lastAnalysis &&
            lastAnalysis.length > 0 && (
              <div className="plasmo-space-y-4">
                <h2 className="plasmo-font-bold plasmo-text-base plasmo-mb-3 plasmo-text-blue-600">
                  Kết quả phân tích:
                </h2>
                {lastAnalysis.map((result, index) => (
                  <div
                    key={index}
                    className="plasmo-bg-gray-50 plasmo-rounded-lg plasmo-p-4 plasmo-border plasmo-border-gray-200">
                    {/* Render markdown content */}
                    {result.type === "markdown" ? (
                      <div className="plasmo-prose plasmo-prose-sm plasmo-max-w-none">
                        <ReactMarkdown
                          components={{
                            // Custom styling for markdown elements
                            h1: ({ children }) => (
                              <h1 className="plasmo-text-lg plasmo-font-bold plasmo-text-gray-800 plasmo-mb-2">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="plasmo-text-base plasmo-font-bold plasmo-text-gray-800 plasmo-mb-2 plasmo-mt-3">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="plasmo-text-sm plasmo-font-bold plasmo-text-gray-700 plasmo-mb-1">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="plasmo-text-sm plasmo-text-gray-800 plasmo-mb-2 plasmo-leading-relaxed">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="plasmo-list-disc plasmo-pl-4 plasmo-mb-2 plasmo-space-y-1">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="plasmo-list-decimal plasmo-pl-4 plasmo-mb-2 plasmo-space-y-1">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="plasmo-text-sm plasmo-text-gray-700">
                                {children}
                              </li>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="plasmo-border-l-4 plasmo-border-green-400 plasmo-bg-green-50 plasmo-pl-4 plasmo-py-2 plasmo-mb-2 plasmo-italic">
                                <div className="plasmo-text-sm plasmo-text-green-800">
                                  {children}
                                </div>
                              </blockquote>
                            ),
                            code: ({ children, ...props }) =>
                              props.className?.includes("inline") ? (
                                <code className="plasmo-bg-gray-100 plasmo-px-1 plasmo-py-0.5 plasmo-rounded plasmo-text-xs plasmo-font-mono plasmo-text-gray-800">
                                  {children}
                                </code>
                              ) : (
                                <pre className="plasmo-bg-gray-100 plasmo-p-2 plasmo-rounded plasmo-text-xs plasmo-font-mono plasmo-overflow-x-auto plasmo-mb-2">
                                  <code>{children}</code>
                                </pre>
                              ),
                            strong: ({ children }) => (
                              <strong className="plasmo-font-bold plasmo-text-gray-900">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="plasmo-italic plasmo-text-gray-700">
                                {children}
                              </em>
                            ),
                            hr: () => (
                              <hr className="plasmo-border-t plasmo-border-gray-300 plasmo-my-3" />
                            ),
                            table: ({ children }) => (
                              <div className="plasmo-overflow-x-auto plasmo-mb-2">
                                <table className="plasmo-min-w-full plasmo-text-xs plasmo-border-collapse">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="plasmo-border plasmo-border-gray-300 plasmo-px-2 plasmo-py-1 plasmo-bg-gray-50 plasmo-font-semibold plasmo-text-left">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="plasmo-border plasmo-border-gray-300 plasmo-px-2 plasmo-py-1">
                                {children}
                              </td>
                            )
                          }}>
                          {result.correctAnswer as string}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      // Fallback for old format (backward compatibility)
                      <AnalysisResultsDisplay results={[result]} />
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      ) : (
        <div className="plasmo-text-center plasmo-text-gray-500 plasmo-py-8">
          <p className="plasmo-text-sm">Chưa có screenshot nào.</p>
          <p className="plasmo-text-xs plasmo-mt-1">
            Chuột phải và chọn "Start Screenshot" để bắt đầu!
          </p>
        </div>
      )}

      {/* Instructions when has screenshot */}
      {lastScreenshot && (
        <div className="plasmo-mt-4 plasmo-p-3 plasmo-bg-blue-50 plasmo-rounded-lg">
          <h3 className="plasmo-font-medium plasmo-text-sm plasmo-mb-1 plasmo-text-blue-700">
            💡 Tip:
          </h3>
          <p className="plasmo-text-xs plasmo-text-blue-600">
            Bạn có thể chuột phải và chọn "Hỏi" để phân tích nhanh không cần mở
            popup!
          </p>
        </div>
      )}

      {/* Answer Overlay */}
      {showAnswerOverlay && (
        <div className="plasmo-fixed plasmo-bottom-4 plasmo-right-4 plasmo-z-50">
          <AnswerDisplay />
        </div>
      )}
    </div>
  )
}

export default IndexPopup
