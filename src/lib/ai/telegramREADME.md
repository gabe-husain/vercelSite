# Adding an Authorized Chat ID

The bot only responds to chat IDs listed in the `TELEGRAM_ALLOWED_CHAT_IDS` environment variable. Any unauthorized user who messages the bot will receive a reply containing their chat ID — which is how you discover it.

---

## Step 1 — Find your Chat ID

1. Open Telegram and start a conversation with your bot (search for its username).
2. Send any message, e.g. `hello`.
3. The bot will reply:
   ```
   Unauthorized. Your chat ID: 123456789
   ```
4. Copy that number — that's your chat ID.

---

## Step 2 — Add it to your environment variables

### Required env vars

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Your bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_ALLOWED_CHAT_IDS` | Comma-separated list of authorized chat IDs |

### Format

```
TELEGRAM_ALLOWED_CHAT_IDS=123456789
```

Multiple IDs (e.g. you + a family member):

```
TELEGRAM_ALLOWED_CHAT_IDS=123456789,987654321
```

### Where to set them

**Vercel**
1. Go to your project → **Settings** → **Environment Variables**
2. Add or update `TELEGRAM_ALLOWED_CHAT_IDS` with the new value
3. Redeploy for the changes to take effect

**Local `.env` file**
```env
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_ALLOWED_CHAT_IDS=123456789,987654321
```

---

## Getting your Bot Token (if you haven't already)

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. BotFather will give you a token like `110201543:AAHdqTcvCH1vGWJxfSeofSas0K6PALDsaw`
4. Add that as `TELEGRAM_BOT_TOKEN` in your environment variables
