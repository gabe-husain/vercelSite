import { supabaseAdmin } from './supabaseAdmin'

// ── Types ────────────────────────────────────────────────────
type AutoTagRule = {
  pattern: RegExp
  field: 'name' | 'notes'
  tags: string[]
}

export type TagInfo = { name: string; category: string; source: string }
export type DictionaryEntry = {
  id: number
  item_name: string
  default_notes: string | null
  default_zone: string | null
  default_tags: string[]
}

// ── AUTO_TAG_RULES ───────────────────────────────────────────
// Evaluated exhaustively — every rule checked, results deduplicated.
// Exact name rules (anchored) first, keyword rules second, notes rules last.

const AUTO_TAG_RULES: AutoTagRule[] = [
  // ═══════════════════════════════════════════════════════════
  // EXACT NAME RULES — anchored ^...$, field: 'name'
  // ═══════════════════════════════════════════════════════════

  // Produce + fresh
  ...[
    'onions', 'garlic', 'tomatoes', 'potatoes', 'carrots', 'celery',
    'lettuce', 'spinach', 'broccoli', 'bell peppers', 'mushrooms',
    'apples', 'bananas', 'oranges', 'lemons', 'limes',
    'strawberries', 'blueberries', 'grapes', 'avocado',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['produce', 'fresh'],
  })),

  // Dairy + fresh
  ...[
    'milk', 'yogurt',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['dairy', 'fresh'],
  })),

  // Dairy (not fresh)
  ...[
    'butter', 'cheese', 'cream cheese', 'sour cream', 'heavy cream', 'eggs',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['dairy'],
  })),

  // Meat + fresh
  ...[
    'chicken', 'beef', 'pork',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['meat', 'fresh'],
  })),

  // Meat (not fresh)
  ...[
    'bacon', 'sausage', 'ham', 'turkey',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['meat'],
  })),

  // Seafood + fresh
  ...[
    'fish', 'shrimp',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['seafood', 'fresh'],
  })),

  // Canned tuna — special combo
  { pattern: /^canned tuna$/i, field: 'name', tags: ['seafood', 'canned goods', 'pantry'] },

  // Bakery + fresh
  { pattern: /^bread$/i, field: 'name', tags: ['bakery', 'fresh'] },

  // Bakery
  { pattern: /^tortillas$/i, field: 'name', tags: ['bakery'] },

  // Pantry + grains
  ...[
    'rice', 'pasta', 'flour', 'cereal', 'oatmeal',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['pantry', 'grains'],
  })),

  // Pantry + spices
  ...[
    'salt', 'pepper',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['pantry', 'spices'],
  })),

  // Pantry only
  ...[
    'sugar', 'peanut butter', 'jelly', 'honey', 'maple syrup',
    'broth', 'baking soda', 'baking powder', 'cornstarch', 'yeast',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['pantry'],
  })),

  // Pantry + canned goods
  ...[
    'canned tomatoes', 'tomato paste', 'canned beans', 'corn', 'soup',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['pantry', 'canned goods'],
  })),

  // Spices + pantry
  ...[
    'vanilla extract', 'cinnamon', 'cumin', 'paprika',
    'oregano', 'basil', 'thyme', 'chili powder',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['spices', 'pantry'],
  })),

  // Condiments + pantry
  ...[
    'olive oil', 'vegetable oil',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['condiments', 'pantry'],
  })),

  // Condiments only
  ...[
    'ketchup', 'mustard', 'mayonnaise', 'soy sauce', 'hot sauce', 'vinegar',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['condiments'],
  })),

  // Beverages
  ...[
    'coffee', 'tea', 'juice', 'water', 'soda',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['beverages'],
  })),

  // Beverages + fermented
  ...[
    'beer', 'wine',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['beverages', 'fermented'],
  })),

  // Snacks
  ...[
    'chips', 'crackers', 'chocolate',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['snacks'],
  })),

  // Pantry + snacks
  { pattern: /^nuts$/i, field: 'name', tags: ['pantry', 'snacks'] },

  // Frozen combos
  { pattern: /^ice cream$/i, field: 'name', tags: ['snacks', 'frozen', 'dairy'] },
  { pattern: /^frozen vegetables$/i, field: 'name', tags: ['frozen', 'produce'] },
  { pattern: /^frozen pizza$/i, field: 'name', tags: ['frozen', 'instant/ready-made'] },

  // Tofu
  { pattern: /^tofu$/i, field: 'name', tags: ['pantry', 'fresh'] },

  // Household — disposable
  ...[
    'paper towels', 'trash bags',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['household', 'disposable'],
  })),

  // Household — storage
  ...[
    'plastic wrap', 'aluminum foil', 'ziploc bags',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['household', 'storage'],
  })),

  // Household — cleaning
  ...[
    'dish soap', 'sponges',
  ].map(name => ({
    pattern: new RegExp(`^${name}$`, 'i'),
    field: 'name' as const,
    tags: ['household', 'cleaning'],
  })),

  // ═══════════════════════════════════════════════════════════
  // KEYWORD NAME RULES — \b word boundary, field: 'name'
  // Catch custom items like "TJ's Canned Corn"
  // ═══════════════════════════════════════════════════════════
  { pattern: /\bcanned\b/i, field: 'name', tags: ['canned goods'] },
  { pattern: /\bfrozen\b/i, field: 'name', tags: ['frozen'] },
  { pattern: /\binstant\b/i, field: 'name', tags: ['instant/ready-made'] },
  { pattern: /\bnoodle/i, field: 'name', tags: ['pantry', 'grains'] },
  { pattern: /\bbread\b/i, field: 'name', tags: ['bakery'] },
  { pattern: /\bcheese\b/i, field: 'name', tags: ['dairy'] },
  { pattern: /\bmilk\b/i, field: 'name', tags: ['dairy'] },
  { pattern: /\byogurt\b/i, field: 'name', tags: ['dairy'] },
  { pattern: /\bchicken\b/i, field: 'name', tags: ['meat'] },
  { pattern: /\bbeef\b/i, field: 'name', tags: ['meat'] },
  { pattern: /\bpork\b/i, field: 'name', tags: ['meat'] },
  { pattern: /\bshrimp\b/i, field: 'name', tags: ['seafood'] },
  { pattern: /\bfish\b/i, field: 'name', tags: ['seafood'] },
  { pattern: /\btuna\b/i, field: 'name', tags: ['seafood'] },
  { pattern: /\bsalmon\b/i, field: 'name', tags: ['seafood'] },
  { pattern: /\bsauce\b/i, field: 'name', tags: ['condiments'] },
  { pattern: /\bsoap\b/i, field: 'name', tags: ['household', 'cleaning'] },
  { pattern: /\bjuice\b/i, field: 'name', tags: ['beverages'] },
  { pattern: /\bcoffee\b/i, field: 'name', tags: ['beverages'] },
  { pattern: /\bfruit\b/i, field: 'name', tags: ['produce'] },
  { pattern: /\bvegetable/i, field: 'name', tags: ['produce'] },
  { pattern: /\bferment/i, field: 'name', tags: ['fermented'] },
  { pattern: /\bpickl/i, field: 'name', tags: ['fermented'] },
  { pattern: /\bkimchi/i, field: 'name', tags: ['fermented'] },

  // ═══════════════════════════════════════════════════════════
  // NOTES-BASED RULES — field: 'notes'
  // ═══════════════════════════════════════════════════════════
  { pattern: /\binstant\b/i, field: 'notes', tags: ['instant/ready-made'] },
  { pattern: /\bready.?made\b/i, field: 'notes', tags: ['instant/ready-made'] },
  { pattern: /\boven.?safe\b/i, field: 'notes', tags: ['oven-safe'] },
  { pattern: /\bmicrowave.?safe\b/i, field: 'notes', tags: ['microwave-safe'] },
  { pattern: /\bdishwasher.?safe\b/i, field: 'notes', tags: ['dishwasher-safe'] },
  { pattern: /\bstove.?safe\b/i, field: 'notes', tags: ['stove-safe'] },
  { pattern: /\bceramic\b/i, field: 'notes', tags: ['ceramic'] },
  { pattern: /\bglass\b/i, field: 'notes', tags: ['glass'] },
  { pattern: /\bmetal\b|stainless/i, field: 'notes', tags: ['metal'] },
  { pattern: /\bplastic\b/i, field: 'notes', tags: ['plastic'] },
  { pattern: /\bwood\b|\bbamboo\b/i, field: 'notes', tags: ['wood'] },
]

