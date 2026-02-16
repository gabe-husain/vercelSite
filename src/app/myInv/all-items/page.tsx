import "@/src/styles/TextPage.css";
import AddItemForm from "@/src/components/myInv/inserting/addItemForm";
import InventoryTable from "@/src/components/myInv/InventoryTable";
import { createClient } from "@/utils/supabase/server";
import { isEditor } from "@/src/lib/auth";

type ItemWithLocation = {
  id: number;
  name: string;
  quantity: number;
  notes: string | null;
  location: { id: number; name: string; notes: string | null } | null;
};

export default async function AllItemsPage() {
  const supabase = await createClient();
  const canEdit = await isEditor();

  const { data: itemsRaw } = await supabase
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

  const items = (itemsRaw as unknown as ItemWithLocation[]) || [];

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('name');

  return (
    <div className="w-[90%] sm:w-[85%] lg:w-[80%] mx-auto py-6 sm:py-8">
      <h1 className="title">All Items</h1>

      <InventoryTable
        items={items}
        locations={locations || []}
        canEdit={canEdit}
      />

      {canEdit && (
        <>
          <h2 className="subtitle" style={{ marginTop: '2rem' }}>Add New Item</h2>
          <AddItemForm locations={locations || []} />
        </>
      )}
    </div>
  );
}
