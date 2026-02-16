import "@/src/styles/TextPage.css";
import { redirect } from "next/navigation";
import LocationManager from "@/src/components/myInv/LocationManager";
import { getCanEdit, getLocations } from "@/src/lib/queries";

export default async function LocationsPage() {
  const canEdit = await getCanEdit();

  if (!canEdit) {
    redirect('/myInv');
  }

  const locations = await getLocations();

  return (
    <div className="w-[90%] sm:w-[85%] lg:w-[80%] mx-auto py-6 sm:py-8">
      <h1 className="title">Manage Locations</h1>
      <p className="textBody" style={{ marginBottom: '1.5rem' }}>
        Add, edit, or remove storage locations in your kitchen.
      </p>
      <LocationManager locations={locations} />
    </div>
  );
}