// ── Pure function: compute tags from rules ───────────────────
export function computeAutoTags(name: string, notes: string | null): string[] {
  const lowerName = name.toLowerCase()
  const lowerNotes = notes?.toLowerCase() ?? ''
  const tagSet = new Set<string>()

  for (const rule of AUTO_TAG_RULES) {
    const text = rule.field === 'name' ? lowerName : lowerNotes
    if (!text) continue
    if (rule.pattern.test(text)) {
      for (const tag of rule.tags) {
        tagSet.add(tag)
      }
    }
  }

  return Array.from(tagSet)
}

// ── Apply auto-tags to DB (additive only) ────────────────────
export async function applyAutoTags(
  itemId: number,
  name: string,
  notes: string | null
): Promise<void> {
  const tagNames = computeAutoTags(name, notes)
  if (tagNames.length === 0) return

  // Resolve tag names → IDs
  const { data: tags } = await supabaseAdmin
    .from('tags')
    .select('id, name')
    .in('name', tagNames)

  if (!tags || tags.length === 0) return

  // Batch insert — ON CONFLICT DO NOTHING makes this additive-only
  const rows = tags.map(t => ({
    item_id: itemId,
    tag_id: t.id,
    source: 'auto' as const,
  }))

  await supabaseAdmin
    .from('item_tags')
    .upsert(rows, { onConflict: 'item_id,tag_id', ignoreDuplicates: true })
}

