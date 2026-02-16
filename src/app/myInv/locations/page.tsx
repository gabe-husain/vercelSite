import "@/src/styles/TextPage.css";
import { createClient } from "@/utils/supabase/server";
import { isEditor } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import LocationManager from "@/src/components/myInv/LocationManager";

export default async function LocationsPage() {
  const canEdit = await isEditor();

  if (!canEdit) {
    redirect('/myInv');
  }

  const supabase = await createClient();
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('name');

  return (
    <div className="w-[90%] sm:w-[85%] lg:w-[80%] mx-auto py-6 sm:py-8">
      <h1 className="title">Manage Locations</h1>
      <p className="textBody" style={{ marginBottom: '1.5rem' }}>
        Add, edit, or remove storage locations in your kitchen.
      </p>
      <LocationManager locations={locations || []} />
    </div>
  );
}
