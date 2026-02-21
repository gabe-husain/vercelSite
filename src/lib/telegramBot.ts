import { supabaseAdmin } from './supabaseAdmin'
import { KITCHEN_ZONES, ZONE_GROUPS } from './kitchenZones'
import {
  applyAutoTags,
  applyManualTags,
  applyDictionaryDefaults,
  computeAutoTags,
  saveDictionary,
  getDictionary,
  deleteDictionary,
  getTagsForItem,
  findItemsByTag,
  getAllTags,
  removeTagFromItem,
} from './autoTagger'
import { handleAIMessage } from './ai/claudeHandler'

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
  | { type: 'tag-search'; tagName: string }
  | { type: 'list-tags' }
  | { type: 'list-tags-item'; itemName: string }
  | { type: 'tag-item'; itemName: string; tagNames: string[] }
  | { type: 'untag-item'; itemName: string; tagName: string }
  | { type: 'save-dict'; itemName: string }
  | { type: 'list-dict' }
  | { type: 'delete-dict'; itemName: string }
  | { type: 'skip' }
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
export type UndoAction =
  | { type: 'restore'; item: { name: string; location_id: number; quantity: number; notes: string | null }; description: string }
  | { type: 'delete'; itemId: number; description: string }
  | { type: 'revert-quantity'; itemId: number; previousQuantity: number; description: string }
  | { type: 'revert-location'; itemId: number; previousLocationId: number; description: string }

// ── Pending tag prompt ───────────────────────────────────────
type PendingTagPrompt = {
  itemId: number
  itemName: string
  autoTags: string[]
  expiresAt: number // Date.now() + 5 minutes
}

