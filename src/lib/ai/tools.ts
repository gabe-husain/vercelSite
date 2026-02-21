import { supabaseAdmin } from '../supabaseAdmin'
import { KITCHEN_ZONES, ZONE_GROUPS } from '../kitchenZones'
import {
  applyAutoTags,
  applyManualTags,
  applyDictionaryDefaults,
  computeAutoTags,
  findItemsByTag,
  getTagsForItem,
} from '../autoTagger'
import { searchCachedItems, getCachedItems, invalidateCache } from './inventoryCache'
import { braveWebSearch } from './braveSearch'
import type { AnthropicToolDef } from './types'
import type { UndoAction } from '../telegramBot'

// ── Tool definitions (sent to Claude API) ───────────────────

export const TOOL_DEFINITIONS: AnthropicToolDef[] = [
  {
    name: 'search_items',
    description:
      'Search the kitchen inventory by item name or notes. Returns matching items with quantity, location, notes, and tags.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term (item name or keyword in notes)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_items',
    description:
      'List all items in a specific zone, or get total item count if no zone given.',
    input_schema: {
      type: 'object',
      properties: {
        zone: {
          type: 'string',
          description:
            'Zone ID (e.g. "A1", "N2"). Omit to get full inventory count.',
        },
      },
    },
  },
  {
    name: 'add_item',
    description:
      'Add an item to the inventory. If the item already exists in that zone, increments its quantity.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name' },
        quantity: {
          type: 'number',
          description: 'Quantity to add (default 1)',
        },
        zone: { type: 'string', description: 'Zone ID (e.g. "A1", "F1")' },
        notes: {
          type: 'string',
          description: 'Optional notes about the item',
        },
      },
      required: ['name', 'zone'],
    },
  },
  {
    name: 'remove_item',
    description: 'Remove an item from the inventory entirely.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name to remove' },
        zone: {
          type: 'string',
          description:
            'Optional zone to narrow down if item exists in multiple locations',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'move_item',
    description: "Move an item from its current location to a different zone.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name to move' },
        from_zone: {
          type: 'string',
          description: 'Current zone (optional, helps disambiguate)',
        },
        to_zone: { type: 'string', description: 'Destination zone ID' },
      },
      required: ['name', 'to_zone'],
    },
  },
  {
    name: 'update_quantity',
    description: 'Set the quantity of an existing item to a specific number.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name' },
        quantity: { type: 'number', description: 'New quantity to set' },
      },
      required: ['name', 'quantity'],
    },
  },
  {
    name: 'tag_item',
    description: 'Add one or more tags to an item.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name to tag' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tag names to add',
        },
      },
      required: ['name', 'tags'],
    },
  },
  {
    name: 'search_by_tag',
    description: 'Find all items that have a specific tag.',
    input_schema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'Tag name to search for' },
      },
      required: ['tag'],
    },
  },
  {
    name: 'web_search',
    description:
      'Search the web for information about a food item, product, or storage suggestion. Use when you encounter something unfamiliar.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Web search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'run_query',
    description:
      'Execute a SQL query against the inventory database. Use $1, $2, ... for parameters. SELECT/WITH queries are read-only. INSERT/UPDATE/DELETE are allowed for mutations. DDL (DROP, ALTER, CREATE, TRUNCATE) is forbidden. Tables: items (id, name, location_id, quantity, notes), locations (id, name, notes), tags (id, name, category, is_custom), item_tags (item_id, tag_id, source), dictionary (id, item_name, default_notes, default_zone, default_tags). Use JOINs to connect items→locations and items→item_tags→tags.',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description:
            'SQL query with $1, $2, ... for parameters. Must start with SELECT, WITH, INSERT, UPDATE, or DELETE.',
        },
        params: {
          type: 'array',
          items: { type: 'string' },
          description: 'Parameter values in order, matching $1, $2, ... in the query',
        },
      },
      required: ['sql'],
    },
  },
  {
    name: 'create_pipeline',
    description:
      'Save a reusable SQL query as a named pipeline. Once saved, link it to an utterance pattern via learn_utterance so similar questions are answered instantly without AI. Include a format_template for Telegram output formatting.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Unique pipeline name in snake_case, e.g. "items_by_tag_in_zone"',
        },
        description: {
          type: 'string',
          description: 'What this pipeline does, in plain English',
        },
        sql_template: {
          type: 'string',
          description: 'Parameterized SQL using $1, $2, ... for parameters',
        },
        params: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Named parameters in order matching $1, $2, ... e.g. ["zone_name", "tag_name"]',
        },
        is_mutation: {
          type: 'boolean',
          description: 'true if this pipeline modifies data (INSERT/UPDATE/DELETE), false for SELECT',
        },
        format_template: {
          type: 'string',
          description:
            'Template for formatting results in Telegram. Use line prefixes: "{{_header}}Found {{_count}} items:" for the header, "{{_row}}- {{name}} (×{{quantity}}) in {{location}}" repeated per row with {{column_name}} substitutions, "{{_empty}}Nothing found." shown when 0 results. Separate sections with newlines.',
        },
      },
      required: ['name', 'description', 'sql_template', 'params', 'is_mutation', 'format_template'],
    },
  },
  {
    name: 'learn_utterance',
    description:
      'Teach the regex bot a new pattern so it can handle similar messages without AI next time. Can link to a command_type (for simple inventory actions) OR to a pipeline_name (for complex queries you saved with create_pipeline). Use placeholders: {item} for item names, {zone} for zone IDs (e.g. A1), {quantity} for numbers, {tag} for tag names. Pattern must have at least 3 words.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description:
            'Generalized pattern with placeholders, e.g. "got any {item} left" or "show me all {tag} in {zone}"',
        },
        command_type: {
          type: 'string',
          description:
            'The ParsedCommand type this maps to: "check", "tag-search", "remove", "add", "update-qty", "list", "list-all", "list-tags", "list-tags-item", "tag-item", "untag-item", "search-names", "list-dict". Use this OR pipeline_name, not both.',
        },
        pipeline_name: {
          type: 'string',
          description:
            'Name of a saved pipeline to link to (from create_pipeline). Use this OR command_type, not both.',
        },
        param_mapping: {
          type: 'object',
          description:
            'Maps parameter names to placeholders. For command_type: e.g. {"itemName": "{item}"}. For pipeline_name: e.g. {"zone_name": "{zone}", "tag_name": "{tag}"} — keys must match the pipeline\'s params array.',
        },
        example_input: {
          type: 'string',
          description: 'The actual user message that triggered this learning',
        },
        example_extraction: {
          type: 'object',
          description:
            'Expected extracted values from the example. Keys are placeholder names (without braces), values are the expected extracted text. e.g. {"item": "cheese"}',
        },
      },
      required: [
        'pattern',
        'param_mapping',
        'example_input',
        'example_extraction',
      ],
    },
  },
]

