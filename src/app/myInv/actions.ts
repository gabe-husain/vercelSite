'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isEditor } from '@/src/lib/auth'

// --- Items ---

export async function addItem(formData: {
  name: string
  location_id: number
  quantity: number
  notes?: string | null
}) {
  if (!(await isEditor())) {
    return { error: 'Unauthorized: editor access required' }
  }

  if (!formData.name || formData.name.trim().length === 0) {
    return { error: 'Item name is required' }
  }
  if (formData.quantity < 1) {
    return { error: 'Quantity must be at least 1' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .insert({
      name: formData.name.trim(),
      location_id: formData.location_id,
      quantity: formData.quantity,
      notes: formData.notes?.trim() || null,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/myInv')
  return { success: true }
}

export async function updateItem(
  id: number,
  formData: {
    name: string
    location_id: number
    quantity: number
    notes?: string | null
  }
) {
  if (!(await isEditor())) {
    return { error: 'Unauthorized: editor access required' }
  }

  if (!formData.name || formData.name.trim().length === 0) {
    return { error: 'Item name is required' }
  }
  if (formData.quantity < 1) {
    return { error: 'Quantity must be at least 1' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .update({
      name: formData.name.trim(),
      location_id: formData.location_id,
      quantity: formData.quantity,
      notes: formData.notes?.trim() || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/myInv')
  return { success: true }
}

export async function deleteItem(id: number) {
  if (!(await isEditor())) {
    return { error: 'Unauthorized: editor access required' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/myInv')
  return { success: true }
}

// --- Locations ---

export async function addLocation(formData: {
  name: string
  notes?: string | null
}) {
  if (!(await isEditor())) {
    return { error: 'Unauthorized: editor access required' }
  }

  if (!formData.name || formData.name.trim().length === 0) {
    return { error: 'Location name is required' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('locations')
    .insert({
      name: formData.name.trim(),
      notes: formData.notes?.trim() || null,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/myInv')
  return { success: true }
}

export async function updateLocation(
  id: number,
  formData: {
    name: string
    notes?: string | null
  }
) {
  if (!(await isEditor())) {
    return { error: 'Unauthorized: editor access required' }
  }

  if (!formData.name || formData.name.trim().length === 0) {
    return { error: 'Location name is required' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('locations')
    .update({
      name: formData.name.trim(),
      notes: formData.notes?.trim() || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/myInv')
  return { success: true }
}

export async function deleteLocation(id: number) {
  if (!(await isEditor())) {
    return { error: 'Unauthorized: editor access required' }
  }

  const supabase = await createClient()

  // Check if any items reference this location
  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', id)

  if (count && count > 0) {
    return { error: `Cannot delete: ${count} item(s) are assigned to this location` }
  }

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/myInv')
  return { success: true }
}
