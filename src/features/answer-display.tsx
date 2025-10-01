import { useStorage } from "@plasmohq/storage/hook"

import type { AnalysisResults } from "~types"

export const AnswerDisplay = () => {
  const [lastAnalysis] = useStorage<AnalysisResults>("lastAnalysis")

  if (!lastAnalysis || lastAnalysis.length === 0) return null

  // Lọc chỉ hiển thị multiple-choice và fill-in-the-blank
  const displayableResults = lastAnalysis.filter(
    (result) =>
      result.type === "multiple-choice" || result.type === "fill-in-the-blank"
  )

  if (displayableResults.length === 0) return null

  return (
    <div className="plasmo-bg-white plasmo-border plasmo-border-gray-200 plasmo-rounded-lg plasmo-shadow-sm plasmo-p-3 plasmo-max-w-xs plasmo-space-y-3">
      {displayableResults.map((result, index) => (
        <div
          key={index}
          className="plasmo-border-b plasmo-border-gray-200 plasmo-pb-3 last:plasmo-border-0 last:plasmo-pb-0">
          {displayableResults.length > 1 && (
            <div className="plasmo-text-xs plasmo-font-bold plasmo-text-gray-600 plasmo-mb-2">
              Câu {index + 1}:
            </div>
          )}

          {result.type === "multiple-choice" && (
            <div>
              <div className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-500 plasmo-mb-2">
                Đáp án đúng:
              </div>
              <div className="plasmo-text-sm plasmo-font-semibold plasmo-text-green-700 plasmo-bg-green-50 plasmo-px-2 plasmo-py-1 plasmo-rounded">
                {result.correctAnswer}
              </div>
            </div>
          )}

          {result.type === "fill-in-the-blank" && (
            <div>
              <div className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-500 plasmo-mb-2">
                Đáp án điền:
              </div>
              <div className="plasmo-space-y-1">
                {Array.isArray(result.correctAnswer) ? (
                  result.correctAnswer.map((answer, ansIndex) => (
                    <div
                      key={ansIndex}
                      className="plasmo-text-sm plasmo-font-semibold plasmo-text-purple-700 plasmo-bg-purple-50 plasmo-px-2 plasmo-py-1 plasmo-rounded">
                      {answer}
                    </div>
                  ))
                ) : (
                  <div className="plasmo-text-sm plasmo-font-semibold plasmo-text-purple-700 plasmo-bg-purple-50 plasmo-px-2 plasmo-py-1 plasmo-rounded">
                    {result.correctAnswer}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
