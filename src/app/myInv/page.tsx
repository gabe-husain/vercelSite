import "@/src/styles/TextPage.css";
import Link from "next/link";
import { isEditor } from "@/src/lib/auth";

export default async function MyInv() {
  const canEdit = await isEditor();

  return (
    <div className="w-[90%] sm:w-[85%] lg:w-[80%] mx-auto py-6 sm:py-8">
      <h1 className="title">Kitchen Inventory</h1>

      <p className="textBody" style={{ marginBottom: '2rem' }}>
        A realtime inventory of what&apos;s in the kitchen, backed by a PostgreSQL database on Supabase. Browse items, explore the kitchen map, or manage locations.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <Link
          href="/myInv/all-items"
          className="block p-6 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">All Items</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            View, search, and manage every item in the kitchen.
          </p>
        </Link>

        <Link
          href="/myInv/kitchen"
          className="block p-6 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">Kitchen Map</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Click on cabinets and drawers to see what&apos;s inside.
          </p>
        </Link>

        {canEdit && (
          <Link
            href="/myInv/locations"
            className="block p-6 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">Manage Locations</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Add, edit, or remove kitchen storage locations.
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
