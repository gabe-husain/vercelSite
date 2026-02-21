// ── Learned utterance types ─────────────────────────────────

/** What gets stored in the Supabase `learned_utterances` table */
export type LearnedUtterance = {
  id: number
  pattern: string // e.g. "what {item} stuff do we have"
  regex: string // compiled regex string
  command_type: string | null // ParsedCommand type: "check", "tag-search", etc. Null if pipeline-linked.
  pipeline_id: number | null // references pipelines.id — set for pipeline-linked utterances
  param_mapping: Record<string, number> // { "itemName": 1 } — capture group index
  example_input: string | null
  example_extraction: Record<string, string> | null
  ttl_level: number // 0=1d, 1=1w, 2=1mo, 3=3mo, 4=6mo
  expires_at: string // ISO timestamp
  hit_count: number
  created_at: string
  updated_at: string
}

/** In-memory compiled form — regex is a RegExp object, not a string */
export type CompiledUtterance = Omit<LearnedUtterance, 'regex'> & {
  compiledRegex: RegExp
}

/** What the learn_utterance tool receives from Claude */
export type LearnUtteranceInput = {
  pattern: string
  command_type: string
  param_mapping: Record<string, string> // { "itemName": "{item}" }
  example_input: string
  example_extraction: Record<string, string>
}
