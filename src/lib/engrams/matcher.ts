import type { CompiledUtterance } from './types'
import type { ParsedCommand } from '../telegramBot'

export type MatchResult = {
  command: ParsedCommand | null // null if pipeline-linked
  utterance: CompiledUtterance
  pipelineId: number | null // set if pipeline-linked
  params: Record<string, string> // extracted param values by name (for pipelines)
}

/**
 * Match incoming text against compiled learned utterances.
 * Returns the first valid match (utterances are ordered by hit_count DESC).
 */
export function matchUtterance(
  text: string,
  utterances: CompiledUtterance[],
): MatchResult | null {
  const trimmed = text.trim()

  for (const utterance of utterances) {
    const match = utterance.compiledRegex.exec(trimmed)
    if (!match) continue

    // Pipeline-linked utterance
    if (utterance.pipeline_id) {
      const params = extractPipelineParams(utterance.param_mapping, match)
      return {
        command: null,
        utterance,
        pipelineId: utterance.pipeline_id,
        params,
      }
    }

    // Command-type utterance (existing behavior)
    if (utterance.command_type) {
      const command = buildCommand(
        utterance.command_type,
        utterance.param_mapping,
        match,
      )
      if (command) {
        return { command, utterance, pipelineId: null, params: {} }
      }
    }
  }

  return null
}

/**
 * Extract named parameter values from regex match for pipeline execution.
 * param_mapping maps param names to capture group indices: { "zone_name": 1, "tag_name": 2 }
 * Returns: { "zone_name": "A1", "tag_name": "dairy" }
 */
function extractPipelineParams(
  paramMapping: Record<string, number>,
  match: RegExpExecArray,
): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [paramName, groupIndex] of Object.entries(paramMapping)) {
    params[paramName] = match[groupIndex]?.trim() ?? ''
  }
  return params
}

/**
 * Construct a ParsedCommand from a regex match using the param mapping.
 * Returns null if required params are missing or command type is unsupported.
 */
function buildCommand(
  commandType: string,
  paramMapping: Record<string, number>,
  match: RegExpExecArray,
): ParsedCommand | null {
  const get = (param: string): string | undefined => {
    const idx = paramMapping[param]
    return idx !== undefined ? match[idx]?.trim() : undefined
  }

  switch (commandType) {
    case 'check': {
      const itemName = get('itemName')
      if (!itemName) return null
      return { type: 'check', itemName }
    }
    case 'tag-search': {
      const tagName = get('tagName')
      if (!tagName) return null
      return { type: 'tag-search', tagName }
    }
    case 'remove': {
      const itemName = get('itemName')
      if (!itemName) return null
      const zone = get('zone')?.toUpperCase()
      return { type: 'remove', itemName, ...(zone ? { zone } : {}) }
    }
    case 'add': {
      const itemName = get('itemName')
      const zone = get('zone')?.toUpperCase()
      if (!itemName || !zone) return null // zone is required for add
      const qtyStr = get('quantity')
      const quantity = qtyStr ? parseInt(qtyStr, 10) : 1
      return { type: 'add', itemName, quantity, zone }
    }
    case 'update-qty': {
      const itemName = get('itemName')
      const qtyStr = get('quantity')
      if (!itemName || !qtyStr) return null
      return { type: 'update-qty', itemName, quantity: parseInt(qtyStr, 10) }
    }
    case 'list': {
      const zone = get('zone')?.toUpperCase()
      return { type: 'list', ...(zone ? { zone } : {}) }
    }
    case 'list-all':
      return { type: 'list-all' }
    case 'list-tags':
      return { type: 'list-tags' }
    case 'list-tags-item': {
      const itemName = get('itemName')
      if (!itemName) return null
      return { type: 'list-tags-item', itemName }
    }
    case 'tag-item': {
      const itemName = get('itemName')
      const tagStr = get('tag') || get('tagName')
      if (!itemName || !tagStr) return null
      const tagNames = tagStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return { type: 'tag-item', itemName, tagNames }
    }
    case 'untag-item': {
      const itemName = get('itemName')
      const tagName = get('tagName') || get('tag')
      if (!itemName || !tagName) return null
      return { type: 'untag-item', itemName, tagName }
    }
    case 'search-names':
      return { type: 'search-names' }
    case 'list-dict':
      return { type: 'list-dict' }
    default:
      return null
  }
}
