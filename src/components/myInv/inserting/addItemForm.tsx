'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/database.types';
import { QueryData } from '@supabase/supabase-js';

const supabase = createClient();

// Define the locations query type
const locationsQuery = supabase
  .from('locations')
  .select('*')
  .order('name');

type LocationsData = QueryData<typeof locationsQuery>;

// Cache for locations data
let cachedLocations: LocationsData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function AddItemForm() {
  const [locations, setLocations] = useState<LocationsData>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Database['public']['Tables']['items']['Insert']>({
    name: '',
    location_id: 0,
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    async function fetchLocations() {
      try {
        // Check if we have valid cached data
        const now = Date.now();
        if (cachedLocations && (now - lastFetchTime < CACHE_DURATION)) {
          setLocations(cachedLocations);
          if (cachedLocations.length > 0 && formData.location_id === 0) {
            setFormData(prev => ({ ...prev, location_id: cachedLocations[0].id }));
          }
          return;
        }

        const { data, error } = await locationsQuery;
        
        if (error) throw error;

        // Update cache
        cachedLocations = data;
        lastFetchTime = now;
        
        setLocations(data);
        if (data.length > 0 && formData.location_id === 0) {
          setFormData(prev => ({ ...prev, location_id: data[0].id }));
        }
      } catch (err) {
        setError('Error fetching locations');
        console.error('Error fetching locations:', err);
      }
    }

    fetchLocations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const itemInsertQuery = supabase
      .from('items')
      .insert(formData)
      .select();

    type ItemInsertData = QueryData<typeof itemInsertQuery>;

    try {
      const { error } = await itemInsertQuery;

      if (error) throw error;

      // Reset form but keep the same location
      setFormData({
        name: '',
        location_id: formData.location_id,
        quantity: 1,
        notes: ''
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'location_id' 
        ? parseInt(value, 10) 
        : value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-xl mx-auto">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Item Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="location_id" className="block text-sm font-medium text-gray-700">
          Location *
        </label>
        <select
          id="location_id"
          name="location_id"
          required
          value={formData.location_id || ''}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          {locations.length === 0 && (
            <option value="">Loading locations...</option>
          )}
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
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
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          rows={3}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isSubmitting ? 'Adding...' : 'Add Item'}
      </button>
    </form>
  );
}