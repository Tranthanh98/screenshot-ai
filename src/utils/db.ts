import type { AnalysisResults, ScreenshotData } from "~types"

export interface ChatMessage {
  id: string
  timestamp: number
  screenshot?: ScreenshotData // Optional cho text message
  textQuestion?: string // Cho câu hỏi text
  analysis?: AnalysisResults
  isAnalyzing?: boolean
  error?: string
  type: "screenshot" | "text" | "paste" // Loại message
}

const DB_NAME = "screenshot-ai-db"
const DB_VERSION = 1
const STORE_NAME = "conversations"

class ConversationDB {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
          store.createIndex("timestamp", "timestamp", { unique: false })
        }
      }
    })
  }

  async addMessage(message: ChatMessage): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(message)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async updateMessage(
    id: string,
    updates: Partial<ChatMessage>
  ): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const message = getRequest.result
        if (message) {
          const updatedMessage = { ...message, ...updates }
          const updateRequest = store.put(updatedMessage)
          updateRequest.onsuccess = () => resolve()
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          reject(new Error("Message not found"))
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async getAllMessages(): Promise<ChatMessage[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const messages = request.result as ChatMessage[]
        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp)
        resolve(messages)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteMessage(id: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export const conversationDB = new ConversationDB()
