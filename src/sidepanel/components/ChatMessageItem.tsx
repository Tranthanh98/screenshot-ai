import type { ChatMessage } from "~utils/db"

interface ChatMessageItemProps {
  message: ChatMessage
}

export const ChatMessageItem = ({ message }: ChatMessageItemProps) => {
  return (
    <div className="plasmo-mb-4 plasmo-space-y-3">
      {/* User Message */}
      <div className="plasmo-flex plasmo-justify-end">
        <div className="plasmo-max-w-[80%] plasmo-bg-blue-500 plasmo-rounded-lg plasmo-p-3">
          {/* Screenshot Message */}
          {message.type === "screenshot" && message.screenshot && (
            <img
              src={message.screenshot.imageBase64}
              alt="Screenshot"
              className="plasmo-w-full plasmo-rounded plasmo-cursor-pointer"
              style={{ maxWidth: "300px" }}
              onClick={() =>
                window.open(message.screenshot.imageBase64, "_blank")
              }
            />
          )}

          {/* Paste Image Message */}
          {message.type === "paste" && message.screenshot && (
            <div>
              <div className="plasmo-text-xs plasmo-text-blue-100 plasmo-mb-2">
                📋 Ảnh đã paste:
              </div>
              <img
                src={message.screenshot.imageBase64}
                alt="Pasted Image"
                className="plasmo-w-full plasmo-rounded plasmo-cursor-pointer"
                style={{ maxWidth: "300px" }}
                onClick={() =>
                  window.open(message.screenshot.imageBase64, "_blank")
                }
              />
            </div>
          )}

          {/* Text Message */}
          {message.type === "text" && message.textQuestion && (
            <div>
              <div className="plasmo-text-xs plasmo-text-blue-100 plasmo-mb-2">
                💬 Câu hỏi:
              </div>
              <div className="plasmo-text-sm plasmo-text-white">
                {message.textQuestion}
              </div>
            </div>
          )}

          <div className="plasmo-text-xs plasmo-text-blue-100 plasmo-mt-2">
            {new Date(message.timestamp).toLocaleString("vi-VN")}
          </div>
        </div>
      </div>

      {/* AI Response */}
      {message.isAnalyzing && (
        <div className="plasmo-flex plasmo-justify-start">
          <div className="plasmo-max-w-[80%] plasmo-bg-gray-100 plasmo-rounded-lg plasmo-p-4">
            <div className="plasmo-flex plasmo-items-center plasmo-space-x-2">
              <div className="plasmo-animate-spin plasmo-rounded-full plasmo-h-4 plasmo-w-4 plasmo-border-b-2 plasmo-border-blue-600"></div>
              <span className="plasmo-text-sm plasmo-text-gray-600">
                Đang phân tích...
              </span>
            </div>
          </div>
        </div>
      )}

      {message.error && (
        <div className="plasmo-flex plasmo-justify-start">
          <div className="plasmo-max-w-[80%] plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-lg plasmo-p-3">
            <div className="plasmo-text-sm plasmo-text-red-800">
              ❌ Lỗi: {message.error}
            </div>
          </div>
        </div>
      )}

      {message.analysis && message.analysis.length > 0 && (
        <div className="plasmo-flex plasmo-justify-start">
          <div className="plasmo-max-w-[80%] plasmo-bg-gray-100 plasmo-rounded-lg plasmo-p-4 plasmo-space-y-3">
            <div className="plasmo-text-sm plasmo-font-semibold plasmo-text-gray-700">
              🤖 Kết quả phân tích ({message.analysis.length} câu hỏi):
            </div>

            {message.analysis.map((result, index) => (
              <div
                key={index}
                className="plasmo-bg-white plasmo-rounded plasmo-p-3 plasmo-border plasmo-border-gray-200">
                {message.analysis!.length > 1 && (
                  <div className="plasmo-font-bold plasmo-text-xs plasmo-text-gray-600 plasmo-mb-2">
                    Câu {index + 1}:
                  </div>
                )}

                {/* Multiple Choice */}
                {result.type === "multiple-choice" && (
                  <div className="plasmo-space-y-2">
                    {result.question && (
                      <div className="plasmo-text-sm plasmo-text-gray-800 plasmo-font-medium">
                        📝 {result.question}
                      </div>
                    )}
                    {result.options && result.options.length > 0 && (
                      <div className="plasmo-text-xs plasmo-text-gray-600 plasmo-space-y-1">
                        {result.options.map((option, idx) => (
                          <div key={idx}>• {option}</div>
                        ))}
                      </div>
                    )}
                    <div className="plasmo-bg-green-50 plasmo-border plasmo-border-green-200 plasmo-rounded plasmo-px-2 plasmo-py-1 plasmo-text-sm plasmo-text-green-800 plasmo-font-semibold">
                      ✓ {result.correctAnswer}
                    </div>
                  </div>
                )}

                {/* Short Answer */}
                {result.type === "short-answer" && (
                  <div className="plasmo-space-y-2">
                    {result.question && (
                      <div className="plasmo-text-sm plasmo-text-gray-800 plasmo-font-medium">
                        📝 {result.question}
                      </div>
                    )}
                    <div className="plasmo-bg-blue-50 plasmo-border plasmo-border-blue-200 plasmo-rounded plasmo-px-2 plasmo-py-1 plasmo-text-sm plasmo-text-blue-800">
                      💡 {result.correctAnswer}
                    </div>
                  </div>
                )}

                {/* Fill in the Blank */}
                {result.type === "fill-in-the-blank" && (
                  <div className="plasmo-space-y-2">
                    {result.question && (
                      <div className="plasmo-text-sm plasmo-text-gray-800 plasmo-font-medium">
                        📝 {result.question}
                      </div>
                    )}
                    <div className="plasmo-bg-purple-50 plasmo-border plasmo-border-purple-200 plasmo-rounded plasmo-px-2 plasmo-py-1 plasmo-space-y-1">
                      {Array.isArray(result.correctAnswer) ? (
                        result.correctAnswer.map((answer, idx) => (
                          <div
                            key={idx}
                            className="plasmo-text-sm plasmo-text-purple-800 plasmo-font-semibold">
                            {idx + 1}. {answer}
                          </div>
                        ))
                      ) : (
                        <div className="plasmo-text-sm plasmo-text-purple-800 plasmo-font-semibold">
                          {result.correctAnswer}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
