import { useEffect, useRef, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { ChatMessageItem } from "~sidepanel/components/ChatMessageItem"
import type { AIModel, AnalysisResults, ScreenshotData } from "~types"
import { conversationDB, type ChatMessage } from "~utils/db"
import { storageHelpers } from "~utils/storage"

import "~style.css"

function SidePanelPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAnalyzing] = useStorage("isAnalyzing", false)
  const [error, setError] = useState<string | null>(null)
  const [inputText, setInputText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [apiKey, setApiKey] = useStorage<string>("geminiApiKey", "")
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [selectedModel, setSelectedModel] = useStorage<AIModel>(
    "selectedAIModel",
    "gemini"
  )

  // Check if API key is available (only for Gemini)
  const hasApiKey = selectedModel === "qwen-local" || Boolean(apiKey)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Load messages from IndexedDB
  const loadMessages = async () => {
    try {
      const allMessages = await conversationDB.getAllMessages()
      setMessages(allMessages)
    } catch (error) {
      console.error("Error loading messages:", error)
      setError("Không thể tải tin nhắn")
    }
  }

  useEffect(() => {
    // Load messages when component mounts
    loadMessages()

    // Listen for screenshot and analysis updates
    const handleMessage = async (message: any) => {
      if (message.action === "SCREENSHOT_SAVED") {
        const { screenshot } = message as { screenshot: ScreenshotData }

        // Create new chat message
        const newMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          timestamp: Date.now(),
          screenshot,
          type: "screenshot"
        }

        try {
          await conversationDB.addMessage(newMessage)
          await loadMessages()
          setTimeout(scrollToBottom, 100)
        } catch (error) {
          console.error("Error saving message:", error)
          setError("Không thể lưu tin nhắn")
        }
      }

      if (message.action === "ANALYSIS_COMPLETE") {
        const { result } = message as { result: AnalysisResults }

        // Find the latest message and update it with analysis
        const allMessages = await conversationDB.getAllMessages()
        const latestMessage = allMessages[allMessages.length - 1]

        if (latestMessage && !latestMessage.analysis) {
          try {
            await conversationDB.updateMessage(latestMessage.id, {
              analysis: result,
              isAnalyzing: false
            })
            await loadMessages()
          } catch (error) {
            console.error("Error updating message:", error)
          }
        }
      }

      if (message.action === "ANALYSIS_ERROR") {
        const { error: analysisError } = message as { error: string }

        // Find the latest message and update it with error
        const allMessages = await conversationDB.getAllMessages()
        const latestMessage = allMessages[allMessages.length - 1]

        if (latestMessage && !latestMessage.analysis) {
          try {
            await conversationDB.updateMessage(latestMessage.id, {
              error: analysisError,
              isAnalyzing: false
            })
            await loadMessages()
          } catch (error) {
            console.error("Error updating message:", error)
          }
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  // Update analyzing state for latest message
  useEffect(() => {
    if (isAnalyzing && messages.length > 0) {
      const latestMessage = messages[messages.length - 1]
      if (
        latestMessage &&
        !latestMessage.analysis &&
        !latestMessage.isAnalyzing
      ) {
        conversationDB
          .updateMessage(latestMessage.id, { isAnalyzing: true })
          .then(() => loadMessages())
          .catch(console.error)
      }
    }
  }, [isAnalyzing, messages])

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleTakeScreenshot = () => {
    // Get current active tab and send screenshot message
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Error querying tabs:", chrome.runtime.lastError)
        setError("Không thể truy cập tab hiện tại. Vui lòng thử lại.")
        return
      }
      
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "START_SCREENSHOT" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error sending message:", chrome.runtime.lastError)
              setError(
                "Không thể gửi lệnh chụp màn hình. Hãy thử reload trang và thử lại."
              )
            }
          }
        )
      } else {
        setError("Không tìm thấy tab đang hoạt động")
      }
    })
  }

  const handleAnalyzeLatest = async () => {
    if (!hasApiKey || isAnalyzing || messages.length === 0) return

    const latestMessage = messages[messages.length - 1]
    if (latestMessage && !latestMessage.analysis) {
      if (latestMessage.type === "text" && latestMessage.textQuestion) {
        // Text question analysis
        chrome.runtime.sendMessage({
          action: "ANALYZE_TEXT_QUESTION",
          question: latestMessage.textQuestion,
          messageId: latestMessage.id
        })
      } else if (latestMessage.screenshot) {
        // Image analysis
        chrome.runtime.sendMessage({
          action: "ANALYZE_SCREENSHOT",
          imageBase64: latestMessage.screenshot.imageBase64
        })
      }
    }
  }

  const handleSendTextMessage = async () => {
    if (!inputText.trim()) return

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      timestamp: Date.now(),
      textQuestion: inputText.trim(),
      type: "text"
    }

    try {
      await conversationDB.addMessage(newMessage)
      await loadMessages()
      setInputText("")
      setTimeout(scrollToBottom, 100)

      // Auto analyze text question if has API key
      if (hasApiKey) {
        await conversationDB.updateMessage(newMessage.id, { isAnalyzing: true })
        await loadMessages()

        // Send to Gemini for text-based analysis
        chrome.runtime.sendMessage({
          action: "ANALYZE_TEXT_QUESTION",
          question: newMessage.textQuestion,
          messageId: newMessage.id
        })
      }
    } catch (error) {
      console.error("Error sending text message:", error)
      setError("Không thể gửdi tin nhắn")
    }
  }

  const handlePasteImage = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = async (e) => {
            const imageBase64 = e.target?.result as string

            const newMessage: ChatMessage = {
              id: `msg_${Date.now()}`,
              timestamp: Date.now(),
              screenshot: {
                imageBase64,
                timestamp: Date.now(),
                area: { x: 0, y: 0, width: 0, height: 0 }
              },
              type: "paste"
            }

            try {
              await conversationDB.addMessage(newMessage)
              await loadMessages()
              setTimeout(scrollToBottom, 100)
            } catch (error) {
              console.error("Error saving pasted image:", error)
              setError("Không thể lưu ảnh")
            }
          }
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageBase64 = e.target?.result as string

      const newMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        timestamp: Date.now(),
        screenshot: {
          imageBase64,
          timestamp: Date.now(),
          area: { x: 0, y: 0, width: 0, height: 0 }
        },
        type: "paste"
      }

      try {
        await conversationDB.addMessage(newMessage)
        await loadMessages()
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        console.error("Error saving uploaded image:", error)
        setError("Không thể lưu ảnh")
      }
    }
    reader.readAsDataURL(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClearConversation = async () => {
    if (window.confirm("Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện?")) {
      try {
        await conversationDB.clearAll()
        setMessages([])
        setError(null)
      } catch (error) {
        console.error("Error clearing conversation:", error)
        setError("Không thể xóa cuộc trò chuyện")
      }
    }
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

  const handleModelChange = async (model: AIModel) => {
    await storageHelpers.setSelectedModel(model)
    setSelectedModel(model)
  }

  return (
    <div className="plasmo-h-screen plasmo-flex plasmo-flex-col plasmo-bg-gray-50">
      {/* Header */}
      <div className="plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-p-4">
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-3">
          <h1 className="plasmo-text-lg plasmo-font-bold plasmo-text-gray-800">
            Screenshot AI Chat
          </h1>
          <button
            onClick={handleClearConversation}
            disabled={messages.length === 0}
            className={`plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded ${
              messages.length > 0
                ? "plasmo-bg-red-100 plasmo-text-red-700 hover:plasmo-bg-red-200"
                : "plasmo-bg-gray-100 plasmo-text-gray-400 plasmo-cursor-not-allowed"
            }`}>
            🗑️ Clear
          </button>
        </div>

        {/* Model Selection */}
        <div className="plasmo-mb-3">
          <label className="plasmo-text-xs plasmo-text-gray-600 plasmo-mb-1 plasmo-block">
            🤖 AI Model:
          </label>
          <div className="plasmo-flex plasmo-space-x-2">
            <button
              onClick={() => handleModelChange("gemini")}
              className={`plasmo-flex-1 plasmo-px-3 plasmo-py-2 plasmo-text-xs plasmo-rounded plasmo-border plasmo-transition-colors ${
                selectedModel === "gemini"
                  ? "plasmo-bg-blue-500 plasmo-text-white plasmo-border-blue-600"
                  : "plasmo-bg-white plasmo-text-gray-700 plasmo-border-gray-300 hover:plasmo-bg-gray-50"
              }`}>
              <div className="plasmo-font-medium">Gemini</div>
              <div className="plasmo-text-xs plasmo-opacity-75">Cloud API</div>
            </button>
            <button
              onClick={() => handleModelChange("qwen-local")}
              className={`plasmo-flex-1 plasmo-px-3 plasmo-py-2 plasmo-text-xs plasmo-rounded plasmo-border plasmo-transition-colors ${
                selectedModel === "qwen-local"
                  ? "plasmo-bg-purple-500 plasmo-text-white plasmo-border-purple-600"
                  : "plasmo-bg-white plasmo-text-gray-700 plasmo-border-gray-300 hover:plasmo-bg-gray-50"
              }`}>
              <div className="plasmo-font-medium">Qwen VL</div>
              <div className="plasmo-text-xs plasmo-opacity-75">Local</div>
            </button>
          </div>
        </div>

        {/* API Key Section - Only show for Gemini */}
        {selectedModel === "gemini" &&
          (!hasApiKey || showApiKeyInput ? (
          <div className="plasmo-p-3 plasmo-bg-yellow-50 plasmo-rounded-lg plasmo-border plasmo-border-yellow-200">
            <h3 className="plasmo-font-semibold plasmo-text-xs plasmo-mb-1 plasmo-text-yellow-800">
              🔑 Cấu hình API Key
            </h3>
            <p className="plasmo-text-xs plasmo-text-yellow-700 plasmo-mb-2">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                className="plasmo-underline">
                Lấy API key miễn phí
              </a>
            </p>
            <div className="plasmo-flex plasmo-space-x-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Nhập API key..."
                className="plasmo-flex-1 plasmo-px-2 plasmo-py-1 plasmo-text-xs plasmo-border plasmo-border-gray-300 plasmo-rounded focus:plasmo-outline-none focus:plasmo-ring-1 focus:plasmo-ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && handleSaveApiKey()}
              />
              <button
                onClick={handleSaveApiKey}
                className="plasmo-px-3 plasmo-py-1 plasmo-rounded plasmo-text-xs plasmo-bg-blue-600 plasmo-text-white hover:plasmo-bg-blue-700">
                Lưu
              </button>
              {hasApiKey && (
                <button
                  onClick={() => {
                    setShowApiKeyInput(false)
                    setApiKeyInput("")
                    setError(null)
                  }}
                  className="plasmo-px-2 plasmo-py-1 plasmo-rounded plasmo-text-xs plasmo-bg-gray-200 plasmo-text-gray-700 hover:plasmo-bg-gray-300">
                  Hủy
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="plasmo-p-2 plasmo-bg-green-50 plasmo-rounded-lg plasmo-border plasmo-border-green-200 plasmo-flex plasmo-items-center plasmo-justify-between">
            <div className="plasmo-flex plasmo-items-center">
              <span className="plasmo-text-green-600 plasmo-mr-1 plasmo-text-xs">
                ✓
              </span>
              <span className="plasmo-text-xs plasmo-text-green-800 plasmo-font-medium">
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
        ))}

        {/* Qwen Local Info */}
        {selectedModel === "qwen-local" && (
          <div className="plasmo-p-2 plasmo-bg-purple-50 plasmo-rounded-lg plasmo-border plasmo-border-purple-200">
            <div className="plasmo-flex plasmo-items-start">
              <span className="plasmo-text-purple-600 plasmo-mr-1 plasmo-text-xs">
                ℹ️
              </span>
              <div className="plasmo-text-xs plasmo-text-purple-800">
                <div className="plasmo-font-medium plasmo-mb-1">
                  Sử dụng LM Studio Local
                </div>
                <div className="plasmo-opacity-75">
                  Đảm bảo LM Studio đang chạy tại{" "}
                  <span className="plasmo-font-mono">
                    http://127.0.0.1:1234
                  </span>{" "}
                  với model <span className="plasmo-font-mono">qwen-vl-4b</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-4 plasmo-space-y-4">
        {error && (
          <div className="plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-lg plasmo-p-3">
            <div className="plasmo-text-sm plasmo-text-red-800">❌ {error}</div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="plasmo-text-center plasmo-text-gray-500 plasmo-py-8">
            <div className="plasmo-text-4xl plasmo-mb-4">💬</div>
            <p className="plasmo-text-sm">Chưa có tin nhắn nào.</p>
            <p className="plasmo-text-xs plasmo-mt-2">
              Bấm "📸 Screenshot" để bắt đầu cuộc trò chuyện!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessageItem key={message.id} message={message} />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="plasmo-bg-white plasmo-border-t plasmo-border-gray-200 plasmo-p-4 plasmo-space-y-3">
        {/* Text Input */}
        <div className="plasmo-relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPaste={handlePasteImage}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendTextMessage()
              }
            }}
            placeholder="Nhập câu hỏi hoặc paste ảnh (Ctrl+V)..."
            className="plasmo-w-full plasmo-pr-24 plasmo-py-3 plasmo-px-4 plasmo-border plasmo-border-gray-300 plasmo-rounded-lg plasmo-text-sm plasmo-focus:outline-none plasmo-focus:ring-2 plasmo-focus:ring-blue-500 plasmo-focus:border-transparent"
          />
          <div className="plasmo-absolute plasmo-right-2 plasmo-top-1/2 plasmo-transform -plasmo-translate-y-1/2 plasmo-flex plasmo-space-x-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="plasmo-p-2 plasmo-text-gray-500 hover:plasmo-text-blue-600 plasmo-rounded"
              title="Upload ảnh">
              📎
            </button>
            <button
              onClick={handleSendTextMessage}
              disabled={!inputText.trim()}
              className={`plasmo-p-2 plasmo-rounded ${
                inputText.trim()
                  ? "plasmo-text-blue-600 hover:plasmo-bg-blue-50"
                  : "plasmo-text-gray-400 plasmo-cursor-not-allowed"
              }`}
              title="Gửi">
              📤
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="plasmo-hidden"
        />

        {/* Action Buttons */}
        <div className="plasmo-flex plasmo-space-x-2">
          <button
            onClick={handleTakeScreenshot}
            className="plasmo-flex-1 plasmo-py-2 plasmo-bg-blue-600 plasmo-text-white plasmo-rounded-lg plasmo-font-medium plasmo-text-sm hover:plasmo-bg-blue-700 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-space-x-2">
            <span>📸</span>
            <span>Screenshot</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleAnalyzeLatest}
              disabled={
                !hasApiKey ||
                isAnalyzing ||
                messages[messages.length - 1]?.analysis != null
              }
              className={`plasmo-flex-1 plasmo-py-2 plasmo-rounded-lg plasmo-font-medium plasmo-text-sm plasmo-flex plasmo-items-center plasmo-justify-center plasmo-space-x-2 ${
                hasApiKey &&
                !isAnalyzing &&
                !messages[messages.length - 1]?.analysis
                  ? "plasmo-bg-green-600 plasmo-text-white hover:plasmo-bg-green-700"
                  : "plasmo-bg-gray-300 plasmo-text-gray-500 plasmo-cursor-not-allowed"
              }`}>
              <span>🤖</span>
              <span>
                {isAnalyzing
                  ? "Phân tích..."
                  : !hasApiKey
                    ? "Cần API Key"
                    : messages[messages.length - 1]?.analysis
                      ? "Đã phân tích"
                      : "Phân tích"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SidePanelPage
