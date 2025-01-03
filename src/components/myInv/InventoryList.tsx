import React from 'react';
import { createClient } from '@/utils/supabase/server';

// Type matching your exact database schema
interface Item {
  id: number;
  name: string;
  location_id: number;
  quantity: number;
  notes: string;
}

async function getItems() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('items')
    .select(`
      id,
      name,
      location_id,
      quantity,
      notes
    `)
    .order('id', { ascending: true });
    
  if (error) {
    console.error('Error fetching items:', error);
    return [];
  }
  
  return data as Item[];
}

export default async function InventoryList() {
  const items = await getItems();

  return (
    <div className="w-full">
      <div className="rounded-lg border shadow-sm">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">ID</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Location ID</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Quantity</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4">{item.id}</td>
                  <td className="p-4">{item.name}</td>
                  <td className="p-4">{item.location_id}</td>
                  <td className="p-4">{item.quantity}</td>
                  <td className="p-4">{item.notes || '-'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="h-24 text-center text-gray-500">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}