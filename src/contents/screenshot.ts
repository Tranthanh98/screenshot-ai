import type { PlasmoCSConfig } from "plasmo"

import type { ScreenshotArea } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

let isSelecting = false
let selectionOverlay: HTMLDivElement | null = null
let startX = 0
let startY = 0
let selectionBox: HTMLDivElement | null = null

// Lắng nghe message từ background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_SCREENSHOT") {
    startScreenshotSelection()
  }

  if (message.action === "CROP_SCREENSHOT") {
    const { dataUrl, area } = message
    cropAndAnalyzeImage(dataUrl, area)
  }
})

function startScreenshotSelection() {
  if (isSelecting) return

  isSelecting = true

  // Tạo overlay để chọn vùng
  createSelectionOverlay()

  // Add event listeners
  document.addEventListener("mousedown", handleMouseDown)
  document.addEventListener("mousemove", handleMouseMove)
  document.addEventListener("mouseup", handleMouseUp)
  document.addEventListener("keydown", handleKeyDown)

  // Thay đổi cursor
  document.body.style.cursor = "crosshair"
}

function createSelectionOverlay() {
  // Tạo overlay che toàn bộ màn hình
  selectionOverlay = document.createElement("div")
  selectionOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999999;
    cursor: crosshair;
  `

  // Tạo selection box
  selectionBox = document.createElement("div")
  selectionBox.style.cssText = `
    position: absolute;
    border: 2px dashed #0066cc;
    display: none;
  `

  selectionOverlay.appendChild(selectionBox)
  document.body.appendChild(selectionOverlay)
}

function handleMouseDown(e: MouseEvent) {
  if (!isSelecting || !selectionBox) return

  e.preventDefault()
  e.stopPropagation()

  startX = e.clientX
  startY = e.clientY

  selectionBox.style.left = startX + "px"
  selectionBox.style.top = startY + "px"
  selectionBox.style.width = "0px"
  selectionBox.style.height = "0px"
  selectionBox.style.display = "block"
}

function handleMouseMove(e: MouseEvent) {
  if (!isSelecting || !selectionBox) return

  const currentX = e.clientX
  const currentY = e.clientY

  const width = Math.abs(currentX - startX)
  const height = Math.abs(currentY - startY)
  const left = Math.min(startX, currentX)
  const top = Math.min(startY, currentY)

  selectionBox.style.left = left + "px"
  selectionBox.style.top = top + "px"
  selectionBox.style.width = width + "px"
  selectionBox.style.height = height + "px"
}

function handleMouseUp(e: MouseEvent) {
  if (!isSelecting || !selectionBox) return

  e.preventDefault()
  e.stopPropagation()

  const currentX = e.clientX
  const currentY = e.clientY

  const width = Math.abs(currentX - startX)
  const height = Math.abs(currentY - startY)
  const left = Math.min(startX, currentX)
  const top = Math.min(startY, currentY)

  // Kiểm tra xem có vùng được chọn không
  if (width > 10 && height > 10) {
    const area = {
      x: left,
      y: top,
      width,
      height
    }

    // Gửi message đến background để capture
    chrome.runtime.sendMessage({
      action: "CAPTURE_SCREENSHOT",
      area
    })
  }

  // Clean up
  cleanup()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    cleanup()
  }
}

function cleanup() {
  isSelecting = false

  // Remove event listeners
  document.removeEventListener("mousedown", handleMouseDown)
  document.removeEventListener("mousemove", handleMouseMove)
  document.removeEventListener("mouseup", handleMouseUp)
  document.removeEventListener("keydown", handleKeyDown)

  // Remove overlay
  if (selectionOverlay) {
    document.body.removeChild(selectionOverlay)
    selectionOverlay = null
    selectionBox = null
  }

  // Reset cursor
  document.body.style.cursor = "default"
}

function cropAndAnalyzeImage(dataUrl: string, area: ScreenshotArea) {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  const img = new Image()

  img.onload = () => {
    // Tính toán tỷ lệ giữa kích thước thực tế và viewport
    const scaleX = img.width / window.innerWidth
    const scaleY = img.height / window.innerHeight

    // Điều chỉnh area theo tỷ lệ
    const scaledArea = {
      x: area.x * scaleX,
      y: area.y * scaleY,
      width: area.width * scaleX,
      height: area.height * scaleY
    }

    canvas.width = scaledArea.width
    canvas.height = scaledArea.height

    // Crop image
    ctx?.drawImage(
      img,
      scaledArea.x,
      scaledArea.y,
      scaledArea.width,
      scaledArea.height,
      0,
      0,
      scaledArea.width,
      scaledArea.height
    )

    // Convert to base64
    const croppedImage = canvas.toDataURL("image/png")

    // Gửi đến background để lưu screenshot
    chrome.runtime.sendMessage({
      action: "SAVE_SCREENSHOT",
      croppedImage,
      area
    })
  }

  img.src = dataUrl
}

export {}