// Module-level stores — persist across warm invocations on Vercel.
export const undoStore = new Map<number, UndoAction>()
const lastSearchStore = new Map<number, { query: string; results: FoundItem[] }>()
const pendingTagStore = new Map<number, PendingTagPrompt>()

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

  // ── Skip (tag prompt dismiss) ──
  if (/^skip$/i.test(t)) {
    return { type: 'skip' }
  }

  // ── Search follow-up: "names" ──
  if (/^names?$/i.test(t)) {
    return { type: 'search-names' }
  }

  // ── Tag commands (MUST come before check/find to avoid conflicts) ──

  // "find by tag X" / "search by tag X" / "search tag X"
  const tagSearchMatch = t.match(/^(?:search|find)\s+(?:by\s+)?tag(?:ged)?\s+(.+)$/i)
  if (tagSearchMatch) {
    return { type: 'tag-search', tagName: tagSearchMatch[1].trim() }
  }

  // "tagged X" (shorthand)
  const taggedMatch = t.match(/^tagged\s+(.+)$/i)
  if (taggedMatch) {
    return { type: 'tag-search', tagName: taggedMatch[1].trim() }
  }

  // "tags for X" / "tags X" / "tag X" (show tags on item — but NOT "tag X as Y")
  const tagsItemMatch = t.match(/^tags?\s+(?:for\s+)?(.+)$/i)
  if (tagsItemMatch && !/\s+(?:as|with)\s+/i.test(tagsItemMatch[1])) {
    return { type: 'list-tags-item', itemName: tagsItemMatch[1].trim() }
  }

  // "tags" / "show tags" / "all tags"
  if (/^(?:show\s+)?(?:all\s+)?tags$/i.test(t)) {
    return { type: 'list-tags' }
  }

  // "tag X as Y,Z" / "tag X with Y,Z"
  const tagItemMatch = t.match(/^tag\s+(.+?)\s+(?:as|with)\s+(.+)$/i)
  if (tagItemMatch) {
    const tagNames = tagItemMatch[2].split(',').map(s => s.trim()).filter(Boolean)
    return { type: 'tag-item', itemName: tagItemMatch[1].trim(), tagNames }
  }

  // "untag X Y"
  const untagMatch = t.match(/^untag\s+(.+?)\s+(\S+)$/i)
  if (untagMatch) {
    return { type: 'untag-item', itemName: untagMatch[1].trim(), tagName: untagMatch[2].trim() }
  }

  // ── Dictionary commands ──

  // "save dict X" / "save dictionary X"
  const saveDictMatch = t.match(/^save\s+dict(?:ionary)?\s+(.+)$/i)
  if (saveDictMatch) {
    return { type: 'save-dict', itemName: saveDictMatch[1].trim() }
  }

  // "delete dict X"
  const deleteDictMatch = t.match(/^delete\s+dict(?:ionary)?\s+(.+)$/i)
  if (deleteDictMatch) {
    return { type: 'delete-dict', itemName: deleteDictMatch[1].trim() }
  }

  // "dict" / "dictionary" / "saved items"
  if (/^(?:dict(?:ionary)?|saved\s+items)$/i.test(t)) {
    return { type: 'list-dict' }
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
    .select('id, name, quantity, notes')
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

    // Re-run auto-tags on update (additive-only)
    await applyAutoTags(existing.id, existing.name, existing.notes)

    undoStore.set(chatId, {
      type: 'revert-quantity',
      itemId: existing.id,
      previousQuantity: existing.quantity,
      description: `${existing.name} quantity reverted to ${existing.quantity} in ${zone}`,
    })

    return `Updated ${existing.name} in ${zone}: ${existing.quantity} → ${newQty}, type u to undo`
  }

  // Check dictionary for defaults BEFORE inserting
  const dictDefaults = await applyDictionaryDefaults(itemName)
  const insertNotes = dictDefaults?.notes ?? null

  // Insert new item
  const { data: inserted, error } = await supabaseAdmin
    .from('items')
    .insert({ name: itemName, location_id: location.locationId, quantity, notes: insertNotes })
    .select('id')
    .single()

  if (error || !inserted) return `Error adding ${itemName}: ${error?.message || 'unknown error'}`

  undoStore.set(chatId, {
    type: 'delete',
    itemId: inserted.id,
    description: `${itemName} removed from ${zone}`,
  })

  // Apply auto-tags
  await applyAutoTags(inserted.id, itemName, insertNotes)
  const autoTags = computeAutoTags(itemName, insertNotes)

  // If dictionary match found — apply dictionary tags too, no tag prompt needed
  if (dictDefaults) {
    if (dictDefaults.tags && dictDefaults.tags.length > 0) {
      await applyManualTags(inserted.id, dictDefaults.tags, 'dictionary')
    }
    const allTags = Array.from(new Set([...autoTags, ...(dictDefaults.tags ?? [])]))
    const tagLine = allTags.length > 0 ? `\nTagged: ${allTags.join(', ')}` : ''
    const notesLine = insertNotes ? `\nNotes (from dictionary): ${insertNotes}` : ''
    return `Added ${quantity} ${itemName} to ${zone}, type u to undo${tagLine}${notesLine}`
  }

  // No dictionary match — set pending tag prompt
  pendingTagStore.set(chatId, {
    itemId: inserted.id,
    itemName,
    autoTags,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  })

  if (autoTags.length > 0) {
    return [
      `Added ${quantity} ${itemName} to ${zone}, type u to undo`,
      `Auto-tagged: ${autoTags.join(', ')}`,
      `Reply with extra tags (comma-separated) or "skip"`,
    ].join('\n')
  }

  return [
    `Added ${quantity} ${itemName} to ${zone}, type u to undo`,
    `No auto-tags matched.`,
    `Reply with tags (comma-separated) or "skip"`,
  ].join('\n')
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
    case 'revert-location': {
      const { error } = await supabaseAdmin
        .from('items')
        .update({ location_id: action.previousLocationId })
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

// ── Tag & Dictionary handlers ────────────────────────────────

async function handleTagSearch(tagName: string): Promise<string> {
  const items = await findItemsByTag(tagName)
  if (items.length === 0) {
    return `No items tagged with "${tagName}".`
  }

  const lines = items.map(i => `- ${i.name} (x${i.quantity}) in ${i.locationName}`)
  return [
    `Items tagged "${tagName}" (${items.length}):`,
    ...lines,
  ].join('\n')
}

async function handleListTagsCmd(): Promise<string> {
  const tags = await getAllTags()
  if (tags.length === 0) return 'No tags exist yet.'

  // Group by category
  const grouped = new Map<string, { name: string; count: number }[]>()
  for (const tag of tags) {
    const list = grouped.get(tag.category) ?? []
    list.push({ name: tag.name, count: tag.count })
    grouped.set(tag.category, list)
  }

  const lines: string[] = ['All tags:']
  grouped.forEach((tagList, category) => {
    const tagStrs = tagList.map(t => t.count > 0 ? `${t.name} (${t.count})` : t.name)
    lines.push(`[${category}] ${tagStrs.join(', ')}`)
  })

  return lines.join('\n')
}

async function handleListTagsItem(itemName: string): Promise<string> {
  const items = await findItems(itemName)
  if (items.length === 0) return `No item found matching "${itemName}".`
  if (items.length > 1) {
    return `Multiple matches for "${itemName}". Be more specific.`
  }

  const item = items[0]
  const tags = await getTagsForItem(item.id)

  if (tags.length === 0) {
    return `${item.name} has no tags.`
  }

  const tagStrs = tags.map(t => `${t.name} (${t.source})`)
  return `Tags for ${item.name}: ${tagStrs.join(', ')}`
}

async function handleTagItem(itemName: string, tagNames: string[]): Promise<string> {
  const items = await findItems(itemName)
  if (items.length === 0) return `No item found matching "${itemName}".`
  if (items.length > 1) {
    return `Multiple matches for "${itemName}". Be more specific.`
  }

  const item = items[0]
  await applyManualTags(item.id, tagNames, 'manual')
  return `Tagged ${item.name} with: ${tagNames.join(', ')}`
}

async function handleUntagItem(itemName: string, tagName: string): Promise<string> {
  const items = await findItems(itemName)
  if (items.length === 0) return `No item found matching "${itemName}".`
  if (items.length > 1) {
    return `Multiple matches for "${itemName}". Be more specific.`
  }

  const item = items[0]
  const result = await removeTagFromItem(item.id, tagName)
  if (!result.success) return result.error || 'Error removing tag.'
  return `Removed tag "${tagName}" from ${item.name}.`
}

async function handleSaveDictCmd(itemName: string): Promise<string> {
  const items = await findItems(itemName)
  if (items.length === 0) return `No item named "${itemName}" in inventory. Add it first.`
  if (items.length > 1) return `Multiple matches for "${itemName}". Be more specific.`

  const item = items[0]
  const tags = await getTagsForItem(item.id)
  const tagNames = tags.map(t => t.name)
  const zoneName = getLocName(item)

  const result = await saveDictionary({
    itemName: item.name,
    defaultNotes: item.notes,
    defaultZone: zoneName,
    defaultTags: tagNames,
  })

  if (!result.success) return `Error saving to dictionary: ${result.error}`

  const parts = [`Saved "${item.name}" to dictionary`]
  if (tagNames.length > 0) parts.push(`tags: [${tagNames.join(', ')}]`)
  if (zoneName) parts.push(`zone: ${zoneName}`)
  if (item.notes) parts.push(`notes: ${item.notes}`)
  return parts.join(', ')
}

async function handleListDictCmd(): Promise<string> {
  const entries = await getDictionary()
  if (entries.length === 0) return 'Dictionary is empty. Use "save dict <item>" to save an item as a template.'

  const lines = entries.map(e => {
    const parts = [`- ${e.item_name}`]
    if (e.default_zone) parts.push(`zone: ${e.default_zone}`)
    if (e.default_tags.length > 0) parts.push(`tags: [${e.default_tags.join(', ')}]`)
    if (e.default_notes) parts.push(`notes: ${e.default_notes}`)
    return parts.join(' | ')
  })

  return `Personal Dictionary (${entries.length}):\n${lines.join('\n')}`
}

async function handleDeleteDictCmd(itemName: string): Promise<string> {
  const result = await deleteDictionary(itemName)
  if (!result.success) return `Error deleting from dictionary: ${result.error}`
  return `Removed "${itemName}" from dictionary.`
}

// ── Telegram reply helper ────────────────────────────────────
export async function sendReply(chatId: number, text: string): Promise<void> {
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

  // ── Pending tag prompt handling ──
  // If there's a pending tag prompt for this chat, handle it before parsing as normal command
  const pending = pendingTagStore.get(chatId)
  if (pending) {
    // Check expiration (5 min)
    if (Date.now() > pending.expiresAt) {
      pendingTagStore.delete(chatId)
      // Fall through to normal command parsing
    } else if (/^skip$/i.test(text.trim())) {
      pendingTagStore.delete(chatId)
      await sendReply(chatId, 'Skipped tagging.')
      return
    } else {
      // Check if user sent a real command instead of tags
      const maybeCommand = parseMessage(text)
      if (maybeCommand.type !== 'unknown' && maybeCommand.type !== 'skip') {
        // User sent a real command — clear pending and process normally
        pendingTagStore.delete(chatId)
      } else {
        // Treat as comma-separated tag names
        const tagNames = text.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        if (tagNames.length > 0) {
          await applyManualTags(pending.itemId, tagNames, 'manual')
          pendingTagStore.delete(chatId)
          await sendReply(chatId, `Tagged ${pending.itemName} with: ${tagNames.join(', ')}`)
          return
        }
        // Empty input — clear and fall through
        pendingTagStore.delete(chatId)
      }
    }
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
    case 'tag-search':
      reply = await handleTagSearch(command.tagName)
      break
    case 'list-tags':
      reply = await handleListTagsCmd()
      break
    case 'list-tags-item':
      reply = await handleListTagsItem(command.itemName)
      break
    case 'tag-item':
      reply = await handleTagItem(command.itemName, command.tagNames)
      break
    case 'untag-item':
      reply = await handleUntagItem(command.itemName, command.tagName)
      break
    case 'save-dict':
      reply = await handleSaveDictCmd(command.itemName)
      break
    case 'list-dict':
      reply = await handleListDictCmd()
      break
    case 'delete-dict':
      reply = await handleDeleteDictCmd(command.itemName)
      break
    case 'skip':
      // Handled by pending tag store check above; fallback
      reply = 'Nothing to skip.'
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
        'Tags:',
        '• "tags milk" — show tags on an item',
        '• "tags" — list all tags',
        '• "find by tag dairy" — search items by tag',
        '• "tagged dairy" — shorthand for above',
        '• "tag milk as organic, local" — add tags manually',
        '• "untag milk dairy" — remove a tag',
        '',
        'Dictionary (saved templates):',
        '• "save dict milk" — save item as template',
        '• "dict" — list saved templates',
        '• "delete dict milk" — remove a template',
        '',
        '• "u" to undo last action',
      ].join('\n')
      break
    case 'unknown': {
      // Before AI fallback, check if this is a bare zone ID with a pending search
      const t = text.trim().toUpperCase()
      if (/^[A-Z]\d+$/.test(t) && lastSearchStore.has(chatId)) {
        reply = await handleSearchFilterZone(chatId, t)
        break
      }

      // Escalate to Claude AI
      try {
        const aiReply = await handleAIMessage(chatId, text)
        if (aiReply) {
          reply = aiReply
          break
        }
      } catch (err) {
        console.error('AI handler error:', err)
      }

      // Fallback if AI unavailable or errored
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
