import { supabaseAdmin } from '../supabaseAdmin'
import type { LearnedUtterance, CompiledUtterance } from './types'
import { shouldPromote, getNewExpiry, getPromotedLevel } from './ttl'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_UTTERANCES = 200

type EngramCache = {
  utterances: CompiledUtterance[]
  fetchedAt: number
}

let engramCache: EngramCache | null = null

/**
 * Get all non-expired utterances, compiled and ready to match.
 * Refreshes from Supabase if cache is stale (>5 min).
 * Also cleans up expired entries on refresh.
 */
export async function getCachedUtterances(): Promise<CompiledUtterance[]> {
  if (engramCache && Date.now() - engramCache.fetchedAt < CACHE_TTL) {
    return engramCache.utterances
  }

  // Clean up expired entries
  await supabaseAdmin
    .from('learned_utterances')
    .delete()
    .lt('expires_at', new Date().toISOString())

  // Fetch non-expired utterances, most popular first
  const { data, error } = await supabaseAdmin
    .from('learned_utterances')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('hit_count', { ascending: false })
    .limit(MAX_UTTERANCES)

  if (error) {
    console.error('Failed to load engrams:', error.message)
    return []
  }

  const rows = (data || []) as LearnedUtterance[]

  // Compile regex strings into RegExp objects
  const compiled: CompiledUtterance[] = []
  for (const row of rows) {
    try {
      const compiledRegex = new RegExp(row.regex, 'i')
      compiled.push({
        ...row,
        compiledRegex,
      })
    } catch (err) {
      console.warn(`Engram regex failed to compile (id=${row.id}):`, err)
      // Skip bad entries — they'll expire naturally
    }
  }

  engramCache = { utterances: compiled, fetchedAt: Date.now() }
  return compiled
}

/**
 * Save a new learned utterance (or update existing by pattern).
 * Preserves TTL state on conflict — the pattern keeps its earned TTL.
 */
export async function saveUtterance(utterance: {
  pattern: string
  regex: string
  command_type: string
  param_mapping: Record<string, number>
  example_input: string
  example_extraction: Record<string, string>
  ttl_level: number
  expires_at: string
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from('learned_utterances').upsert(
    {
      pattern: utterance.pattern,
      regex: utterance.regex,
      command_type: utterance.command_type,
      param_mapping: utterance.param_mapping,
      example_input: utterance.example_input,
      example_extraction: utterance.example_extraction,
      ttl_level: utterance.ttl_level,
      expires_at: utterance.expires_at,
      hit_count: 0,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'pattern',
      // On conflict: update regex/command/params but NOT ttl_level/expires_at/hit_count
      ignoreDuplicates: false,
    },
  )

  if (error) return { success: false, error: error.message }

  // Prune if over the cap
  const { count } = await supabaseAdmin
    .from('learned_utterances')
    .select('*', { count: 'exact', head: true })

  if (count && count > MAX_UTTERANCES) {
    const toDelete = count - MAX_UTTERANCES
    const { data: victims } = await supabaseAdmin
      .from('learned_utterances')
      .select('id')
      .order('ttl_level', { ascending: true })
      .order('expires_at', { ascending: true })
      .limit(toDelete)

    if (victims && victims.length > 0) {
      await supabaseAdmin
        .from('learned_utterances')
        .delete()
        .in(
          'id',
          victims.map((v) => v.id),
        )
    }
  }

  invalidateEngramCache()
  return { success: true }
}

/**
 * Bump hit count and potentially promote TTL for a matched utterance.
 * Called fire-and-forget (non-blocking) from the matcher.
 */
export async function bumpUtterance(id: number): Promise<void> {
  const { data } = await supabaseAdmin
    .from('learned_utterances')
    .select('id, ttl_level, expires_at, hit_count')
    .eq('id', id)
    .single()

  if (!data) return

  const updates: Record<string, unknown> = {
    hit_count: data.hit_count + 1,
    updated_at: new Date().toISOString(),
  }

  if (shouldPromote(data.ttl_level, new Date(data.expires_at))) {
    const newLevel = getPromotedLevel(data.ttl_level)
    updates.ttl_level = newLevel
    updates.expires_at = getNewExpiry(newLevel).toISOString()
  }

  await supabaseAdmin.from('learned_utterances').update(updates).eq('id', id)
}

export function invalidateEngramCache(): void {
  engramCache = null
}
