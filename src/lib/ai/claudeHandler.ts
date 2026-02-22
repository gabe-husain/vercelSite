import type {
  AnthropicMessage,
  AnthropicResponse,
  ContentBlock,
  ToolUseBlock,
} from './types'
import { buildSystemPrompt } from './systemPrompt'
import { TOOL_DEFINITIONS, executeTool } from './tools'
import { getConversation, appendToConversation } from './conversationStore'
import { undoStore, sendReply } from '../telegramBot'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 2048
const MAX_ROUNDS = 7
const API_TIMEOUT_MS = 25_000

/** Extract and join all text blocks from a content array. */
function extractText(content: AnthropicResponse['content']): string {
  return content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

/**
 * Handle a message that the regex parser couldn't understand.
 * Sends messages directly to Telegram (thinking indicator + final response).
 * Throws if the AI is unavailable — caller should catch and fall back to help text.
 */
export async function handleAIMessage(
  chatId: number,
  userMessage: string,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  // Send immediate acknowledgment so the user knows we're working
  await sendReply(chatId, '🔍')

  const systemPrompt = buildSystemPrompt()
  const history = getConversation(chatId)

  const newUserMsg: AnthropicMessage = { role: 'user', content: userMessage }
  const messages: AnthropicMessage[] = [...history, newUserMsg]

  // Track new messages added during this call (for saving to conversation store)
  const newMessages: AnthropicMessage[] = [newUserMsg]

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await callClaude(apiKey, systemPrompt, messages)

    if (!response) {
      // API error — send fallback message
      appendToConversation(chatId, newMessages)
      await sendReply(chatId, "Something went wrong on my end. Try again in a sec?")
      return
    }

    const assistantMsg: AnthropicMessage = {
      role: 'assistant',
      content: response.content,
    }
    messages.push(assistantMsg)
    newMessages.push(assistantMsg)

    if (response.stop_reason === 'max_tokens') {
      // Claude hit the token limit mid-response — don't send a truncated mess.
      // Flush any partial text that came through, then apologise.
      const partial = extractText(response.content)
      appendToConversation(chatId, newMessages)
      if (partial) await sendReply(chatId, partial)
      await sendReply(chatId, "✂️ ran out of tokens mid-thought lol. try asking something a lil more specific?")
      return
    }

    if (response.stop_reason === 'end_turn') {
      const text = extractText(response.content)
      appendToConversation(chatId, newMessages)
      await sendReply(chatId, text || '(No response generated)')
      return
    }

    if (response.stop_reason === 'tool_use') {
      // If Claude included text alongside the tool calls (e.g. "got it, on it!"),
      // flush it to the user immediately before we start executing tools.
      const intermediateText = extractText(response.content)
      if (intermediateText) {
        await sendReply(chatId, intermediateText)
      }

      // On the very last allowed round, don't execute tools — we'd have no round
      // left to send a closing message, so the user would be left on 🔍.
      // Instead, break out and let the summary prompt below wrap things up.
      if (round === MAX_ROUNDS - 1) {
        break
      }

      // Show the working indicator before tools run.
      if (round > 0 || intermediateText) {
        await sendReply(chatId, '🔍')
      }

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

      // Continue the loop — Claude will process tool results and (hopefully) end_turn
      continue
    }

    // Unexpected stop_reason
    break
  }

  // Max rounds exceeded — inject a fresh user turn so Claude can still wrap up cleanly.
  // This resets the effective token budget by nudging Claude to summarise.
  const finalPrompt: AnthropicMessage = {
    role: 'user',
    content:
      'You have reached the maximum number of tool calls. Please provide a final text response to the user based on what you have learned so far.',
  }
  messages.push(finalPrompt)
  newMessages.push(finalPrompt)

  const finalResponse = await callClaude(apiKey, systemPrompt, messages, false)
  if (finalResponse) {
    const finalAssistant: AnthropicMessage = {
      role: 'assistant',
      content: finalResponse.content,
    }
    newMessages.push(finalAssistant)
    appendToConversation(chatId, newMessages)

    const text = extractText(finalResponse.content)
    await sendReply(chatId, text || '(No response generated)')
    return
  }

  appendToConversation(chatId, newMessages)
  await sendReply(chatId, "I got a bit lost with that request. Could you try rephrasing?")
}

// ── Anthropic API call ──────────────────────────────────────

async function callClaude(
  apiKey: string,
  system: string,
  messages: AnthropicMessage[],
  includeTools = true,
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
        ...(includeTools ? { tools: TOOL_DEFINITIONS } : {}),
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