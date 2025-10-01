# Screenshot AI Extension

Extension Chrome/Edge để chụp ảnh màn hình và phân tích câu hỏi bằng Gemini AI.

## Tính năng

- **Context Menu**: Chuột phải để chọn "Start Screenshot"
- **Screenshot Selection**: Kéo chuột để chọn vùng cần phân tích
- **AI Analysis**: Sử dụng Gemini AI để trích xuất câu hỏi và đáp án
- **Smart Popup**: Hiển thị kết quả phân tích với câu trả lời đúng

## Cài đặt

1. Build extension:

   ```bash
   pnpm install
   pnpm build
   ```

2. Mở Chrome/Edge Extensions page:

   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

3. Bật "Developer mode"

4. Click "Load unpacked" và chọn thư mục `build/chrome-mv3-prod`

## Cách sử dụng

1. **Thiết lập API Key**:

   - Tạo file `.env` trong thư mục root project
   - Thêm dòng: `PLASMO_PUBLIC_GEMINI_API_KEY=your-api-key-here`
   - API key lấy từ [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Build lại extension: `pnpm build`

2. **Chụp và phân tích**:

   **Cách 1 - Nhanh (Recommended):**

   - Chuột phải → "Start Screenshot" → chọn vùng câu hỏi
   - Chuột phải lần nữa → "Hỏi" → nhận kết quả ngay
   - Screenshot được giữ lại để xem trong popup

   **Cách 2 - Qua popup:**

   - Chuột phải → "Start Screenshot" → chọn vùng câu hỏi
   - Mở popup extension → click "Hỏi" → xem kết quả

## Cấu trúc project

```
src/
├── background.ts           # Background script, xử lý context menu & API
├── popup.tsx              # Popup UI hiển thị kết quả
├── contents/
│   └── screenshot.ts      # Content script cho screenshot selection
├── types/
│   └── index.ts          # Type definitions
└── style.css             # Global styles
```

## API Requirements

- **Gemini API Key**: Cần API key từ Google AI Studio
- **Permissions**: contextMenus, activeTab, storage, tabs

## Development

```bash
# Dev mode với hot reload
pnpm dev

# Build production
pnpm build

# Package extension
pnpm package
```

## Troubleshooting

- **Không thấy context menu**: Đảm bảo extension đã được load và có permissions
- **Lỗi API**: Kiểm tra API key và kết nối internet
- **Screenshot không hoạt động**: Thử refresh trang và thử lại
- **Screenshot bị mất**: Screenshot được lưu trong memory, sẽ mất khi restart extension

## Technical Notes

- **Storage Approach**: Screenshot được lưu trong in-memory của background script để tránh Chrome storage quota limit
- **Data Persistence**: Chỉ analysis results được lưu persistent, screenshot sẽ mất khi restart extension
- **Memory Management**: Extension tự động quản lý memory, chỉ giữ 1 screenshot tại một thời điểm
