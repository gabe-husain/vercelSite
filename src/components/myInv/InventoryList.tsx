import React from 'react';
import { createClient } from '@/utils/supabase/server';

type ItemWithLocation = {
  id: number;
  name: string;
  quantity: number;
  notes: string | null;
  location: { id: number; name: string; notes: string | null } | null;
};

async function getItems(): Promise<ItemWithLocation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
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
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching items:', error);
    return [];
  }

  return data as unknown as ItemWithLocation[];
}

export default async function InventoryList() {
  const items = await getItems();

  return (
    <div className="w-full">
      <div className="rounded-lg border border-[hsl(var(--border))] shadow-sm">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">ID</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Location</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Quantity</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-[hsl(var(--muted-foreground))]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[hsl(var(--muted))] transition-colors">
                  <td className="p-4">{item.id}</td>
                  <td className="p-4">{item.name}</td>
                  <td className="p-4">{item.location?.name ?? '-'}</td>
                  <td className="p-4">{item.quantity}</td>
                  <td className="p-4">{item.notes || '-'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="h-24 text-center text-[hsl(var(--muted-foreground))]">
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
