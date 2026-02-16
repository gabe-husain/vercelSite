import Link from "next/link";
import { getCanEdit } from "@/src/lib/queries";

export default async function MyInvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const canEdit = await getCanEdit();

  return (
    <section>
      <nav className="border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-1 px-4 py-2 max-w-5xl mx-auto overflow-x-auto text-sm">
          <Link
            href="/myInv"
            className="px-3 py-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-colors whitespace-nowrap"
          >
            Overview
          </Link>
          <Link
            href="/myInv/all-items"
            className="px-3 py-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-colors whitespace-nowrap"
          >
            All Items
          </Link>
          <Link
            href="/myInv/kitchen"
            className="px-3 py-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-colors whitespace-nowrap"
          >
            Kitchen Map
          </Link>
          {canEdit && (
            <Link
              href="/myInv/locations"
              className="px-3 py-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-colors whitespace-nowrap"
            >
              Locations
            </Link>
          )}
        </div>
      </nav>
      {children}
    </section>
  );
}
