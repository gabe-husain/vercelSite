import "@/src/styles/TextPage.css";
import AddItemForm from "@/src/components/myInv/inserting/addItemForm";
import InventoryTable from "@/src/components/myInv/InventoryTable";
import { getItems, getLocations, getCanEdit } from "@/src/lib/queries";

export default async function AllItemsPage() {
  const [items, locations, canEdit] = await Promise.all([
    getItems(),
    getLocations(),
    getCanEdit(),
  ]);

  return (
    <div className="w-[90%] sm:w-[85%] lg:w-[80%] mx-auto py-6 sm:py-8">
      <h1 className="title">All Items</h1>

      <InventoryTable
        items={items}
        locations={locations}
        canEdit={canEdit}
      />

      {canEdit && (
        <>
          <h2 className="subtitle" style={{ marginTop: '2rem' }}>Add New Item</h2>
          <AddItemForm locations={locations} />
        </>
      )}
    </div>
  );
}
