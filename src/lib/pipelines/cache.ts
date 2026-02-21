import { supabaseAdmin } from '../supabaseAdmin'

// ── Pipeline types ──────────────────────────────────────────

export type Pipeline = {
  id: number
  name: string
  description: string
  sql_template: string
  params: string[]
  is_mutation: boolean
  format_template: string | null
  hit_count: number
  created_at: string
  updated_at: string
}

// ── Pipeline cache ──────────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

type PipelineCacheEntry = {
  pipeline: Pipeline
  fetchedAt: number
}

const pipelineCache = new Map<number, PipelineCacheEntry>()

/**
 * Get a pipeline by ID, with 5-minute caching.
 */
export async function getCachedPipeline(id: number): Promise<Pipeline | null> {
  const cached = pipelineCache.get(id)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.pipeline
  }

  const { data, error } = await supabaseAdmin
    .from('pipelines')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const pipeline = data as Pipeline
  pipelineCache.set(id, { pipeline, fetchedAt: Date.now() })
  return pipeline
}

/**
 * Look up a pipeline by name (for the create_pipeline / learn_utterance tools).
 */
export async function getPipelineByName(name: string): Promise<Pipeline | null> {
  const { data, error } = await supabaseAdmin
    .from('pipelines')
    .select('*')
    .eq('name', name)
    .single()

  if (error || !data) return null
  return data as Pipeline
}

/**
 * Save or update a pipeline (upsert by name).
 */
export async function savePipeline(pipeline: {
  name: string
  description: string
  sql_template: string
  params: string[]
  is_mutation: boolean
  format_template: string | null
}): Promise<{ success: true; id: number } | { success: false; error: string }> {
  const { data, error } = await supabaseAdmin
    .from('pipelines')
    .upsert(
      {
        name: pipeline.name,
        description: pipeline.description,
        sql_template: pipeline.sql_template,
        params: pipeline.params,
        is_mutation: pipeline.is_mutation,
        format_template: pipeline.format_template,
        hit_count: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'name', ignoreDuplicates: false },
    )
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || 'Upsert failed' }
  }

  invalidatePipelineCache()
  return { success: true, id: data.id }
}

/**
 * Bump hit count for a pipeline (fire-and-forget).
 */
export async function bumpPipelineHitCount(id: number): Promise<void> {
  const { data } = await supabaseAdmin
    .from('pipelines')
    .select('hit_count')
    .eq('id', id)
    .single()

  if (!data) return

  await supabaseAdmin
    .from('pipelines')
    .update({
      hit_count: data.hit_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

export function invalidatePipelineCache(): void {
  pipelineCache.clear()
}
