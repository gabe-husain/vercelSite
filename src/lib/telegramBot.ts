import { supabaseAdmin } from './supabaseAdmin'
import { KITCHEN_ZONES, ZONE_GROUPS } from './kitchenZones'

// ── Telegram types (minimal) ─────────────────────────────────
interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string }
    chat: { id: number }
    text?: string
  }
}

// ── Parsed command types ─────────────────────────────────────
type ParsedCommand =
  | { type: 'remove'; itemName: string; zone?: string }
  | { type: 'add'; itemName: string; quantity: number; zone: string }
  | { type: 'update-qty'; itemName: string; quantity: number }
  | { type: 'check'; itemName: string }
  | { type: 'undo' }
  | { type: 'list'; zone?: string }
  | { type: 'list-all' }
  | { type: 'help' }
  | { type: 'unknown' }

// ── Undo types ───────────────────────────────────────────────
type UndoAction =
  | { type: 'restore'; item: { name: string; location_id: number; quantity: number; notes: string | null }; description: string }
  | { type: 'delete'; itemId: number; description: string }
  | { type: 'revert-quantity'; itemId: number; previousQuantity: number; description: string }

// Module-level undo store — persists across warm invocations on Vercel.
// Lost on cold start, which is acceptable for single-level undo.
const undoStore = new Map<number, UndoAction>()

