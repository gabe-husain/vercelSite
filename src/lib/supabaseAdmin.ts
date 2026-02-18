import { createClient } from '@supabase/supabase-js'

// Service-role client for server-to-server use (no cookies, bypasses RLS).
// Used by the Telegram bot webhook which has no user session.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
