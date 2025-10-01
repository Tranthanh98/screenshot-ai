import type { AnalysisResults } from "~types"

interface AnalysisResultsProps {
  results: AnalysisResults
}

export const AnalysisResultsDisplay = ({ results }: AnalysisResultsProps) => {
  if (!results || results.length === 0) return null

  return (
    <div className="plasmo-space-y-4">
      <h2 className="plasmo-font-bold plasmo-text-base plasmo-mb-3 plasmo-text-green-600">
        Kết quả phân tích ({results.length} câu hỏi):
      </h2>

      {results.map((result, resultIndex) => (
        <div
          key={resultIndex}
          className="plasmo-border plasmo-border-gray-200 plasmo-rounded-lg plasmo-p-4 plasmo-bg-gray-50">
          {/* Số thứ tự câu hỏi */}
          {results.length > 1 && (
            <div className="plasmo-mb-3 plasmo-font-bold plasmo-text-sm plasmo-text-gray-600">
              Câu {resultIndex + 1}:
            </div>
          )}

          {/* Multiple Choice Questions */}
          {result.type === "multiple-choice" && (
            <>
              {/* Question */}
              {result.question && (
                <div className="plasmo-mb-3 plasmo-p-3 plasmo-bg-white plasmo-rounded-lg">
                  <h3 className="plasmo-font-medium plasmo-text-sm plasmo-mb-2 plasmo-text-gray-700">
                    Câu hỏi:
                  </h3>
                  <p className="plasmo-text-sm plasmo-text-gray-800">
                    {result.question}
                  </p>
                </div>
              )}

              {/* Options */}
              {result.options && result.options.length > 0 && (
                <div className="plasmo-mb-3">
                  <h3 className="plasmo-font-medium plasmo-text-sm plasmo-mb-2 plasmo-text-gray-700">
                    Các đáp án:
                  </h3>
                  <ul className="plasmo-space-y-1">
                    {result.options.map((option, index) => (
                      <li
                        key={index}
                        className="plasmo-text-sm plasmo-text-gray-800 plasmo-p-2 plasmo-bg-white plasmo-rounded">
                        {option}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Correct Answer */}
              <div className="plasmo-p-3 plasmo-bg-green-50 plasmo-border plasmo-border-green-200 plasmo-rounded-lg">
                <h3 className="plasmo-font-medium plasmo-text-sm plasmo-mb-2 plasmo-text-green-700">
                  Đáp án đúng:
                </h3>
                <p className="plasmo-text-sm plasmo-text-green-800 plasmo-font-medium">
                  {result.correctAnswer}
                </p>
              </div>
            </>
          )}

          {/* Short Answer Questions */}
          {result.type === "short-answer" && (
            <>
              {result.question && (
                <div className="plasmo-mb-3 plasmo-p-3 plasmo-bg-white plasmo-rounded-lg">
                  <h3 className="plasmo-font-medium plasmo-text-sm plasmo-mb-2 plasmo-text-gray-700">
                    Câu hỏi:
                  </h3>
                  <p className="plasmo-text-sm plasmo-text-gray-800">
                    {result.question}
                  </p>
                </div>
              )}

              <div className="plasmo-p-3 plasmo-bg-blue-50 plasmo-border plasmo-border-blue-200 plasmo-rounded-lg">
                <h3 className="plasmo-font-medium plasmo-text-sm plasmo-mb-2 plasmo-text-blue-700">
                  Câu trả lời:
                </h3>
                <p className="plasmo-text-sm plasmo-text-blue-800">
                  {result.correctAnswer}
                </p>
              </div>
            </>
          )}

          {/* Fill in the Blank Questions */}
          {result.type === "fill-in-the-blank" && (
            <div className="plasmo-p-3 plasmo-bg-purple-50 plasmo-border plasmo-border-purple-200 plasmo-rounded-lg">
              <h3 className="plasmo-font-medium plasmo-text-sm plasmo-mb-2 plasmo-text-purple-700">
                Đáp án điền vào chỗ trống:
              </h3>
              {Array.isArray(result.correctAnswer) ? (
                <ul className="plasmo-space-y-1">
                  {result.correctAnswer.map((answer, index) => (
                    <li
                      key={index}
                      className="plasmo-text-sm plasmo-text-purple-800 plasmo-font-medium">
                      {answer}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="plasmo-text-sm plasmo-text-purple-800 plasmo-font-medium">
                  {result.correctAnswer}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
