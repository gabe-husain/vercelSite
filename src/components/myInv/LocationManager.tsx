'use client'

import React, { useState, useTransition } from 'react'
import { addLocation, updateLocation, deleteLocation } from '@/src/app/myInv/actions'

type Location = {
  id: number
  name: string
  notes: string | null
}

interface LocationManagerProps {
  locations: Location[]
}

export default function LocationManager({ locations }: LocationManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState({ name: '', notes: '' })
  const [newLocation, setNewLocation] = useState({ name: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startEdit(location: Location) {
    setEditingId(location.id)
    setEditData({ name: location.name, notes: location.notes || '' })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setError(null)
  }

  function handleSave(id: number) {
    startTransition(async () => {
      const result = await updateLocation(id, editData)
      if (result.error) {
        setError(result.error)
      } else {
        setEditingId(null)
        setError(null)
      }
    })
  }

  function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete location "${name}"? Items assigned here must be moved first.`)) return
    startTransition(async () => {
      const result = await deleteLocation(id)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await addLocation(newLocation)
      if (result.error) {
        setError(result.error)
      } else {
        setNewLocation({ name: '', notes: '' })
        setError(null)
      }
    })
  }

  const inputClass = "w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"

  return (
    <div className="w-full space-y-6">
      {error && (
        <div className="rounded-md p-3 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-[hsl(var(--border))] shadow-sm">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Notes</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-[hsl(var(--muted))] transition-colors">
                  {editingId === loc.id ? (
                    <>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editData.name}
                          onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                          className={inputClass}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editData.notes}
                          onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                          className={inputClass}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(loc.id)}
                            disabled={isPending}
                            className="text-sm px-2 py-1 rounded bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
                          >
                            {isPending ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-sm px-2 py-1 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4">{loc.name}</td>
                      <td className="p-4">{loc.notes || '-'}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(loc)}
                            className="text-sm px-2 py-1 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(loc.id, loc.name)}
                            disabled={isPending}
                            className="text-sm px-2 py-1 rounded border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))] transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {locations.length === 0 && (
                <tr>
                  <td colSpan={3} className="h-24 text-center text-[hsl(var(--muted-foreground))]">
                    No locations yet. Add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))] p-4">
        <h3 className="text-sm font-medium text-[hsl(var(--foreground))] mb-3">Add New Location</h3>
        <form onSubmit={handleAdd} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="loc-name" className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">Name *</label>
            <input
              id="loc-name"
              type="text"
              required
              maxLength={100}
              value={newLocation.name}
              onChange={e => setNewLocation(d => ({ ...d, name: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Upper Cabinet Left"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="loc-notes" className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">Notes</label>
            <input
              id="loc-notes"
              type="text"
              maxLength={500}
              value={newLocation.notes}
              onChange={e => setNewLocation(d => ({ ...d, notes: e.target.value }))}
              className={inputClass}
              placeholder="Optional description"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-1.5 rounded bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPending ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  )
}
