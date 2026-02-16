import { createClient } from '@/utils/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function isEditor(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user?.email) return false
  const editors = (process.env.EDITOR_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return editors.includes(user.email.toLowerCase())
}