// ── Apply manual/dictionary tags ─────────────────────────────
export async function applyManualTags(
  itemId: number,
  tagNames: string[],
  source: 'manual' | 'dictionary'
): Promise<void> {
  if (tagNames.length === 0) return

  const resolvedIds: number[] = []

  for (const tagName of tagNames) {
    const trimmed = tagName.trim().toLowerCase()
    if (!trimmed) continue

    // Check if tag exists
    const { data: existing } = await supabaseAdmin
      .from('tags')
      .select('id')
      .eq('name', trimmed)
      .maybeSingle()

    if (existing) {
      resolvedIds.push(existing.id)
    } else {
      // Create custom tag (default category: 'section')
      const { data: created } = await supabaseAdmin
        .from('tags')
        .insert({ name: trimmed, category: 'section', is_custom: true })
        .select('id')
        .single()

      if (created) resolvedIds.push(created.id)
    }
  }

  if (resolvedIds.length === 0) return

  const rows = resolvedIds.map(tagId => ({
    item_id: itemId,
    tag_id: tagId,
    source,
  }))

  await supabaseAdmin
    .from('item_tags')
    .upsert(rows, { onConflict: 'item_id,tag_id', ignoreDuplicates: true })
}

// ── Dictionary functions ─────────────────────────────────────
export async function applyDictionaryDefaults(
  itemName: string
): Promise<{ notes?: string; tags?: string[] } | null> {
  const { data } = await supabaseAdmin
    .from('dictionary')
    .select('*')
    .ilike('item_name', itemName)
    .maybeSingle()

  if (!data) return null

  return {
    notes: data.default_notes ?? undefined,
    tags: data.default_tags ?? [],
  }
}

export async function saveDictionary(entry: {
  itemName: string
  defaultNotes?: string | null
  defaultZone?: string | null
  defaultTags?: string[]
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from('dictionary')
    .upsert(
      {
        item_name: entry.itemName,
        default_notes: entry.defaultNotes ?? null,
        default_zone: entry.defaultZone ?? null,
        default_tags: entry.defaultTags ?? [],
      },
      { onConflict: 'item_name' }
    )

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getDictionary(): Promise<DictionaryEntry[]> {
  const { data } = await supabaseAdmin
    .from('dictionary')
    .select('*')
    .order('item_name')

  return (data ?? []) as DictionaryEntry[]
}

export async function deleteDictionary(
  itemName: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from('dictionary')
    .delete()
    .ilike('item_name', itemName)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Tag query helpers ────────────────────────────────────────
export async function getTagsForItem(
  itemId: number
): Promise<TagInfo[]> {
  const { data } = await supabaseAdmin
    .from('item_tags')
    .select('source, tag:tags(name, category)')
    .eq('item_id', itemId)

  if (!data) return []

  return data.map(row => {
    const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag
    return {
      name: (tag as { name: string; category: string })?.name ?? '?',
      category: (tag as { name: string; category: string })?.category ?? '?',
      source: row.source,
    }
  })
}

export async function findItemsByTag(
  tagName: string
): Promise<{ id: number; name: string; quantity: number; locationName: string }[]> {
  // First find the tag
  const { data: tag } = await supabaseAdmin
    .from('tags')
    .select('id')
    .ilike('name', tagName)
    .maybeSingle()

  if (!tag) return []

  // Find all item_tags for this tag, join to items and locations
  const { data } = await supabaseAdmin
    .from('item_tags')
    .select('item:items(id, name, quantity, location:locations(name))')
    .eq('tag_id', tag.id)

  if (!data) return []

  return data.map(row => {
    const item = Array.isArray(row.item) ? row.item[0] : row.item
    const typedItem = item as { id: number; name: string; quantity: number; location: unknown } | null
    if (!typedItem) return { id: 0, name: '?', quantity: 0, locationName: '?' }

    const loc = Array.isArray(typedItem.location) ? typedItem.location[0] : typedItem.location
    const locName = (loc as { name?: string })?.name ?? '?'

    return {
      id: typedItem.id,
      name: typedItem.name,
      quantity: typedItem.quantity,
      locationName: locName,
    }
  }).filter(i => i.id !== 0)
}

export async function getAllTags(): Promise<{ name: string; category: string; count: number }[]> {
  // Get all tags with their item counts
  const { data: tags } = await supabaseAdmin
    .from('tags')
    .select('id, name, category')
    .order('category')
    .order('name')

  if (!tags) return []

  // Get counts for each tag
  const { data: counts } = await supabaseAdmin
    .from('item_tags')
    .select('tag_id')

  const countMap = new Map<number, number>()
  if (counts) {
    for (const row of counts) {
      countMap.set(row.tag_id, (countMap.get(row.tag_id) ?? 0) + 1)
    }
  }

  return tags.map(t => ({
    name: t.name,
    category: t.category,
    count: countMap.get(t.id) ?? 0,
  }))
}

// ── Remove a tag from an item ────────────────────────────────
export async function removeTagFromItem(
  itemId: number,
  tagName: string
): Promise<{ success: boolean; error?: string }> {
  const { data: tag } = await supabaseAdmin
    .from('tags')
    .select('id')
    .ilike('name', tagName)
    .maybeSingle()

  if (!tag) return { success: false, error: `Tag "${tagName}" not found.` }

  const { error } = await supabaseAdmin
    .from('item_tags')
    .delete()
    .eq('item_id', itemId)
    .eq('tag_id', tag.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
