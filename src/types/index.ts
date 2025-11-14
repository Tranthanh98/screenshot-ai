export interface AnalysisResult {
  question?: string
  options?: string[]
  correctAnswer: string | string[]
  type: "multiple-choice" | "short-answer" | "fill-in-the-blank" | "markdown"
}

export type AnalysisResults = AnalysisResult[]

export type AIModel = "gemini" | "qwen-local"

export interface ModelConfig {
  model: AIModel
  displayName: string
  description: string
  requiresApiKey: boolean
}

export interface ScreenshotData {
  imageBase64: string
  timestamp: number
  area: ScreenshotArea
}

export interface ScreenshotArea {
  x: number
  y: number
  width: number
  height: number
}

export interface ChromeMessage {
  action: string
  [key: string]: any
}
