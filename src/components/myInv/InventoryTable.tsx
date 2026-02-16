'use client'

import React, { useState, useTransition } from 'react'
import { updateItem, deleteItem } from '@/src/app/myInv/actions'

type Location = {
  id: number
  name: string
  notes: string | null
}

type ItemWithLocation = {
  id: number
  name: string
  quantity: number
  notes: string | null
  location: Location | null
}

interface InventoryTableProps {
  items: ItemWithLocation[]
  locations: Location[]
  canEdit: boolean
}

export default function InventoryTable({ items, locations, canEdit }: InventoryTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState({ name: '', location_id: 0, quantity: 1, notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startEdit(item: ItemWithLocation) {
    setEditingId(item.id)
    setEditData({
      name: item.name,
      location_id: item.location?.id ?? 0,
      quantity: item.quantity,
      notes: item.notes || '',
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setError(null)
  }

  function handleSave(id: number) {
    startTransition(async () => {
      const result = await updateItem(id, editData)
      if (result.error) {
        setError(result.error)
      } else {
        setEditingId(null)
        setError(null)
      }
    })
  }

  function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteItem(id)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  const inputClass = "w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 rounded-md p-3 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm">
          {error}
        </div>
      )}
      <div className="rounded-lg border border-[hsl(var(--border))] shadow-sm">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Location</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Qty</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Notes</th>
                {canEdit && (
                  <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[hsl(var(--muted))] transition-colors">
                  {editingId === item.id ? (
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
                        <select
                          value={editData.location_id}
                          onChange={e => setEditData(d => ({ ...d, location_id: parseInt(e.target.value, 10) }))}
                          className={inputClass}
                        >
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={editData.quantity}
                          onChange={e => setEditData(d => ({ ...d, quantity: parseInt(e.target.value, 10) || 1 }))}
                          className={inputClass}
                          style={{ width: '5rem' }}
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
                            onClick={() => handleSave(item.id)}
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
                      <td className="p-4">{item.name}</td>
                      <td className="p-4">{item.location?.name ?? '-'}</td>
                      <td className="p-4">{item.quantity}</td>
                      <td className="p-4">{item.notes || '-'}</td>
                      {canEdit && (
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="text-sm px-2 py-1 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              disabled={isPending}
                              className="text-sm px-2 py-1 rounded border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))] transition-colors disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="h-24 text-center text-[hsl(var(--muted-foreground))]">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
