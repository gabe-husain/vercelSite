# myInventory Web UI

Next.js 15 web interface for the kitchen inventory system. Provides a visual kitchen map, item management, and location editing.

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/myInv` | `page.tsx` | Home / overview |
| `/myInv/kitchen` | `kitchen/page.tsx` | Interactive kitchen map with clickable zones |
| `/myInv/all-items` | `all-items/page.tsx` | Full item list with inline editing |
| `/myInv/locations` | `locations/page.tsx` | Location manager (editor-only) |

`layout.tsx` provides shared navigation across all pages.

## Components (`src/components/myInv/`)

| Component | Type | Purpose |
|-----------|------|---------|
| `KitchenNavigator.tsx` | Client | Interactive kitchen zone map — click a zone to see its items |
| `InventoryTable.tsx` | Client | Item table with inline edit/delete, quantity controls |
| `AddItemForm.tsx` | Client | Form to add items (name, quantity, zone, notes) |
| `LocationManager.tsx` | Client | CRUD for storage locations |
| `ZoneFineTuner.tsx` | Client | Kitchen zone position/size editor |

## Server Actions (`actions.ts`)

All actions require editor authorization via `isEditor()` check. All call `revalidatePath('/myInv')` after mutations.

**Items:**
- `addItem(formData)` — Insert item, apply auto-tags via `applyAutoTags()`
- `updateItem(formData)` — Update item fields, re-run auto-tags
- `deleteItem(formData)` — Remove item by ID

**Locations:**
- `addLocation(formData)` — Create storage location
- `updateLocation(formData)` — Modify location
- `deleteLocation(formData)` — Delete location (validates no items reference it)

## Data Flow

1. **Server components** (page.tsx files) fetch data in parallel using `React.cache()` wrapped queries from `src/lib/queries.ts`:
   - `getItems()` — all items with location joins, sorted by name
   - `getLocations()` — all locations, sorted by name
   - `getCanEdit()` — editor permission check
2. **Props** pass data to client components
3. **Client mutations** call server actions → `revalidatePath()` triggers re-fetch
4. **Optimistic updates** via `useTransition` in client components

## Zone System

Kitchen zones follow a letter-number pattern (A1, B2, N3):
- **Letters** = cabinet/area groups
- **Numbers** = shelf levels
- 35 clickable zones total, 11 grouped pairs (via `ZONE_GROUPS` in `kitchenZones.ts`), 6 decorative-only zones
- Grouped zones share items — e.g., B1/B2 might map to the same storage area

Zone definitions and coordinates live in `src/lib/kitchenZones.ts`.

## Authorization

- **Web UI**: `EDITOR_EMAILS` env var controls who can add/edit/delete via the web
- **Telegram**: `TELEGRAM_ALLOWED_CHAT_IDS` env var controls who can message the bot
- Supabase uses a service-role client (`supabaseAdmin`) — RLS is bypassed server-side
