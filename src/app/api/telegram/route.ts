import { NextRequest, NextResponse } from 'next/server'
import { handleTelegramUpdate } from '@/src/lib/telegramBot'

export async function POST(request: NextRequest) {
  // Validate webhook secret
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const update = await request.json()
    await handleTelegramUpdate(update)
  } catch (err) {
    console.error('Telegram webhook error:', err)
  }

  // Always return 200 — Telegram retries on non-200 responses
  return NextResponse.json({ ok: true })
}
