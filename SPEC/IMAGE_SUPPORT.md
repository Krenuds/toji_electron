# Image Support in Toji

**Status:** ✅ Implemented + Enhanced  
**Date:** October 6, 2025  
**Last Update:** October 6, 2025 (Added @filename parsing)  
**Commits:** f2f07e0 (base), TBD (attachment parsing)

## Overview

Toji supports sending images alongside text prompts to vision-capable models (like Claude 3.5 Sonnet) in two ways:

1. **Explicit Attachment** - Programmatically pass image paths via `images` parameter
2. **Natural Language Parsing** - Use `@filename` syntax inspired by OpenCode TUI (opt-in)

Images are converted to base64-encoded data URIs and sent as `FilePart` entries in the OpenCode SDK's `session.prompt()` call.

## Architecture

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

## Usage Examples

### Method 1: Explicit Attachment (Default)

**From main process:**

```typescript
const response = await toji.chat(
  'What do you see in this image?',
  undefined, // sessionId - will auto-create
  [{ path: 'C:\\path\\to\\image.png' }]
)
```

**From renderer process (via IPC):**

```typescript
const response = await window.api.toji.chat(
  'What do you see?',
  undefined, // sessionId
  [{ path: 'C:\\Users\\user\\screenshot.png' }]
)
```

**Multiple images:**

```typescript
const response = await toji.chat('Compare these two images', undefined, [
  { path: 'C:\\path\\to\\image1.png' },
  { path: 'C:\\path\\to\\image2.jpg' }
])
```

### Method 2: Natural Language @filename Parsing (Opt-In)

**Enable parsing:**

```typescript
// User message contains @filename references
const message = 'Please analyze @screenshot.png and compare it to @diagram.jpg'

const response = await toji.chat(
  message,
  undefined, // sessionId
  undefined, // images - will be parsed from message
  true // parseAttachments - ENABLE @filename parsing
)

// Message sent to AI: "Please analyze [Attached: screenshot.png] and compare it to [Attached: diagram.jpg]"
// Images automatically attached as FileParts
```

**How parsing works:**

- Detects `@filename.ext` pattern in message
- Resolves relative paths based on project directory
- Only attaches files that:
  1. Exist on disk
  2. Have image extensions (.png, .jpg, .jpeg, .gif, .webp, .bmp)
- Replaces `@filename` with `[Attached: filename]` in message text
- Skips invalid references (non-images, non-existent files)

**Supported @filename formats:**

```typescript
'Look at @image.png' // Relative to project directory
'Check @./subfolder/screenshot.jpg' // Explicit relative path
'Analyze @C:\\Users\\user\\Desktop\\photo.png' // Absolute Windows path
'Review @/home/user/images/diagram.gif' // Absolute Unix path
```

### Method 3: Discord Plugin (Automatic)

When Discord bot receives image attachments, they're automatically downloaded and passed:

```typescript
// Discord plugin downloads attachment, then:
await toji.chatStreaming(
  message.content,
  callbacks,
  undefined,
  [{ path: downloadedFilePath }] // Explicit attachment
)
```

### Streaming with Images

```typescript
await toji.chatStreaming(
  'Describe this image in detail',
  {
    onChunk: (text) => console.log('Chunk:', text),
    onComplete: (fullText) => console.log('Done:', fullText),
    onError: (error) => console.error('Error:', error)
  },
  undefined, // sessionId
  [{ path: 'C:\\path\\to\\image.png' }] // images
)
```

### Streaming with @filename Parsing

```typescript
await toji.chatStreaming(
  'Compare @before.png and @after.png',
  callbacks,
  undefined, // sessionId
  undefined, // images
  true // parseAttachments
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

## Parser Behavior

### Parsing Rules

1. **Pattern**: `/@ ([\w\-./\\:]+\.[\w]+)/gi` - matches `@filename.ext`
2. **Validation**: Only attaches files that:
   - Exist on disk (checked via `fs.existsSync`)
   - Have image extensions (.png, .jpg, .jpeg, .gif, .webp, .bmp)
3. **Path Resolution**:
   - Relative paths resolved against project directory
   - Absolute paths used as-is
4. **Message Transformation**:
   - `@image.png` → `[Attached: image.png]`
   - Invalid references left unchanged
5. **Logging**: All parsing activity logged to `toji:attachment-parser`

### When to Use Each Method

| Use Case                      | Method   | Why                                  |
| ----------------------------- | -------- | ------------------------------------ |
| **Discord bot attachments**   | Explicit | Already have file path from download |
| **UI file picker**            | Explicit | User explicitly selected file        |
| **Natural language requests** | Parsing  | User mentions file in conversation   |
| **API/programmatic**          | Explicit | Clear intent, type-safe              |

### Opt-In Design Rationale

- **Default:** `parseAttachments = false` (explicit is better than implicit)
- **Why:** Prevents unexpected behavior when messages contain `@` symbols
- **Example:** `"Email me @john@company.com"` shouldn't parse as file

## Limitations

1. **File Size**: Large images will increase base64 payload size significantly
2. **Model Support**: Requires vision-capable models (e.g., Claude 3.5 Sonnet, GPT-4 Vision)
3. **Path Validation**: Parser checks existence but not actual file type
4. **Binary Data**: Images are fully loaded into memory as base64
5. **Parser Scope**: Only extracts images, not other file types (by design)

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
