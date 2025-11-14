import { Storage } from "@plasmohq/storage"

import type { AnalysisResult, AnalysisResults, ScreenshotData } from "~types"

export const storage = new Storage()

// Storage keys
export const STORAGE_KEYS = {
  LAST_ANALYSIS: "lastAnalysis",
  API_KEY: "geminiApiKey"
} as const

// Helper functions for storage
export const storageHelpers = {
  // Get API key from storage (fallback to env if not set)
  async getApiKey(): Promise<string | null> {
    const storedKey = await storage.get(STORAGE_KEYS.API_KEY)
    return storedKey || process.env.PLASMO_PUBLIC_GEMINI_API_KEY || null
  },

  // Set API key to storage
  async setApiKey(apiKey: string): Promise<void> {
    await storage.set(STORAGE_KEYS.API_KEY, apiKey)
  },

  // Remove API key from storage
  async removeApiKey(): Promise<void> {
    await storage.remove(STORAGE_KEYS.API_KEY)
  },

  async getLastAnalysis(): Promise<AnalysisResults | null> {
    return await storage.get(STORAGE_KEYS.LAST_ANALYSIS)
  },

  async setLastAnalysis(analysis: AnalysisResults): Promise<void> {
    await storage.set(STORAGE_KEYS.LAST_ANALYSIS, analysis)
  },

  async getIsAnalyzing(): Promise<boolean> {
    return (await storage.get("isAnalyzing")) || false
  },

  async setIsAnalyzing(isAnalyzing: boolean): Promise<void> {
    await storage.set("isAnalyzing", isAnalyzing)
  },

  async clearStorage(): Promise<void> {
    await storage.clear()
  }
}

// In-memory screenshot management via message passing
export const screenshotHelpers = {
  // Get screenshot from background script
  async getLastScreenshot(): Promise<ScreenshotData | null> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GET_SCREENSHOT" }, (response) => {
        resolve(response?.screenshot || null)
      })
    })
  },

  // Clear screenshot from background script
  async clearScreenshot(): Promise<void> {
    chrome.runtime.sendMessage({ action: "CLEAR_SCREENSHOT" })
  }
}

// Utility function to validate API key format
export function isValidApiKey(apiKey: string): boolean {
  return apiKey && apiKey.length > 10 && apiKey.startsWith("AIza")
}

// Utility function to format analysis result for display
export function formatAnalysisForDisplay(analysis: AnalysisResult) {
  return {
    ...analysis,
    question: analysis.question || undefined,
    options: analysis.options || [],
    correctAnswer: analysis.correctAnswer || "Không có câu trả lời",
    type: analysis.type || "short-answer"
  }
}
