import ReactMarkdown from "react-markdown"

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
          <div className="plasmo-max-w-[80%] plasmo-bg-gray-100 plasmo-rounded-lg plasmo-p-4">
            <div className="plasmo-text-sm plasmo-font-semibold plasmo-text-gray-700 plasmo-mb-3">
              🤖 Kết quả phân tích:
            </div>

            {message.analysis.map((result, index) => (
              <div
                key={index}
                className="plasmo-bg-white plasmo-rounded plasmo-p-3 plasmo-border plasmo-border-gray-200 plasmo-mb-3 last:plasmo-mb-0">
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
                  <div className="plasmo-space-y-2">
                    {result.question && (
                      <div className="plasmo-text-sm plasmo-text-gray-800 plasmo-font-medium">
                        📝 {result.question}
                      </div>
                    )}
                    {result.type === "multiple-choice" && result.options && (
                      <div className="plasmo-text-xs plasmo-text-gray-600 plasmo-space-y-1 plasmo-mb-2">
                        {result.options.map((option, idx) => (
                          <div key={idx}>• {option}</div>
                        ))}
                      </div>
                    )}
                    <div className="plasmo-bg-blue-50 plasmo-border plasmo-border-blue-200 plasmo-rounded plasmo-px-2 plasmo-py-1 plasmo-text-sm plasmo-text-blue-800">
                      💡{" "}
                      {Array.isArray(result.correctAnswer)
                        ? result.correctAnswer.join(", ")
                        : result.correctAnswer}
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
