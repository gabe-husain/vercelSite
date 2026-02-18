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
  | { type: 'search-names' }
  | { type: 'help' }
  | { type: 'unknown' }

// ── Found item with match source ─────────────────────────────
type FoundItem = {
  id: number
  name: string
  quantity: number
  location_id: number
  notes: string | null
  location: unknown
  matchedVia: 'name-exact' | 'name-partial' | 'notes'
}

// ── Undo types ───────────────────────────────────────────────
type UndoAction =
  | { type: 'restore'; item: { name: string; location_id: number; quantity: number; notes: string | null }; description: string }
  | { type: 'delete'; itemId: number; description: string }
  | { type: 'revert-quantity'; itemId: number; previousQuantity: number; description: string }

// Module-level stores — persist across warm invocations on Vercel.
const undoStore = new Map<number, UndoAction>()
const lastSearchStore = new Map<number, { query: string; results: FoundItem[] }>()

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

  // ── Search follow-up: "names" ──
  if (/^names?$/i.test(t)) {
    return { type: 'search-names' }
  }

  // ── List all ──
  if (/^(?:list\s+all(?:\s+items)?|show\s+(?:everything|all(?:\s+items)?)|what\s+do\s+I\s+have|(?:full\s+)?inventory(?:\s+report)?|list\s+everything)$/i.test(t)) {
    return { type: 'list-all' }
  }

  // ── List location ──
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
  const checkMatch =
    t.match(/^how\s+(?:many|much)\s+(.+?)\s+do\s+I\s+have$/i) ||
    t.match(/^(?:check|find)\s+(?:the\s+)?(.+)$/i) ||
    t.match(/^where\s+(?:is|are)\s+(?:the\s+)?(.+)$/i) ||
    t.match(/^do\s+I\s+have\s+(?:any\s+)?(.+)$/i)
  if (checkMatch) {
    return { type: 'check', itemName: checkMatch[1].trim() }
  }

  // ── Update quantity ──
  const updateMatch =
    t.match(/^(?:set|update|change)\s+(.+?)\s+to\s+(\d+)$/i) ||
    t.match(/^I\s+have\s+(\d+)\s+(.+)$/i)
  if (updateMatch) {
    const firstIsNumber = /^\d+$/.test(updateMatch[1])
    const itemName = firstIsNumber ? updateMatch[2].trim() : updateMatch[1].trim()
    const quantity = parseInt(firstIsNumber ? updateMatch[1] : updateMatch[2], 10)
    return { type: 'update-qty', itemName, quantity }
  }

  // ── Remove (with optional location) ──
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

// ── Helper: find items by name AND notes ─────────────────────
// Searches: exact name → partial name → notes → combined & deduplicated.
// Each result is tagged with how it matched so replies can explain why.
async function findItems(query: string): Promise<FoundItem[]> {
  const select = 'id, name, quantity, location_id, notes, location:locations(id, name)'

  // 1. Exact name match — if we get hits, return immediately (highest confidence)
  const { data: exact } = await supabaseAdmin
    .from('items').select(select).ilike('name', query)
  if (exact && exact.length > 0) {
    return exact.map(i => ({ ...i, matchedVia: 'name-exact' as const }))
  }

  // 2. Partial name match + notes match in parallel
  const [nameRes, notesRes] = await Promise.all([
    supabaseAdmin.from('items').select(select).ilike('name', `%${query}%`),
    supabaseAdmin.from('items').select(select).ilike('notes', `%${query}%`),
  ])

  // 3. Combine + deduplicate (name matches listed first)
  const seen = new Set<number>()
  const results: FoundItem[] = []

  for (const i of (nameRes.data || [])) {
    if (!seen.has(i.id)) { seen.add(i.id); results.push({ ...i, matchedVia: 'name-partial' }) }
  }
  for (const i of (notesRes.data || [])) {
    if (!seen.has(i.id)) { seen.add(i.id); results.push({ ...i, matchedVia: 'notes' }) }
  }

  return results
}

function getLocName(item: { location?: unknown }): string {
  const loc = Array.isArray(item.location) ? item.location[0] : item.location
  return (loc as { name?: string })?.name || 'unknown location'
}

function matchLabel(via: FoundItem['matchedVia']): string {
  if (via === 'notes') return ' [in notes]'
  return ''
}

