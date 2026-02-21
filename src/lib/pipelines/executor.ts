import { supabaseAdmin } from '../supabaseAdmin'
import { getCachedPipeline, bumpPipelineHitCount } from './cache'
import type { Pipeline } from './cache'
import { invalidateCache } from '../ai/inventoryCache'

/**
 * Execute a pipeline by ID with the given named parameters.
 * Returns a formatted string for Telegram, or null if the pipeline couldn't be found/executed.
 */
export async function executePipeline(
  pipelineId: number,
  params: Record<string, string>,
): Promise<string | null> {
  const pipeline = await getCachedPipeline(pipelineId)
  if (!pipeline) return null

  // Map named params to positional array matching $1, $2, ...
  const positionalParams = pipeline.params.map((name) => params[name] ?? '')

  try {
    if (pipeline.is_mutation) {
      const { data, error } = await supabaseAdmin.rpc('execute_mutation_query', {
        query_text: pipeline.sql_template,
        query_params: positionalParams,
      })

      if (error) return `Pipeline error: ${error.message}`

      // Invalidate inventory cache after mutations
      invalidateCache()

      // Bump hit count in background
      bumpPipelineHitCount(pipelineId).catch(() => {})

      const result = data as { affected_rows: number; rows: Record<string, unknown>[] }
      return formatPipelineResult(pipeline, result.rows, result.affected_rows)
    } else {
      const { data, error } = await supabaseAdmin.rpc('execute_readonly_query', {
        query_text: pipeline.sql_template,
        query_params: positionalParams,
      })

      if (error) return `Pipeline error: ${error.message}`

      // Bump hit count in background
      bumpPipelineHitCount(pipelineId).catch(() => {})

      const rows = (data as Record<string, unknown>[]) || []
      return formatPipelineResult(pipeline, rows)
    }
  } catch (err) {
    return `Pipeline execution failed: ${err instanceof Error ? err.message : 'unknown error'}`
  }
}

/**
 * Format pipeline results using the pipeline's format_template.
 * Falls back to generic bullet-list formatting if no template is defined.
 */
function formatPipelineResult(
  pipeline: Pipeline,
  rows: Record<string, unknown>[],
  affectedRows?: number,
): string {
  if (pipeline.format_template) {
    return renderTemplate(pipeline.format_template, rows, affectedRows)
  }
  return genericBulletFormat(pipeline.description, rows, affectedRows)
}

/**
 * Render a format template with {{_header}}, {{_row}}, {{_empty}} prefixes.
 *
 * Example template:
 *   {{_header}}Found {{_count}} items:
 *   {{_row}}- {{name}} (×{{quantity}}) in {{location}}
 *   {{_empty}}Nothing found.
 */
function renderTemplate(
  template: string,
  rows: Record<string, unknown>[],
  affectedRows?: number,
): string {
  const lines = template.split('\n')
  const headerLine = lines.find((l) => l.startsWith('{{_header}}'))?.slice(11) // len('{{_header}}') = 11
  const rowLine = lines.find((l) => l.startsWith('{{_row}}'))?.slice(8) // len('{{_row}}') = 8
  const emptyLine = lines.find((l) => l.startsWith('{{_empty}}'))?.slice(10) // len('{{_empty}}') = 10

  if (rows.length === 0) {
    if (affectedRows !== undefined && affectedRows > 0) {
      return headerLine
        ? headerLine
            .replace('{{_count}}', String(affectedRows))
            .replace('{{_affected}}', String(affectedRows))
        : `Done. ${affectedRows} row(s) affected.`
    }
    return emptyLine || 'No results.'
  }

  const count = affectedRows ?? rows.length
  let result = (headerLine || '')
    .replace('{{_count}}', String(count))
    .replace('{{_affected}}', String(affectedRows ?? rows.length))

  for (const row of rows.slice(0, 30)) {
    let line = rowLine || ''
    for (const [key, val] of Object.entries(row)) {
      line = line.replaceAll(`{{${key}}}`, String(val ?? ''))
    }
    result += '\n' + line
  }

  if (rows.length > 30) {
    result += `\n...and ${rows.length - 30} more`
  }

  return result.trim()
}

/**
 * Generic fallback: bullet-list format.
 */
function genericBulletFormat(
  description: string,
  rows: Record<string, unknown>[],
  affectedRows?: number,
): string {
  if (rows.length === 0) {
    if (affectedRows !== undefined && affectedRows > 0) {
      return `Done. ${affectedRows} row(s) affected.`
    }
    return `No results for: ${description}`
  }

  const header = `${description} (${affectedRows ?? rows.length} result${(affectedRows ?? rows.length) > 1 ? 's' : ''}):`
  const lines = rows.slice(0, 20).map((row) => {
    const parts = Object.entries(row)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${k}: ${v}`)
    return `• ${parts.join(', ')}`
  })

  const footer = rows.length > 20 ? `\n...and ${rows.length - 20} more` : ''
  return [header, ...lines, footer].filter(Boolean).join('\n')
}
