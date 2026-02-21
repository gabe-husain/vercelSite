import type { AnthropicMessage } from './types'

type ConversationEntry = {
  messages: AnthropicMessage[]
  lastActivity: number
}

const CONVERSATION_TTL = 15 * 60 * 1000 // 15 minutes
const MAX_MESSAGES = 20

const conversations = new Map<number, ConversationEntry>()

export function getConversation(chatId: number): AnthropicMessage[] {
  const entry = conversations.get(chatId)
  if (!entry) return []
  if (Date.now() - entry.lastActivity > CONVERSATION_TTL) {
    conversations.delete(chatId)
    return []
  }
  return entry.messages
}

export function appendToConversation(
  chatId: number,
  newMessages: AnthropicMessage[],
): void {
  const existing = getConversation(chatId) // handles expiry check
  const combined = [...existing, ...newMessages].slice(-MAX_MESSAGES)
  conversations.set(chatId, {
    messages: combined,
    lastActivity: Date.now(),
  })
}

export function clearConversation(chatId: number): void {
  conversations.delete(chatId)
}