// ── Command handlers ─────────────────────────────────────────
async function handleRemove(itemName: string, chatId: number, zone?: string): Promise<string> {
  let items = await findItems(itemName)

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
    const names = items.map(i => `- ${i.name} in ${getLocName(i)}${matchLabel(i.matchedVia)}`).join('\n')
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

  const via = item.matchedVia === 'notes' ? ' (matched via notes)' : ''
  return `${item.name} removed from ${locationName}${via}, type u to undo`
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
  const items = await findItems(itemName)

  if (items.length === 0) {
    return `Could not find "${itemName}" in inventory.`
  }
  if (items.length > 1) {
    const details = items.map(i => `- ${i.name} (x${i.quantity}) in ${getLocName(i)}${matchLabel(i.matchedVia)}`).join('\n')
    return `Found "${itemName}" in multiple places:\n${details}\nPlease remove/add specifically.`
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

async function handleCheck(itemName: string, chatId: number): Promise<string> {
  const items = await findItems(itemName)

  if (items.length === 0) {
    return `No "${itemName}" found in inventory.`
  }

  // Single result — show full detail
  if (items.length === 1) {
    const item = items[0]
    const loc = getLocName(item)
    const via = item.matchedVia === 'notes' ? '\n(matched via notes)' : ''
    const notes = item.notes ? `\nNotes: ${item.notes}` : ''
    return `You have ${item.quantity} ${item.name} in ${loc}.${notes}${via}`
  }

  // Multiple results — store for follow-up drilling
  lastSearchStore.set(chatId, { query: itemName, results: items })

  // 2-5 results: show inline
  if (items.length <= 5) {
    const lines = items.map(i => {
      return `- ${i.name} (x${i.quantity}) in ${getLocName(i)}${matchLabel(i.matchedVia)}`
    })
    return [
      `I found ${items.length} mentions of "${itemName}":`,
      ...lines,
      '',
      'Reply with a name or zone to narrow down.',
    ].join('\n')
  }

  // 6+ results: summarize, prompt to drill down
  const zones = Array.from(new Set(items.map(i => getLocName(i))))
  const zonePreview = zones.slice(0, 4).join(', ') + (zones.length > 4 ? '...' : '')
  return [
    `I found ${items.length} mentions of "${itemName}".`,
    'Is there a specific location you expect to find them in?',
    '',
    `Reply with:`,
    `• "names" to hear their names`,
    `• A zone (${zonePreview}) to filter by location`,
  ].join('\n')
}

async function handleSearchNames(chatId: number): Promise<string> {
  const search = lastSearchStore.get(chatId)
  if (!search) return 'No previous search to show names for.'

  const lines = search.results.map(i => {
    return `- ${i.name} (x${i.quantity}) in ${getLocName(i)}${matchLabel(i.matchedVia)}`
  })
  return [
    `All ${search.results.length} results for "${search.query}":`,
    ...lines,
  ].join('\n')
}

async function handleSearchFilterZone(chatId: number, zone: string): Promise<string> {
  const search = lastSearchStore.get(chatId)
  if (!search) return 'No previous search to filter.'

  const location = await resolveZoneToLocation(zone)
  if (!location) return `Unknown zone "${zone}".`

  const filtered = search.results.filter(i => i.location_id === location.locationId)
  if (filtered.length === 0) {
    return `No results for "${search.query}" in ${zone}.`
  }

  const lines = filtered.map(i => {
    return `- ${i.name} (x${i.quantity})${matchLabel(i.matchedVia)}`
  })
  return [
    `${filtered.length} result${filtered.length > 1 ? 's' : ''} for "${search.query}" in ${zone}:`,
    ...lines,
  ].join('\n')
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
      reply = await handleCheck(command.itemName, chatId)
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
    case 'search-names':
      reply = await handleSearchNames(chatId)
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
        'Check / find items (searches name + notes):',
        '• "How many eggs do I have"',
        '• "Where is the milk"',
        '• "Find noodles"',
        '• "Do I have corn"',
        '',
        'Update quantity:',
        '• "Set eggs to 5"',
        '• "I have 3 milk"',
        '',
        'List:',
        '• "List N2" or "What\'s in A1"',
        '• "List all items" or "Show everything"',
        '',
        'After a search with multiple results:',
        '• "names" to see all matched item names',
        '• A zone like "A2" to filter by location',
        '',
        '• "u" to undo last action',
      ].join('\n')
      break
    case 'unknown': {
      // Before showing help, check if this is a bare zone ID with a pending search
      const t = text.trim().toUpperCase()
      if (/^[A-Z]\d+$/.test(t) && lastSearchStore.has(chatId)) {
        reply = await handleSearchFilterZone(chatId, t)
        break
      }

      reply = [
        "I didn't understand that. Try:",
        '• "Bought 5 Bananas in N2"',
        '• "Finished the Dumpling Sauce"',
        '• "How many eggs do I have"',
        '• "Find noodles" (searches notes too)',
        '• "List N2"',
        '• "help" for all commands',
      ].join('\n')
      break
    }
  }

  await sendReply(chatId, reply)
}
