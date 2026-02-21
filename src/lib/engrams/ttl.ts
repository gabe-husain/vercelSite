// ── Spaced repetition TTL for learned utterances ────────────

/** Duration in milliseconds for each TTL level */
export const TTL_DURATIONS: Record<number, number> = {
  0: 1 * 24 * 60 * 60 * 1000, // 1 day
  1: 7 * 24 * 60 * 60 * 1000, // 1 week
  2: 30 * 24 * 60 * 60 * 1000, // 1 month (30 days)
  3: 90 * 24 * 60 * 60 * 1000, // 3 months
  4: 180 * 24 * 60 * 60 * 1000, // 6 months
}

/** Time remaining (ms) below which a promotion triggers */
export const PROMOTION_WINDOWS: Record<number, number> = {
  0: 12 * 60 * 60 * 1000, // < 12h remaining → promote from level 0
  1: 3 * 24 * 60 * 60 * 1000, // < 3 days → promote from level 1
  2: 14 * 24 * 60 * 60 * 1000, // < 2 weeks → promote from level 2
  3: 30 * 24 * 60 * 60 * 1000, // < 1 month → promote from level 3
  4: 60 * 24 * 60 * 60 * 1000, // < 2 months → renew level 4
}

/** Check if an utterance should be promoted based on remaining time */
export function shouldPromote(ttlLevel: number, expiresAt: Date): boolean {
  const remaining = expiresAt.getTime() - Date.now()
  const window = PROMOTION_WINDOWS[ttlLevel]
  if (window === undefined) return false
  return remaining < window && remaining > 0
}

/** Get the new expiry timestamp for a given TTL level */
export function getNewExpiry(ttlLevel: number): Date {
  const duration = TTL_DURATIONS[ttlLevel] ?? TTL_DURATIONS[4]
  return new Date(Date.now() + duration)
}

/** Get the promoted level (capped at 4) */
export function getPromotedLevel(ttlLevel: number): number {
  return Math.min(ttlLevel + 1, 4)
}
