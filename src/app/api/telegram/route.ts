import { NextRequest, NextResponse, after } from 'next/server'
import { handleTelegramUpdate } from '@/src/lib/telegramBot'

export async function POST(request: NextRequest) {
  // Validate webhook secret
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const update = await request.json()
    // Process in background so we return 200 immediately to Telegram.
    // AI tool-use loops can take 5-15s; without after(), Telegram may timeout and retry.
    after(async () => {
      try {
        await handleTelegramUpdate(update)
      } catch (err) {
        console.error('Telegram handler error:', err)
      }
    })
  } catch (err) {
    console.error('Telegram webhook parse error:', err)
  }

  // Always return 200 — Telegram retries on non-200 responses
  return NextResponse.json({ ok: true })
}
