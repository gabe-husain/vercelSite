# Telegram Bot & Kitchen Inventory System

Backend library for the myInventory Telegram bot — a kitchen inventory manager with regex parsing, learned pattern matching (engrams), and Claude AI fallback.

## Architecture

Messages flow through a 3-layer chain. Each layer handles what it can and passes the rest down:

```
Telegram message
  │
  ├─ Auth check (TELEGRAM_ALLOWED_CHAT_IDS)
  ├─ Pending tag prompt handling
  │
  ▼
1. Regex Parser ── 32 hardcoded patterns ──► ParsedCommand
  │                                              │
  │  matched                                     ▼
  │  ────────────────────────────────────► dispatchCommand()
  │                                              │
  │  type === 'unknown'                          ▼
  ▼                                         sendReply()
2. Engrams ── learned patterns from DB ──► ParsedCommand
  │                                              │
  │  matched                                     ▼
  │  ── bumpUtterance() ── dispatchCommand() ── reply
  │
  │  no match
  ▼
3. Claude AI (Haiku 4.5) ── tool_use loop ──► direct reply
  │                                    │
  │                                    ├─ may call learn_utterance
  │                                    └─ sends reply via sendReply()
  │
  │  AI unavailable
  ▼
4. Help text fallback
```

## File Map

### Core Bot

| File | Purpose |
|------|---------|
| `telegramBot.ts` | Main bot: `parseMessage()` (32 regex patterns → 19 command types), `dispatchCommand()`, `handleTelegramUpdate()`, `sendReply()`, undo system |
| `autoTagger.ts` | 267 auto-tag rules + manual/dictionary tagging, tag CRUD |
| `kitchenZones.ts` | 35 kitchen zones (A1–N3), 11 grouped pairs, 6 decorative zones |
| `supabaseAdmin.ts` | Service-role Supabase client (bypasses RLS) |
| `queries.ts` | `React.cache()` wrapped queries for web UI: `getItems()`, `getLocations()`, `getCanEdit()` |
| `auth.ts` | Editor email check for web UI mutations |

### AI Integration (`ai/`)

| File | Purpose |
|------|---------|
| `claudeHandler.ts` | `handleAIMessage()` — tool-use loop (max 5 rounds), sends 🔍 thinking indicator, direct Telegram replies |
| `tools.ts` | 10 tool definitions + executors: search, list, add, remove, move, update qty, tag, search-by-tag, web search, learn_utterance |
| `systemPrompt.ts` | `buildSystemPrompt()` — dynamic system prompt with zone list, 13 rules, personality |
| `inventoryCache.ts` | 60-second TTL in-memory cache for items/locations, `searchCachedItems()` |
| `conversationStore.ts` | Per-chat conversation history, 15-min TTL, 20-message cap |
| `braveSearch.ts` | `braveWebSearch()` — top 3 results from Brave Search API |
| `types.ts` | Anthropic API types: messages, content blocks, tool definitions |

### Engrams (`engrams/`)

Learned utterance system — Claude teaches the regex bot new patterns over time.

| File | Purpose |
|------|---------|
| `types.ts` | `LearnedUtterance` (DB shape), `CompiledUtterance` (in-memory with RegExp), `LearnUtteranceInput` (tool input) |
| `ttl.ts` | Spaced repetition: TTL durations, promotion windows, `shouldPromote()`, `getNewExpiry()` |
| `compiler.ts` | `compilePattern()` — converts `"got any {item} left"` to anchored regex. `resolveParamMapping()`, `validatePattern()` |
| `cache.ts` | 5-min cache, max 200 utterances. `getCachedUtterances()`, `saveUtterance()`, `bumpUtterance()` |
| `matcher.ts` | `matchUtterance()` — matches text against compiled utterances, builds `ParsedCommand` |

## Database Tables

### `items`
Kitchen inventory items with name, quantity, location, and notes.

### `locations`
Physical storage locations (maps to kitchen zones).

### `tags`
Tag definitions (e.g., "dairy", "frozen", "snack").

### `item_tags`
Many-to-many join between items and tags. Source field: `'auto'` | `'manual'` | `'dictionary'`.

### `dictionary`
Saved item defaults — when adding an item whose name matches a dictionary entry, its default notes and tags are applied automatically.

### `learned_utterances`
Engram patterns learned by Claude AI.