// ── Message parser ───────────────────────────────────────────
// Utterance patterns inspired by the Alexa skill interaction model
// plus natural conversational phrasing for text messaging.
function parseMessage(text: string): ParsedCommand {
  const t = text.trim()

  // ── Undo ──
  if (/^u(ndo)?$/i.test(t)) {
    return { type: 'undo' }
  }

  // ── Help ──
  if (/^(help|commands|\?)$/i.test(t)) {
    return { type: 'help' }
  }

  // ── List all ──
  // "list all items", "show everything", "what do I have", "full inventory", "inventory report"
  if (/^(?:list\s+all(?:\s+items)?|show\s+(?:everything|all(?:\s+items)?)|what\s+do\s+I\s+have|(?:full\s+)?inventory(?:\s+report)?|list\s+everything)$/i.test(t)) {
    return { type: 'list-all' }
  }

  // ── List location ──
  // "list N2", "what's in N2", "what is in A1", "show me B2", "open D1"
  const listMatch =
    t.match(/^list\s+(\w+)$/i) ||
    t.match(/^what(?:'s|\s+is)\s+in\s+(\w+)$/i) ||
    t.match(/^(?:show\s+me|open|tell\s+me\s+what'?s?\s+in)\s+(\w+)$/i) ||
    t.match(/^list\s+items\s+in\s+(\w+)$/i)
  if (listMatch) {
    return { type: 'list', zone: listMatch[1].toUpperCase() }
  }

  // "list" with no zone
  if (/^list$/i.test(t)) {
    return { type: 'list' }
  }

  // ── Check / find item ──
  // "how many eggs do I have", "how much milk do I have", "check eggs",
  // "find eggs", "where is the milk", "where are the eggs", "do I have eggs"
  const checkMatch =
    t.match(/^how\s+(?:many|much)\s+(.+?)\s+do\s+I\s+have$/i) ||
    t.match(/^(?:check|find)\s+(?:the\s+)?(.+)$/i) ||
    t.match(/^where\s+(?:is|are)\s+(?:the\s+)?(.+)$/i) ||
    t.match(/^do\s+I\s+have\s+(?:any\s+)?(.+)$/i)
  if (checkMatch) {
    return { type: 'check', itemName: checkMatch[1].trim() }
  }

  // ── Update quantity ──
  // "set eggs to 5", "update milk to 3", "change rice to 2", "I have 5 eggs"
  const updateMatch =
    t.match(/^(?:set|update|change)\s+(.+?)\s+to\s+(\d+)$/i) ||
    t.match(/^I\s+have\s+(\d+)\s+(.+)$/i)
  if (updateMatch) {
    // "I have 5 eggs" captures (quantity, item) — swap order
    const firstIsNumber = /^\d+$/.test(updateMatch[1])
    const itemName = firstIsNumber ? updateMatch[2].trim() : updateMatch[1].trim()
    const quantity = parseInt(firstIsNumber ? updateMatch[1] : updateMatch[2], 10)
    return { type: 'update-qty', itemName, quantity }
  }

  // ── Remove (with optional location) ──
  // "finished (the) X", "used (up) (the) X", "out of (the) X", "no more X"
  // "remove X (from ZONE)", "delete X (from ZONE)", "take out X (from ZONE)", "take X out of ZONE"
  const removeFromMatch =
    t.match(/^(?:remove|delete)\s+(?:the\s+)?(.+?)\s+from\s+(\w+)$/i) ||
    t.match(/^take\s+out\s+(?:the\s+)?(.+?)\s+from\s+(\w+)$/i) ||
    t.match(/^take\s+(?:the\s+)?(.+?)\s+out\s+of\s+(\w+)$/i)
  if (removeFromMatch) {
    return { type: 'remove', itemName: removeFromMatch[1].trim(), zone: removeFromMatch[2].toUpperCase() }
  }

  const removeMatch = t.match(
    /^(?:finished\s+(?:the\s+)?|used\s+(?:up\s+)?(?:the\s+)?|out\s+of\s+(?:the\s+)?|no\s+more\s+|remove\s+(?:the\s+)?|delete\s+(?:the\s+)?)(.+)$/i
  )
  if (removeMatch) {
    return { type: 'remove', itemName: removeMatch[1].trim() }
  }

  // ── Add (with location) ──
  // "bought/added/got/put/store/place (N) X in/to/at ZONE"
  // "I put the X in ZONE", "I put N X in ZONE"
  const addMatch =
    t.match(/^(?:bought|added|got|put|store|stored|place|placed)\s+(?:(\d+)\s+)?(.+?)\s+(?:in|to|at)\s+(\w+)$/i) ||
    t.match(/^I\s+(?:bought|added|got|put|stored|placed)\s+(?:(\d+)\s+)?(?:the\s+)?(.+?)\s+(?:in|to|at)\s+(\w+)$/i) ||
    t.match(/^add\s+(?:(\d+)\s+)?(.+?)\s+(?:in|to|at)\s+(\w+)$/i)
  if (addMatch) {
    return {
      type: 'add',
      itemName: addMatch[2].trim(),
      quantity: addMatch[1] ? parseInt(addMatch[1], 10) : 1,
      zone: addMatch[3].toUpperCase(),
    }
  }

  return { type: 'unknown' }
}

// ── Zone → location resolution ───────────────────────────────
async function resolveZoneToLocation(zoneId: string): Promise<{ locationId: number; locationName: string } | null> {
  const resolvedId = ZONE_GROUPS[zoneId] || zoneId
  const zone = KITCHEN_ZONES.find(z => z.id === resolvedId)
  if (!zone) return null

  const { data } = await supabaseAdmin
    .from('locations')
    .select('id, name')
    .eq('name', zone.locationName)
    .single()

  if (!data) return null
  return { locationId: data.id, locationName: data.name }
}

// ── Helper: find items by name ───────────────────────────────
async function findItemsByName(itemName: string) {
  // Exact match first (case-insensitive)
  const { data: exact } = await supabaseAdmin
    .from('items')
    .select('id, name, quantity, location_id, notes, location:locations(id, name)')
    .ilike('name', itemName)

  if (exact && exact.length > 0) return exact

  // Partial match fallback
  const { data: partial } = await supabaseAdmin
    .from('items')
    .select('id, name, quantity, location_id, notes, location:locations(id, name)')
    .ilike('name', `%${itemName}%`)

  return partial || []
}

function getLocName(item: { location?: unknown }): string {
  const loc = Array.isArray(item.location) ? item.location[0] : item.location
  return (loc as { name?: string })?.name || 'unknown location'
}

// ── Command handlers ─────────────────────────────────────────
async function handleRemove(itemName: string, chatId: number, zone?: string): Promise<string> {
  let items = await findItemsByName(itemName)

  // If zone specified, filter to that location
  if (zone && items.length > 0) {
    const location = await resolveZoneToLocation(zone)
    if (!location) return `Unknown zone "${zone}".`
    items = items.filter(i => i.location_id === location.locationId)
  }

  if (items.length === 0) {
    return `Could not find "${itemName}" in inventory.`
  }
  if (items.length > 1) {
    const names = items.map(i => `- ${i.name} in ${getLocName(i)}`).join('\n')
    return `Multiple matches for "${itemName}":\n${names}\nPlease be more specific (e.g. "remove ${itemName} from A1").`
  }

  const item = items[0]
  const locationName = getLocName(item)

  const { error } = await supabaseAdmin
    .from('items')
    .delete()
    .eq('id', item.id)

  if (error) return `Error removing ${item.name}: ${error.message}`

  undoStore.set(chatId, {
    type: 'restore',
    item: { name: item.name, location_id: item.location_id, quantity: item.quantity, notes: item.notes },
    description: `${item.name} restored to ${locationName}`,
  })

  return `${item.name} removed from ${locationName}, type u to undo`
}

async function handleAdd(itemName: string, quantity: number, zone: string, chatId: number): Promise<string> {
  const location = await resolveZoneToLocation(zone)
  if (!location) {
    const validZones = KITCHEN_ZONES
      .filter(z => z.clickable && !z.opensAs)
      .map(z => z.id)
      .join(', ')
    return `Unknown zone "${zone}". Valid zones: ${validZones}`
  }

  // Check if item already exists in that location
  const { data: existing } = await supabaseAdmin
    .from('items')
    .select('id, name, quantity')
    .ilike('name', itemName)
    .eq('location_id', location.locationId)
    .maybeSingle()

  if (existing) {
    const newQty = existing.quantity + quantity
    const { error } = await supabaseAdmin
      .from('items')
      .update({ quantity: newQty })
      .eq('id', existing.id)

    if (error) return `Error updating ${existing.name}: ${error.message}`

    undoStore.set(chatId, {
      type: 'revert-quantity',
      itemId: existing.id,
      previousQuantity: existing.quantity,
      description: `${existing.name} quantity reverted to ${existing.quantity} in ${zone}`,
    })

    return `Updated ${existing.name} in ${zone}: ${existing.quantity} → ${newQty}, type u to undo`
  }

  // Insert new item
  const { data: inserted, error } = await supabaseAdmin
    .from('items')
    .insert({ name: itemName, location_id: location.locationId, quantity, notes: null })
    .select('id')
    .single()

  if (error || !inserted) return `Error adding ${itemName}: ${error?.message || 'unknown error'}`

  undoStore.set(chatId, {
    type: 'delete',
    itemId: inserted.id,
    description: `${itemName} removed from ${zone}`,
  })

  return `Added ${quantity} ${itemName} to ${zone}, type u to undo`
}

async function handleUpdateQty(itemName: string, quantity: number, chatId: number): Promise<string> {
  const items = await findItemsByName(itemName)

  if (items.length === 0) {
    return `Could not find "${itemName}" in inventory.`
  }
  if (items.length > 1) {
    const details = items.map(i => `- ${i.name} (x${i.quantity}) in ${getLocName(i)}`).join('\n')
    return `Found ${itemName} in multiple locations:\n${details}\nPlease remove/add specifically.`
  }

  const item = items[0]
  const prevQty = item.quantity
  const locationName = getLocName(item)

  const { error } = await supabaseAdmin
    .from('items')
    .update({ quantity })
    .eq('id', item.id)

  if (error) return `Error updating ${item.name}: ${error.message}`

  undoStore.set(chatId, {
    type: 'revert-quantity',
    itemId: item.id,
    previousQuantity: prevQty,
    description: `${item.name} quantity reverted to ${prevQty} in ${locationName}`,
  })

  return `Updated ${item.name} in ${locationName}: ${prevQty} → ${quantity}, type u to undo`
}

async function handleCheck(itemName: string): Promise<string> {
  const items = await findItemsByName(itemName)

  if (items.length === 0) {
    return `No "${itemName}" found in inventory.`
  }
  if (items.length === 1) {
    const item = items[0]
    return `You have ${item.quantity} ${item.name} in ${getLocName(item)}.`
  }

  // Multiple locations
  const total = items.reduce((sum, i) => sum + i.quantity, 0)
  const details = items.map(i => `- ${i.quantity} in ${getLocName(i)}`).join('\n')
  return `You have ${total} ${itemName} total:\n${details}`
}

async function handleUndo(chatId: number): Promise<string> {
  const action = undoStore.get(chatId)
  if (!action) return 'Nothing to undo.'

  undoStore.delete(chatId)

  switch (action.type) {
    case 'restore': {
      const { error } = await supabaseAdmin.from('items').insert(action.item)
      if (error) return `Undo failed: ${error.message}`
      return `Undone: ${action.description}`
    }
    case 'delete': {
      const { error } = await supabaseAdmin.from('items').delete().eq('id', action.itemId)
      if (error) return `Undo failed: ${error.message}`
      return `Undone: ${action.description}`
    }
    case 'revert-quantity': {
      const { error } = await supabaseAdmin
        .from('items')
        .update({ quantity: action.previousQuantity })
        .eq('id', action.itemId)
      if (error) return `Undo failed: ${error.message}`
      return `Undone: ${action.description}`
    }
  }
}

async function handleList(zone?: string): Promise<string> {
  if (zone) {
    const location = await resolveZoneToLocation(zone)
    if (!location) return `Unknown zone "${zone}".`

    const { data: items } = await supabaseAdmin
      .from('items')
      .select('name, quantity')
      .eq('location_id', location.locationId)
      .order('name')

    if (!items || items.length === 0) return `No items in ${zone}.`
    return `Items in ${zone}:\n` + items.map(i => `- ${i.name} (x${i.quantity})`).join('\n')
  }

  const { count } = await supabaseAdmin
    .from('items')
    .select('*', { count: 'exact', head: true })

  return `Total items in inventory: ${count || 0}. Send "list <zone>" to see a specific zone (e.g. "list N2").`
}

async function handleListAll(): Promise<string> {
  const { data: items } = await supabaseAdmin
    .from('items')
    .select('name, quantity, location:locations(name)')
    .order('name')

  if (!items || items.length === 0) return 'Inventory is empty.'

  const lines = items.map(i => {
    const loc = Array.isArray(i.location) ? i.location[0] : i.location
    const locName = (loc as { name?: string })?.name || '?'
    return `- ${i.name} (x${i.quantity}) in ${locName}`
  })

  return `Full inventory (${items.length} items):\n${lines.join('\n')}`
}

// ── Telegram reply helper ────────────────────────────────────
async function sendReply(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN!
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

// ── Main handler (exported) ──────────────────────────────────
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message
  if (!message?.text) return

  const chatId = message.chat.id
  const text = message.text

  // Authorization: check chat ID
  const allowedIds = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id))

  if (!allowedIds.includes(chatId)) {
    await sendReply(chatId, `Unauthorized. Your chat ID: ${chatId}`)
    return
  }

  const command = parseMessage(text)
  let reply: string

  switch (command.type) {
    case 'remove':
      reply = await handleRemove(command.itemName, chatId, command.zone)
      break
    case 'add':
      reply = await handleAdd(command.itemName, command.quantity, command.zone, chatId)
      break
    case 'update-qty':
      reply = await handleUpdateQty(command.itemName, command.quantity, chatId)
      break
    case 'check':
      reply = await handleCheck(command.itemName)
      break
    case 'undo':
      reply = await handleUndo(chatId)
      break
    case 'list':
      reply = await handleList(command.zone)
      break
    case 'list-all':
      reply = await handleListAll()
      break
    case 'help':
      reply = [
        'Kitchen Inventory Bot commands:',
        '',
        'Add items:',
        '• "Bought 5 Bananas in N2"',
        '• "I put the rice in A1"',
        '• "Added milk to F1"',
        '',
        'Remove items:',
        '• "Finished the Dumpling Sauce"',
        '• "Used up the milk"',
        '• "Remove eggs from A2"',
        '• "Take out bread from B1"',
        '',
        'Check items:',
        '• "How many eggs do I have"',
        '• "Where is the milk"',
        '• "Find rice"',
        '',
        'Update quantity:',
        '• "Set eggs to 5"',
        '• "I have 3 milk"',
        '',
        'List:',
        '• "List N2" or "What\'s in A1"',
        '• "List all items" or "Show everything"',
        '',
        '• "u" to undo last action',
      ].join('\n')
      break
    case 'unknown':
      reply = [
        "I didn't understand that. Try:",
        '• "Bought 5 Bananas in N2"',
        '• "Finished the Dumpling Sauce"',
        '• "How many eggs do I have"',
        '• "List N2"',
        '• "help" for all commands',
      ].join('\n')
      break
  }

  await sendReply(chatId, reply)
}
