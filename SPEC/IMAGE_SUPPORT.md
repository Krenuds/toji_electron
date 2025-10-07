# Image Support Integration - Testing Guide

## Overview

Toji now supports sending images alongside text prompts to OpenCode using the multimodal capabilities of the SDK.

## Implementation Summary

### Files Created/Modified:

1. **`src/main/toji/image-utils.ts`** (NEW)
   - Helper function `imageToFilePart()` to convert image files to OpenCode FileParts
   - Supports: JPEG, PNG, GIF, WebP, BMP
   - Automatically detects MIME types from file extensions
   - Converts images to base64 data URIs

2. **`src/main/toji/types.ts`** (MODIFIED)
   - Added `ImageAttachment` interface with `path` and optional `mimeType`

3. **`src/main/toji/index.ts`** (MODIFIED)
   - Updated `chat()` method to accept optional `images` parameter
   - Updated `chatStreaming()` method to accept optional `images` parameter
   - Images are converted to FileParts and sent before the text message

4. **`src/main/handlers/toji.handlers.ts`** (MODIFIED)
   - Updated `toji:chat` IPC handler to accept images array

5. **`src/preload/api/toji.api.ts`** (MODIFIED)
   - Updated `chat()` API to accept images parameter

## How It Works

```typescript
// Image is converted to:
{
  type: 'file',
  mime: 'image/png',
  url: 'data:image/png;base64,iVBORw0KG...',
  filename: 'screenshot.png'
}

// Then sent to OpenCode SDK as part of the parts array:
await client.session.prompt({
  path: { id: sessionId },
  body: {
    parts: [
      { type: 'file', mime: 'image/png', url: 'data:...', filename: '...' },
      { type: 'text', text: 'What do you see in this image?' }
    ]
  }
})
```

## Testing Steps

### Step 1: Basic Image Send (Non-Streaming)

```typescript
// From main process or via IPC:
const response = await toji.chat(
  'What do you see in this image?',
  undefined, // sessionId - will auto-create
  [{ path: 'C:\\path\\to\\image.png' }]
)
console.log('Response:', response)
```

### Step 2: Multiple Images

```typescript
const response = await toji.chat('Compare these two images', undefined, [
  { path: 'C:\\path\\to\\image1.png' },
  { path: 'C:\\path\\to\\image2.jpg' }
])
```

### Step 3: Custom MIME Type

```typescript
const response = await toji.chat('Analyze this', undefined, [
  { path: 'C:\\path\\to\\image.webp', mimeType: 'image/webp' }
])
```

### Step 4: From Renderer Process (via IPC)

```typescript
// In renderer:
const response = await window.api.toji.chat('What is this?', undefined, [
  { path: 'C:\\Users\\donth\\Pictures\\screenshot.png' }
])
```

### Step 5: Streaming with Images

```typescript
await toji.chatStreaming(
  'Describe this image in detail',
  {
    onChunk: (text) => console.log('Chunk:', text),
    onComplete: (fullText) => console.log('Done:', fullText),
    onError: (error) => console.error('Error:', error)
  },
  undefined, // sessionId
  [{ path: 'C:\\path\\to\\image.png' }]
)
```

## Expected Behavior

1. **Image Files**: Must exist at the provided absolute path
2. **MIME Detection**: Automatic based on file extension (.jpg → image/jpeg, etc.)
3. **Encoding**: Images are converted to base64 and sent as data URIs
4. **Order**: Images are sent BEFORE the text message in the parts array
5. **Error Handling**: File read errors will throw with descriptive messages

## Supported Image Formats

- **JPEG**: `.jpg`, `.jpeg` → `image/jpeg`
- **PNG**: `.png` → `image/png`
- **GIF**: `.gif` → `image/gif`
- **WebP**: `.webp` → `image/webp`
- **BMP**: `.bmp` → `image/bmp`

## Limitations

1. **File Size**: Large images will increase base64 payload size significantly
2. **Model Support**: Requires vision-capable models (e.g., Claude 3.5 Sonnet, GPT-4 Vision)
3. **Path Validation**: No validation that path is actually an image - relies on extension
4. **Binary Data**: Images are fully loaded into memory as base64

## Next Steps for UI Integration

To add image support to the Chat UI:

1. Add file picker/drag-drop to `ChatViewMain.tsx`
2. Store selected images in component state
3. Pass images array to `window.api.toji.chat()`
4. Display image previews in the message composer
5. Show image attachments in chat history

## Testing Checklist

- [ ] Send single image with text prompt
- [ ] Send multiple images with text prompt
- [ ] Test all supported image formats (PNG, JPEG, GIF, WebP, BMP)
- [ ] Test streaming mode with images
- [ ] Test error handling (missing file, invalid path)
- [ ] Verify images display correctly in OpenCode TUI
- [ ] Test with vision-capable models (Claude 3.5 Sonnet)
- [ ] Test with non-vision models (should handle gracefully)

## Architecture Notes

- **Main Process First**: All image processing happens in main process
- **Thin IPC Handlers**: Handler just forwards to Toji class
- **Typed Boundaries**: Full TypeScript types across IPC
- **Simple API**: Just add images array to existing chat methods
- **No UI Changes Yet**: Backend is ready, frontend unchanged

---

**Implementation Complete**: Backend support for multimodal image prompts is now integrated and ready for testing.
