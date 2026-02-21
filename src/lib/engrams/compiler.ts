// ── Pattern-to-regex compiler for learned utterances ────────

/** Placeholder → regex capture group mapping */
const PLACEHOLDER_REGEX: Record<string, string> = {
  '{item}': '(.+?)',
  '{zone}': '([A-Za-z]\\d+)',
  '{quantity}': '(\\d+)',
  '{tag}': '(.+?)',
}

const PLACEHOLDER_RE = /\{(item|zone|quantity|tag)\}/g

// Valid command types that engrams can map to
const VALID_COMMAND_TYPES = new Set([
  'check',
  'tag-search',
  'remove',
  'add',
  'update-qty',
  'list',
  'list-all',
  'list-tags',
  'list-tags-item',
  'tag-item',
  'untag-item',
  'search-names',
  'list-dict',
])

/** Escape regex-special characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Compile a human-readable pattern into a regex string.
 * Pattern: "what {item} stuff do we have"
 * Returns: { regex: "^what\\s+(.+?)\\s+stuff\\s+do\\s+we\\s+have$", captureGroups: ["item"] }
 */
export function compilePattern(
  pattern: string,
): { regex: string; captureGroups: string[] } | null {
  const trimmed = pattern.trim().toLowerCase()
  if (!trimmed) return null

  // Patterns must have at least 3 words to avoid overly broad matches
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount < 3) return null

  // Split the pattern into parts around placeholders
  const parts = trimmed.split(PLACEHOLDER_RE)
  // parts alternates: [literal, placeholderName, literal, placeholderName, ...]

  let regexStr = '^'
  const captureGroups: string[] = []

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Literal part — escape and replace spaces with \s+
      const literal = parts[i].trim()
      if (literal) {
        const words = literal.split(/\s+/).filter(Boolean)
        const escaped = words.map(escapeRegex).join('\\s+')
        if (regexStr !== '^') regexStr += '\\s+'
        regexStr += escaped
      }
    } else {
      // Placeholder name
      const name = parts[i] // "item", "zone", etc.
      const key = `{${name}}`
      const fragment = PLACEHOLDER_REGEX[key]
      if (!fragment) return null // unknown placeholder
      if (regexStr !== '^') regexStr += '\\s+'
      regexStr += fragment
      captureGroups.push(name)
    }
  }

  regexStr += '$'

  // Verify the regex compiles
  try {
    new RegExp(regexStr, 'i')
  } catch {
    return null
  }

  return { regex: regexStr, captureGroups }
}

/**
 * Convert Claude's param_mapping (placeholder names) to numeric capture group indices.
 * Input:  { "itemName": "{item}" }, captureGroups: ["item"]
 * Output: { "itemName": 1 }
 */
export function resolveParamMapping(
  mapping: Record<string, string>,
  captureGroups: string[],
): Record<string, number> | null {
  const resolved: Record<string, number> = {}

  for (const [paramName, placeholder] of Object.entries(mapping)) {
    // placeholder is like "{item}" — extract the name
    const match = placeholder.match(/^\{(\w+)\}$/)
    if (!match) return null

    const placeholderName = match[1]
    const groupIndex = captureGroups.indexOf(placeholderName)
    if (groupIndex === -1) return null

    resolved[paramName] = groupIndex + 1 // regex groups are 1-indexed
  }

  return resolved
}

/**
 * Validate a compiled pattern against its example.
 */
export function validatePattern(opts: {
  regex: string
  commandType: string
  exampleInput: string
  exampleExtraction: Record<string, string>
  captureGroups: string[]
}): { valid: boolean; reason?: string } {
  // Check command type is valid
  if (!VALID_COMMAND_TYPES.has(opts.commandType)) {
    return { valid: false, reason: `Invalid command type: ${opts.commandType}` }
  }

  // Check regex matches the example
  let re: RegExp
  try {
    re = new RegExp(opts.regex, 'i')
  } catch {
    return { valid: false, reason: 'Regex failed to compile' }
  }

  const match = re.exec(opts.exampleInput.trim())
  if (!match) {
    return { valid: false, reason: 'Pattern does not match the example input' }
  }

  // Check extractions match
  for (const [placeholderName, expectedValue] of Object.entries(
    opts.exampleExtraction,
  )) {
    const groupIndex = opts.captureGroups.indexOf(placeholderName)
    if (groupIndex === -1) {
      return {
        valid: false,
        reason: `Placeholder "${placeholderName}" not found in pattern`,
      }
    }
    const actual = match[groupIndex + 1]
    if (
      !actual ||
      actual.trim().toLowerCase() !== expectedValue.trim().toLowerCase()
    ) {
      return {
        valid: false,
        reason: `Expected "${expectedValue}" for {${placeholderName}}, got "${actual}"`,
      }
    }
  }

  return { valid: true }
}
