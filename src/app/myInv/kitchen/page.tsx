import "@/src/styles/TextPage.css";
import KitchenNavigator from "@/src/components/myInv/KitchenNavigator";
import { createClient } from "@/utils/supabase/server";
import { isEditor } from "@/src/lib/auth";

type ItemWithLocation = {
  id: number;
  name: string;
  quantity: number;
  notes: string | null;
  location: { id: number; name: string; notes: string | null } | null;
};

export default async function KitchenPage() {
  const supabase = await createClient();

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
    .order('name');

  const items = (itemsRaw as unknown as ItemWithLocation[]) || [];

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('name');

  const canEdit = await isEditor();

  return (
    <div className="w-[90%] sm:w-[85%] lg:w-[80%] mx-auto py-6 sm:py-8">
      <h1 className="title">Kitchen Map</h1>
      <p className="textBody" style={{ marginBottom: '1.5rem' }}>
        Explore the kitchen — click on cabinets, drawers, and appliances to see what&apos;s inside.
      </p>
      <KitchenNavigator items={items} locations={locations || []} canEdit={canEdit} />
    </div>
  );
}
