import { supabaseAdmin } from '../supabaseAdmin'

export type CachedItem = {
  id: number
  name: string
  quantity: number
  location_id: number
  notes: string | null
  location: { id: number; name: string } | null
}

type CachedLocation = {
  id: number
  name: string
  notes: string | null
}

type CachedInventory = {
  items: CachedItem[]
  locations: CachedLocation[]
  fetchedAt: number
}

const CACHE_TTL = 60 * 1000 // 60 seconds

let inventoryCache: CachedInventory | null = null

async function refreshIfStale(): Promise<void> {
  if (inventoryCache && Date.now() - inventoryCache.fetchedAt < CACHE_TTL) {
    return
  }

  const [itemsResult, locationsResult] = await Promise.all([
    supabaseAdmin
      .from('items')
      .select('id, name, quantity, location_id, notes, location:locations(id, name)')
      .order('name'),
    supabaseAdmin
      .from('locations')
      .select('id, name, notes')
      .order('name'),
  ])

  // Supabase joins return location as an array — normalize to single object
  const rawItems = itemsResult.data || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedItems: CachedItem[] = rawItems.map((i: any) => ({
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    location_id: i.location_id,
    notes: i.notes,
    location: Array.isArray(i.location) ? i.location[0] ?? null : i.location ?? null,
  }))

  inventoryCache = {
    items: normalizedItems,
    locations: (locationsResult.data || []) as CachedLocation[],
    fetchedAt: Date.now(),
  }
}

export async function getCachedItems(): Promise<CachedItem[]> {
  await refreshIfStale()
  return inventoryCache!.items
}

export async function getCachedLocations(): Promise<CachedLocation[]> {
  await refreshIfStale()
  return inventoryCache!.locations
}

/** Search items in-memory: exact name → partial name → notes */
export async function searchCachedItems(query: string): Promise<CachedItem[]> {
  const items = await getCachedItems()
  const q = query.toLowerCase()

  // Exact name match
  const exact = items.filter((i) => i.name.toLowerCase() === q)
  if (exact.length > 0) return exact

  // Partial name match
  const partial = items.filter((i) => i.name.toLowerCase().includes(q))
  if (partial.length > 0) return partial

  // Notes search
  return items.filter(
    (i) => i.notes && i.notes.toLowerCase().includes(q),
  )
}

export function invalidateCache(): void {
  inventoryCache = null
}
