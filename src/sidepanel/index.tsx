import { useEffect, useRef, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { ChatMessageItem } from "~sidepanel/components/ChatMessageItem"
import type { AnalysisResults, ScreenshotData } from "~types"
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

  // Check if API key is available
  const hasApiKey = Boolean(storageHelpers.getApiKey())

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
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "START_SCREENSHOT"
        })
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

  return (
    <div className="plasmo-h-screen plasmo-flex plasmo-flex-col plasmo-bg-gray-50">
      {/* Header */}
      <div className="plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-p-4 plasmo-flex plasmo-items-center plasmo-justify-between">
        <div>
          <h1 className="plasmo-text-lg plasmo-font-bold plasmo-text-gray-800">
            Screenshot AI Chat
          </h1>
          {!hasApiKey && (
            <p className="plasmo-text-xs plasmo-text-red-600">
              ⚠️ Cần cấu hình API Key
            </p>
          )}
        </div>
        <div className="plasmo-flex plasmo-space-x-2">
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
