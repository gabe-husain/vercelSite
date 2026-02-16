import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'
import { isEditor } from './auth'

// Shared type used across myInv pages
export type ItemWithLocation = {
  id: number
  name: string
  quantity: number
  notes: string | null
  location: { id: number; name: string; notes: string | null } | null
}

export type Location = {
  id: number
  name: string
  notes: string | null
}

// React.cache() deduplicates calls within a single server render pass.
// If layout.tsx and page.tsx both call getCanEdit(), only ONE Supabase
// auth.getUser() call is made.

export const getCanEdit = cache(async (): Promise<boolean> => {
  return isEditor()
})

export const getItems = cache(async (): Promise<ItemWithLocation[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('items')
    .select(`
      id,
      name,
      quantity,
      notes,
      location:locations (
        id,
        name,
        notes
      )
    `)
    .order('name')

  return (data as unknown as ItemWithLocation[]) || []
})

export const getLocations = cache(async (): Promise<Location[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  return (data as Location[]) || []
})
