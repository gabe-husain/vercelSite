'use client'

import React, { useState, useTransition } from 'react'
import { addItem } from '@/src/app/myInv/actions'

type Location = {
  id: number
  name: string
  notes: string | null
}

interface AddItemFormProps {
  locations: Location[]
}

export default function AddItemForm({ locations }: AddItemFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    location_id: locations[0]?.id ?? 0,
    quantity: 1,
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await addItem(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setFormData({
          name: '',
          location_id: formData.location_id,
          quantity: 1,
          notes: '',
        })
      }
    })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'location_id'
        ? parseInt(value, 10)
        : value
    }))
  }

  const inputClass = "w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-xl mx-auto">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-[hsl(var(--foreground))]">
          Item Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          maxLength={100}
          value={formData.name}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="location_id" className="block text-sm font-medium text-[hsl(var(--foreground))]">
          Location *
        </label>
        <select
          id="location_id"
          name="location_id"
          required
          value={formData.location_id || ''}
          onChange={handleChange}
          className={inputClass}
        >
          {locations.length === 0 && (
            <option value="">No locations available</option>
          )}
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="quantity" className="block text-sm font-medium text-[hsl(var(--foreground))]">
          Quantity
        </label>
        <input
          type="number"
          id="quantity"
          name="quantity"
          min="1"
          required
          value={formData.quantity}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-[hsl(var(--foreground))]">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={500}
          value={formData.notes}
          onChange={handleChange}
          className={inputClass}
          rows={3}
        />
      </div>

      {error && (
        <div className="text-[hsl(var(--destructive))] text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? 'Adding...' : 'Add Item'}
      </button>
    </form>
  )
}
