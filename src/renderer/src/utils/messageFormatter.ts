// Utility for converting OpenCode SDK message format to UI ChatMessage format

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// OpenCode SDK message types (simplified)
interface SDKMessage {
  id: string
  role: 'user' | 'assistant'
  time: {
    created: number
    completed?: number
  }
}

interface SDKPart {
  type: string
  text?: string
  [key: string]: any
}

interface SDKMessageItem {
  info: SDKMessage
  parts: SDKPart[]
}

/**
 * Convert OpenCode SDK message history to UI ChatMessage format
 */
export function formatMessagesFromSDK(sdkMessages: SDKMessageItem[]): ChatMessage[] {
  if (!Array.isArray(sdkMessages)) {
    console.warn('Invalid SDK messages format, expected array:', sdkMessages)
    return []
  }

  return sdkMessages
    .map((messageItem): ChatMessage | null => {
      try {
        const { info, parts } = messageItem

        if (!info || !Array.isArray(parts)) {
          console.warn('Invalid message item structure:', messageItem)
          return null
        }

        // Extract text content from parts
        const textParts = parts.filter((part) => part.type === 'text' && part.text)
        const content = textParts.map((part) => part.text).join('')

        // Skip messages with no text content
        if (!content.trim()) {
          return null
        }

        // Convert timestamp
        const timestamp = new Date(info.time.created)

        return {
          id: info.id,
          type: info.role,
          content: content.trim(),
          timestamp
        }
      } catch (error) {
        console.error('Error formatting message:', error, messageItem)
        return null
      }
    })
    .filter((message): message is ChatMessage => message !== null)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) // Sort by timestamp
}

/**
 * Create a new UI ChatMessage (for local messages before sending to server)
 */
export function createChatMessage(
  type: 'user' | 'assistant',
  content: string,
  id?: string
): ChatMessage {
  return {
    id: id || Date.now().toString(),
    type,
    content: content.trim(),
    timestamp: new Date()
  }
}

/**
 * Merge new messages with existing messages, avoiding duplicates
 */
export function mergeMessages(existing: ChatMessage[], newMessages: ChatMessage[]): ChatMessage[] {
  const existingIds = new Set(existing.map((msg) => msg.id))
  const uniqueNewMessages = newMessages.filter((msg) => !existingIds.has(msg.id))

  return [...existing, ...uniqueNewMessages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )
}

/**
 * Replace messages completely (for full sync from server)
 */
export function replaceMessages(newMessages: ChatMessage[]): ChatMessage[] {
  return [...newMessages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}
