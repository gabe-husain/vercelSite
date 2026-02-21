import type {
  AnthropicMessage,
  AnthropicResponse,
  ContentBlock,
  ToolUseBlock,
} from './types'
import { buildSystemPrompt } from './systemPrompt'
import { TOOL_DEFINITIONS, executeTool } from './tools'
import { getConversation, appendToConversation } from './conversationStore'
import { undoStore } from '../telegramBot'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1024
const MAX_ROUNDS = 5
const API_TIMEOUT_MS = 25_000

/**
 * Handle a message that the regex parser couldn't understand.
 * Returns the AI response text, or null if the AI is unavailable
 * (missing API key, API error) — caller should fall back to help text.
 */
export async function handleAIMessage(
  chatId: number,
  userMessage: string,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const systemPrompt = buildSystemPrompt()
  const history = getConversation(chatId)

  const newUserMsg: AnthropicMessage = { role: 'user', content: userMessage }
  const messages: AnthropicMessage[] = [...history, newUserMsg]

  // Track new messages added during this call (for saving to conversation store)
  const newMessages: AnthropicMessage[] = [newUserMsg]

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await callClaude(apiKey, systemPrompt, messages)

    if (!response) {
      // API error — fall back
      return null
    }

    const assistantMsg: AnthropicMessage = {
      role: 'assistant',
      content: response.content,
    }
    messages.push(assistantMsg)
    newMessages.push(assistantMsg)

    if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
      // Extract text from response
      const text = response.content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('\n')

      appendToConversation(chatId, newMessages)
      return text || '(No response generated)'
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is ToolUseBlock => b.type === 'tool_use',
      )

      // Execute all tool calls and build tool_result blocks
      const toolResults: ContentBlock[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const result = await executeTool(
            block.name,
            block.input,
            chatId,
            undoStore,
          )
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: result,
          }
        }),
      )

      const toolResultMsg: AnthropicMessage = {
        role: 'user',
        content: toolResults,
      }
      messages.push(toolResultMsg)
      newMessages.push(toolResultMsg)

      // Continue the loop — Claude will process tool results
      continue
    }

    // Unexpected stop_reason
    break
  }

  // Max rounds exceeded — ask Claude for a final text answer
  const finalPrompt: AnthropicMessage = {
    role: 'user',
    content:
      'You have reached the maximum number of tool calls. Please provide a final text response to the user based on what you have learned so far.',
  }
  messages.push(finalPrompt)
  newMessages.push(finalPrompt)

  const finalResponse = await callClaude(apiKey, systemPrompt, messages)
  if (finalResponse) {
    const finalAssistant: AnthropicMessage = {
      role: 'assistant',
      content: finalResponse.content,
    }
    newMessages.push(finalAssistant)
    appendToConversation(chatId, newMessages)

    const text = finalResponse.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    return text || '(No response generated)'
  }

  appendToConversation(chatId, newMessages)
  return "I got a bit lost with that request. Could you try rephrasing?"
}

// ── Anthropic API call ──────────────────────────────────────

async function callClaude(
  apiKey: string,
  system: string,
  messages: AnthropicMessage[],
): Promise<AnthropicResponse | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        tools: TOOL_DEFINITIONS,
        messages,
      }),
      signal: controller.signal,
    })

    if (res.status === 429) {
      console.error('Anthropic rate limited')
      return null
    }

    if (!res.ok) {
      console.error(`Anthropic API error: ${res.status} ${res.statusText}`)
      return null
    }

    return (await res.json()) as AnthropicResponse
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('Anthropic API timeout')
    } else {
      console.error('Anthropic API call failed:', err)
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}
