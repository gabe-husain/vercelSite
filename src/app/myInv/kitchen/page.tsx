import "@/src/styles/TextPage.css";
import KitchenNavigator from "@/src/components/myInv/KitchenNavigator";
import { getItems, getLocations, getCanEdit } from "@/src/lib/queries";

export default async function KitchenPage() {
  const [items, locations, canEdit] = await Promise.all([
    getItems(),
    getLocations(),
    getCanEdit(),
  ]);

  return (
    <div className="w-[90%] sm:w-[85%] lg:w-[80%] mx-auto py-6 sm:py-8">
      <h1 className="title">Kitchen Map</h1>
      <p className="textBody" style={{ marginBottom: '1.5rem' }}>
        Explore the kitchen — click on cabinets, drawers, and appliances to see what&apos;s inside.
      </p>
      <KitchenNavigator items={items} locations={locations} canEdit={canEdit} />
    </div>
  );
}