| Column | Type | Purpose |
|--------|------|---------|
| `pattern` | text UNIQUE | Human-readable template: `"got any {item} left"` |
| `regex` | text | Pre-compiled regex string |
| `command_type` | text | ParsedCommand type: `"check"`, `"add"`, etc. |
| `param_mapping` | jsonb | Maps command params to capture groups: `{"itemName": 1}` |
| `example_input` | text | Original message that taught this pattern |
| `example_extraction` | jsonb | Expected extractions: `{"item": "cheese"}` |
| `ttl_level` | smallint | Spaced repetition tier (0–4) |
| `expires_at` | timestamptz | When this pattern expires if unused |
| `hit_count` | integer | Total times matched |

## Command Reference

All 19 `ParsedCommand` types:

| Type | Required Params | Example Input |
|------|----------------|---------------|
| `check` | `itemName` | "check cheese", "do I have milk" |
| `add` | `itemName`, `quantity`, `zone` | "add 2 eggs to A1", "bought milk in B2" |
| `remove` | `itemName`, optional `zone` | "remove cheese from A1", "finished the eggs" |
| `update-qty` | `itemName`, `quantity` | "set cheese to 3", "I have 5 eggs" |
| `list` | optional `zone` | "list A1", "what's in B2" |
| `list-all` | — | "list all items", "full inventory" |
| `check` | `itemName` | "where is cheese", "find eggs" |
| `tag-search` | `tagName` | "search tag dairy", "tagged frozen" |
| `list-tags` | — | "tags", "show all tags" |
| `list-tags-item` | `itemName` | "tags for cheese" |
| `tag-item` | `itemName`, `tagNames[]` | "tag cheese as dairy, cold" |
| `untag-item` | `itemName`, `tagName` | "untag cheese dairy" |
| `save-dict` | `itemName` | "save dict cheese" |
| `delete-dict` | `itemName` | "delete dict cheese" |
| `list-dict` | — | "dictionary", "saved items" |
| `search-names` | — | "names" |
| `undo` | — | "u", "undo" |
| `skip` | — | "skip" |
| `help` | — | "help", "commands", "?" |

## Engram System (Learned Utterances)

### How It Works
1. User sends "got any cheese left?" → regex fails → no engram match → Claude AI handles it
2. Claude searches inventory, replies, then calls `learn_utterance` with pattern `"got any {item} left"`
3. Pattern is compiled, validated against the example, and saved with TTL level 0 (1 day)
4. Next time: "got any eggs left?" → regex fails → engram matches! → dispatches as `check` command → no AI call

### Spaced Repetition TTL

| Level | Duration | Promotion Trigger (time remaining <) |
|-------|----------|--------------------------------------|
| 0 | 1 day | 12 hours |
| 1 | 1 week | 3 days |
| 2 | 1 month | 2 weeks |
| 3 | 3 months | 1 month |
| 4 | 6 months | 2 months (renews) |

Patterns promote when matched with less than the threshold remaining. Unused patterns expire naturally.

### Pattern Placeholders

| Placeholder | Regex | Example |
|------------|-------|---------|
| `{item}` | `(.+?)` | "cheese", "frozen peas" |
| `{zone}` | `([A-Za-z]\d+)` | "A1", "B2" |
| `{quantity}` | `(\d+)` | "3", "12" |
| `{tag}` | `(.+?)` | "dairy", "frozen" |

## AI Integration

### Model
Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), max 1024 tokens, 25-second timeout.

### Tool-Use Loop
`handleAIMessage()` sends a 🔍 indicator immediately, then enters a loop (max 5 rounds):
1. Call Claude with conversation history + tools
2. If `stop_reason === 'end_turn'` → extract text, send reply, done
3. If `stop_reason === 'tool_use'` → execute all tool calls → feed results back → continue loop
4. If max rounds → ask Claude for a final text response

### 10 Tools
`search_items`, `list_items`, `add_item`, `remove_item`, `move_item`, `update_quantity`, `tag_item`, `search_by_tag`, `web_search`, `learn_utterance`

Mutation tools (`add`, `remove`, `move`, `update_quantity`) register undo actions and invalidate the inventory cache.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key (bypasses RLS) |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Bot API token |
| `TELEGRAM_ALLOWED_CHAT_IDS` | Yes | Comma-separated authorized chat IDs |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `BRAVE_SEARCH_API_KEY` | No | Brave Search API key (web search tool) |
| `EDITOR_EMAILS` | No | Comma-separated editor emails for web UI |

## API Route

`/api/telegram` — POST webhook for Telegram Bot API.

Uses Next.js 15 `after()` to process messages in the background after returning 200 to Telegram. This prevents webhook timeouts during AI processing (Claude can take 5-25 seconds).
