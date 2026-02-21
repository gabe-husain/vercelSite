// ── SQL validation for pipeline queries ─────────────────────

/** DDL and dangerous keywords blocked in ALL queries */
const BLOCKED_KEYWORDS = [
  'DROP',
  'ALTER',
  'CREATE',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'COPY',
  'EXECUTE',
  'CALL',
  'LOCK',
  'VACUUM',
  'CLUSTER',
  'REINDEX',
  'COMMENT',
  'SECURITY',
  'OWNER',
  'SET ',
  'DO ',
]

/**
 * Validate SQL for safety before execution.
 * Returns the query type ('select' | 'insert' | 'update' | 'delete') or an error.
 */
export function validateSQL(
  sql: string,
): { valid: true; queryType: 'select' | 'insert' | 'update' | 'delete' } | { valid: false; reason: string } {
  // Strip comments
  const stripped = sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()

  if (!stripped) {
    return { valid: false, reason: 'Empty query' }
  }

  // No semicolons (prevent multi-statement injection)
  if (stripped.includes(';')) {
    return { valid: false, reason: 'Multiple statements not allowed (no semicolons)' }
  }

  // Check blocked keywords (DDL etc.)
  const upper = stripped.toUpperCase()
  for (const kw of BLOCKED_KEYWORDS) {
    const re = new RegExp(`\\b${kw.trim()}\\b`, 'i')
    if (re.test(upper)) {
      return { valid: false, reason: `Forbidden keyword: ${kw.trim()}` }
    }
  }

  // Determine query type
  if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
    return { valid: true, queryType: 'select' }
  }
  if (upper.startsWith('INSERT')) {
    return { valid: true, queryType: 'insert' }
  }
  if (upper.startsWith('UPDATE')) {
    return { valid: true, queryType: 'update' }
  }
  if (upper.startsWith('DELETE')) {
    return { valid: true, queryType: 'delete' }
  }

  return { valid: false, reason: 'Query must start with SELECT, WITH, INSERT, UPDATE, or DELETE' }
}