// ── Zone resolution (mirrors telegramBot.ts logic) ──────────

async function resolveZone(
  zoneId: string,
): Promise<{ locationId: number; locationName: string } | null> {
  const resolvedId = ZONE_GROUPS[zoneId.toUpperCase()] || zoneId.toUpperCase()
  const zone = KITCHEN_ZONES.find((z) => z.id === resolvedId)
  if (!zone) return null

  const { data } = await supabaseAdmin
    .from('locations')
    .select('id, name')
    .eq('name', zone.locationName)
    .single()

  if (!data) return null
  return { locationId: data.id, locationName: data.name }
}

function getLocName(item: { location?: unknown }): string {
  const loc = Array.isArray(item.location) ? item.location[0] : item.location
  return (loc as { name?: string })?.name || 'unknown'
}

// ── Tool executors ──────────────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  chatId: number,
  undoStore: Map<number, UndoAction>,
): Promise<string> {
  try {
    switch (name) {
      case 'search_items':
        return await execSearchItems(input as { query: string })
      case 'list_items':
        return await execListItems(input as { zone?: string })
      case 'add_item':
        return await execAddItem(
          input as { name: string; quantity?: number; zone: string; notes?: string },
          chatId,
          undoStore,
        )
      case 'remove_item':
        return await execRemoveItem(
          input as { name: string; zone?: string },
          chatId,
          undoStore,
        )
      case 'move_item':
        return await execMoveItem(
          input as { name: string; from_zone?: string; to_zone: string },
          chatId,
          undoStore,
        )
      case 'update_quantity':
        return await execUpdateQuantity(
          input as { name: string; quantity: number },
          chatId,
          undoStore,
        )
      case 'tag_item':
        return await execTagItem(input as { name: string; tags: string[] })
      case 'search_by_tag':
        return await execSearchByTag(input as { tag: string })
      case 'web_search':
        return await execWebSearch(input as { query: string })
      case 'run_query':
        return await execRunQuery(input as { sql: string; params?: string[] })
      case 'create_pipeline':
        return await execCreatePipeline(
          input as {
            name: string
            description: string
            sql_template: string
            params: string[]
            is_mutation: boolean
            format_template: string
          },
        )
      case 'learn_utterance':
        return await execLearnUtterance(
          input as {
            pattern: string
            command_type?: string
            pipeline_name?: string
            param_mapping: Record<string, string>
            example_input: string
            example_extraction: Record<string, string>
          },
        )
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (err) {
    return JSON.stringify({
      error: `Tool ${name} failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    })
  }
}

// ── Individual tool implementations ─────────────────────────

async function execSearchItems(input: { query: string }): Promise<string> {
  const items = await searchCachedItems(input.query)

  if (items.length === 0) {
    return JSON.stringify({ results: [], message: 'No items found' })
  }

  // Enrich with tags for each item
  const results = await Promise.all(
    items.slice(0, 15).map(async (item) => {
      const tags = await getTagsForItem(item.id)
      return {
        name: item.name,
        quantity: item.quantity,
        location: getLocName(item),
        notes: item.notes,
        tags: tags.map((t) => t.name),
      }
    }),
  )

  return JSON.stringify({ results })
}

async function execListItems(input: { zone?: string }): Promise<string> {
  if (input.zone) {
    const location = await resolveZone(input.zone)
    if (!location) return JSON.stringify({ error: `Unknown zone "${input.zone}"` })

    const items = await getCachedItems()
    const zoneItems = items.filter((i) => i.location_id === location.locationId)

    return JSON.stringify({
      zone: input.zone,
      items: zoneItems.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        notes: i.notes,
      })),
    })
  }

  const items = await getCachedItems()
  return JSON.stringify({
    total_items: items.length,
    message: 'Use zone parameter to see items in a specific zone',
  })
}

async function execAddItem(
  input: { name: string; quantity?: number; zone: string; notes?: string },
  chatId: number,
  undoStore: Map<number, UndoAction>,
): Promise<string> {
  const quantity = input.quantity ?? 1
  const location = await resolveZone(input.zone)
  if (!location) {
    const validZones = KITCHEN_ZONES.filter((z) => z.clickable && !z.opensAs)
      .map((z) => z.id)
      .join(', ')
    return JSON.stringify({
      error: `Unknown zone "${input.zone}". Valid zones: ${validZones}`,
    })
  }

  // Check if item already exists in that location
  const { data: existing } = await supabaseAdmin
    .from('items')
    .select('id, name, quantity, notes')
    .ilike('name', input.name)
    .eq('location_id', location.locationId)
    .maybeSingle()

  if (existing) {
    const newQty = existing.quantity + quantity
    const { error } = await supabaseAdmin
      .from('items')
      .update({ quantity: newQty })
      .eq('id', existing.id)

    if (error) return JSON.stringify({ error: error.message })

    await applyAutoTags(existing.id, existing.name, existing.notes)
    invalidateCache()

    undoStore.set(chatId, {
      type: 'revert-quantity',
      itemId: existing.id,
      previousQuantity: existing.quantity,
      description: `${existing.name} quantity reverted to ${existing.quantity} in ${input.zone}`,
    })

    return JSON.stringify({
      success: true,
      action: 'updated_quantity',
      name: existing.name,
      previous_quantity: existing.quantity,
      new_quantity: newQty,
      zone: input.zone,
    })
  }

  // Check dictionary for defaults
  const dictDefaults = await applyDictionaryDefaults(input.name)
  const insertNotes = input.notes ?? dictDefaults?.notes ?? null

  const { data: inserted, error } = await supabaseAdmin
    .from('items')
    .insert({
      name: input.name,
      location_id: location.locationId,
      quantity,
      notes: insertNotes,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    return JSON.stringify({ error: error?.message || 'Insert failed' })
  }

  // Apply auto-tags
  await applyAutoTags(inserted.id, input.name, insertNotes)
  const autoTags = computeAutoTags(input.name, insertNotes)

  // Apply dictionary tags if available
  if (dictDefaults?.tags && dictDefaults.tags.length > 0) {
    await applyManualTags(inserted.id, dictDefaults.tags, 'dictionary')
  }

  invalidateCache()

  undoStore.set(chatId, {
    type: 'delete',
    itemId: inserted.id,
    description: `${input.name} removed from ${input.zone}`,
  })

  const allTags = Array.from(
    new Set([...autoTags, ...(dictDefaults?.tags ?? [])]),
  )

  return JSON.stringify({
    success: true,
    action: 'added',
    name: input.name,
    quantity,
    zone: input.zone,
    notes: insertNotes,
    tags_applied: allTags,
  })
}

async function execRemoveItem(
  input: { name: string; zone?: string },
  chatId: number,
  undoStore: Map<number, UndoAction>,
): Promise<string> {
  // Search for the item
  const { data: items } = await supabaseAdmin
    .from('items')
    .select('id, name, quantity, location_id, notes, location:locations(id, name)')
    .ilike('name', `%${input.name}%`)

  if (!items || items.length === 0) {
    return JSON.stringify({ error: `Could not find "${input.name}" in inventory` })
  }

  let filtered = items
  if (input.zone) {
    const location = await resolveZone(input.zone)
    if (!location) return JSON.stringify({ error: `Unknown zone "${input.zone}"` })
    filtered = items.filter((i) => i.location_id === location.locationId)
  }

  if (filtered.length === 0) {
    return JSON.stringify({ error: `No "${input.name}" found in zone ${input.zone}` })
  }

  if (filtered.length > 1) {
    return JSON.stringify({
      error: 'Multiple matches',
      matches: filtered.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        location: getLocName(i),
      })),
      message: 'Please specify which one to remove (include zone)',
    })
  }

  const item = filtered[0]
  const locationName = getLocName(item)

  const { error } = await supabaseAdmin.from('items').delete().eq('id', item.id)
  if (error) return JSON.stringify({ error: error.message })

  invalidateCache()

  undoStore.set(chatId, {
    type: 'restore',
    item: {
      name: item.name,
      location_id: item.location_id,
      quantity: item.quantity,
      notes: item.notes,
    },
    description: `${item.name} restored to ${locationName}`,
  })

  return JSON.stringify({
    success: true,
    removed: item.name,
    quantity: item.quantity,
    from: locationName,
  })
}

async function execMoveItem(
  input: { name: string; from_zone?: string; to_zone: string },
  chatId: number,
  undoStore: Map<number, UndoAction>,
): Promise<string> {
  const toLocation = await resolveZone(input.to_zone)
  if (!toLocation) return JSON.stringify({ error: `Unknown destination zone "${input.to_zone}"` })

  // Find the item
  const { data: items } = await supabaseAdmin
    .from('items')
    .select('id, name, quantity, location_id, notes, location:locations(id, name)')
    .ilike('name', `%${input.name}%`)

  if (!items || items.length === 0) {
    return JSON.stringify({ error: `Could not find "${input.name}" in inventory` })
  }

  let filtered = items
  if (input.from_zone) {
    const fromLocation = await resolveZone(input.from_zone)
    if (!fromLocation)
      return JSON.stringify({ error: `Unknown source zone "${input.from_zone}"` })
    filtered = items.filter((i) => i.location_id === fromLocation.locationId)
  }

  if (filtered.length === 0) {
    return JSON.stringify({
      error: `No "${input.name}" found in zone ${input.from_zone}`,
    })
  }

  if (filtered.length > 1) {
    return JSON.stringify({
      error: 'Multiple matches',
      matches: filtered.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        location: getLocName(i),
      })),
      message: 'Please specify which one to move (include from_zone)',
    })
  }

  const item = filtered[0]
  const previousLocationId = item.location_id
  const previousLocationName = getLocName(item)

  const { error } = await supabaseAdmin
    .from('items')
    .update({ location_id: toLocation.locationId })
    .eq('id', item.id)

  if (error) return JSON.stringify({ error: error.message })

  invalidateCache()

  undoStore.set(chatId, {
    type: 'revert-location',
    itemId: item.id,
    previousLocationId,
    description: `${item.name} moved back to ${previousLocationName}`,
  })

  return JSON.stringify({
    success: true,
    moved: item.name,
    from: previousLocationName,
    to: input.to_zone,
  })
}

async function execUpdateQuantity(
  input: { name: string; quantity: number },
  chatId: number,
  undoStore: Map<number, UndoAction>,
): Promise<string> {
  const { data: items } = await supabaseAdmin
    .from('items')
    .select('id, name, quantity, location_id, location:locations(id, name)')
    .ilike('name', `%${input.name}%`)

  if (!items || items.length === 0) {
    return JSON.stringify({ error: `Could not find "${input.name}" in inventory` })
  }

  if (items.length > 1) {
    return JSON.stringify({
      error: 'Multiple matches',
      matches: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        location: getLocName(i),
      })),
      message: 'Please be more specific about which item',
    })
  }

  const item = items[0]
  const prevQty = item.quantity

  const { error } = await supabaseAdmin
    .from('items')
    .update({ quantity: input.quantity })
    .eq('id', item.id)

  if (error) return JSON.stringify({ error: error.message })

  invalidateCache()

  undoStore.set(chatId, {
    type: 'revert-quantity',
    itemId: item.id,
    previousQuantity: prevQty,
    description: `${item.name} quantity reverted to ${prevQty}`,
  })

  return JSON.stringify({
    success: true,
    name: item.name,
    previous_quantity: prevQty,
    new_quantity: input.quantity,
    location: getLocName(item),
  })
}

async function execTagItem(input: { name: string; tags: string[] }): Promise<string> {
  const { data: items } = await supabaseAdmin
    .from('items')
    .select('id, name')
    .ilike('name', `%${input.name}%`)

  if (!items || items.length === 0) {
    return JSON.stringify({ error: `Could not find "${input.name}" in inventory` })
  }

  if (items.length > 1) {
    return JSON.stringify({
      error: 'Multiple matches',
      matches: items.map((i) => i.name),
      message: 'Please be more specific about which item to tag',
    })
  }

  await applyManualTags(items[0].id, input.tags, 'manual')
  return JSON.stringify({
    success: true,
    tagged: items[0].name,
    tags_added: input.tags,
  })
}

async function execSearchByTag(input: { tag: string }): Promise<string> {
  const results = await findItemsByTag(input.tag)
  if (results.length === 0) {
    return JSON.stringify({ results: [], message: `No items tagged "${input.tag}"` })
  }
  return JSON.stringify({ results })
}

async function execWebSearch(input: { query: string }): Promise<string> {
  const results = await braveWebSearch(input.query)
  return JSON.stringify({ results })
}

async function execRunQuery(input: { sql: string; params?: string[] }): Promise<string> {
  const { validateSQL } = await import('../pipelines/validator')

  const validation = validateSQL(input.sql)
  if (!validation.valid) {
    return JSON.stringify({ error: `SQL rejected: ${validation.reason}` })
  }

  const params = input.params || []

  if (validation.queryType === 'select') {
    const { data, error } = await supabaseAdmin.rpc('execute_readonly_query', {
      query_text: input.sql,
      query_params: params,
    })
    if (error) return JSON.stringify({ error: `Query failed: ${error.message}` })
    const rows = (data as Record<string, unknown>[]) || []
    const truncated = JSON.stringify({ results: rows })
    return truncated.length > 4000 ? truncated.slice(0, 4000) + '...(truncated)' : truncated
  } else {
    // Mutation (INSERT/UPDATE/DELETE)
    const { data, error } = await supabaseAdmin.rpc('execute_mutation_query', {
      query_text: input.sql,
      query_params: params,
    })
    if (error) return JSON.stringify({ error: `Mutation failed: ${error.message}` })
    invalidateCache()
    return JSON.stringify(data)
  }
}

async function execCreatePipeline(input: {
  name: string
  description: string
  sql_template: string
  params: string[]
  is_mutation: boolean
  format_template: string
}): Promise<string> {
  const { validateSQL } = await import('../pipelines/validator')
  const { savePipeline } = await import('../pipelines/cache')

  // Validate the SQL template
  const validation = validateSQL(input.sql_template)
  if (!validation.valid) {
    return JSON.stringify({ error: `SQL rejected: ${validation.reason}` })
  }

  // Verify is_mutation flag matches the SQL type
  const isMutationType = validation.queryType !== 'select'
  if (input.is_mutation !== isMutationType) {
    return JSON.stringify({
      error: `is_mutation=${input.is_mutation} but SQL is a ${validation.queryType.toUpperCase()} query. Set is_mutation=${isMutationType}.`,
    })
  }

  const result = await savePipeline({
    name: input.name.trim().toLowerCase().replace(/\s+/g, '_'),
    description: input.description,
    sql_template: input.sql_template,
    params: input.params,
    is_mutation: input.is_mutation,
    format_template: input.format_template || null,
  })

  if (!result.success) {
    return JSON.stringify({ error: `Save failed: ${result.error}` })
  }

  return JSON.stringify({
    success: true,
    pipeline_name: input.name,
    pipeline_id: result.id,
    message: 'Pipeline saved. Now link it to an utterance pattern with learn_utterance.',
  })
}

async function execLearnUtterance(input: {
  pattern: string
  command_type?: string
  pipeline_name?: string
  param_mapping: Record<string, string>
  example_input: string
  example_extraction: Record<string, string>
}): Promise<string> {
  const { compilePattern, resolveParamMapping, validatePattern } = await import(
    '../engrams/compiler'
  )
  const { saveUtterance } = await import('../engrams/cache')
  const { getNewExpiry } = await import('../engrams/ttl')

  // Must have either command_type or pipeline_name
  if (!input.command_type && !input.pipeline_name) {
    return JSON.stringify({
      error: 'Must provide either command_type or pipeline_name.',
    })
  }
  if (input.command_type && input.pipeline_name) {
    return JSON.stringify({
      error: 'Provide command_type OR pipeline_name, not both.',
    })
  }

  // 1. Compile the pattern into a regex
  const compiled = compilePattern(input.pattern)
  if (!compiled) {
    return JSON.stringify({
      error: 'Pattern compilation failed. Ensure it has at least 3 words and uses valid placeholders ({item}, {zone}, {quantity}, {tag}).',
    })
  }

  // 2. Resolve param_mapping from placeholder names to capture group indices
  const resolvedMapping = resolveParamMapping(
    input.param_mapping,
    compiled.captureGroups,
  )
  if (!resolvedMapping) {
    return JSON.stringify({
      error: 'Param mapping resolution failed. Ensure all placeholder references match placeholders in the pattern.',
    })
  }

  // 3. Resolve pipeline if pipeline_name is provided
  let pipelineId: number | null = null
  if (input.pipeline_name) {
    const { getPipelineByName } = await import('../pipelines/cache')
    const pipeline = await getPipelineByName(input.pipeline_name)
    if (!pipeline) {
      return JSON.stringify({
        error: `Pipeline "${input.pipeline_name}" not found. Create it first with create_pipeline.`,
      })
    }
    pipelineId = pipeline.id

    // Validate param_mapping keys match pipeline params
    const mappingKeys = Object.keys(resolvedMapping)
    const missingParams = pipeline.params.filter((p) => !mappingKeys.includes(p))
    if (missingParams.length > 0) {
      return JSON.stringify({
        error: `Pipeline expects params [${pipeline.params.join(', ')}] but mapping is missing: ${missingParams.join(', ')}`,
      })
    }
  }

  // 4. Validate against the example
  const validation = validatePattern({
    regex: compiled.regex,
    commandType: input.command_type || null,
    exampleInput: input.example_input,
    exampleExtraction: input.example_extraction,
    captureGroups: compiled.captureGroups,
  })
  if (!validation.valid) {
    return JSON.stringify({
      error: `Validation failed: ${validation.reason}`,
    })
  }

  // 5. Save to Supabase with TTL level 0 (1-day initial expiry)
  const result = await saveUtterance({
    pattern: input.pattern.trim().toLowerCase(),
    regex: compiled.regex,
    command_type: input.command_type || null,
    pipeline_id: pipelineId,
    param_mapping: resolvedMapping,
    example_input: input.example_input,
    example_extraction: input.example_extraction,
    ttl_level: 0,
    expires_at: getNewExpiry(0).toISOString(),
  })

  if (!result.success) {
    return JSON.stringify({ error: `Save failed: ${result.error}` })
  }

  return JSON.stringify({
    success: true,
    pattern: input.pattern,
    linked_to: pipelineId ? `pipeline: ${input.pipeline_name}` : `command: ${input.command_type}`,
    message: 'Pattern learned! The regex bot will handle similar messages next time.',
  })
}
