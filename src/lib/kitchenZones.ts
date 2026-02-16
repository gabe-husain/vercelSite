export interface KitchenZone {
  id: string           // matches the PNG filename (without .png)
  label: string        // display name
  locationName: string // matches the location name in Supabase
  // Clickable area as percentages of the 2388x1668 canvas
  // This allows the map to scale responsively
  x: number      // left edge %
  y: number      // top edge %
  w: number      // width %
  h: number      // height %
  // Whether this zone holds items (clickable) or is decorative
  clickable: boolean
  // For grouped cabinets: clicking this zone opens the target zone's data
  // e.g. C1 opens B1's items
  opensAs?: string
}

// All zones positioned based on the hand-drawn PNGs overlaid on 2388x1668 canvas.
// Coordinates are percentages of the full image dimensions.
//
// Grouped pairs (clicking either opens the first one's data):
// (B1,C1) (B2,C2) (D1,E1) (D2,E2) (D4,E4) (G1,H1) (J1,K1) (J2,K2) (J4,K4) (L1,M1) (L2,M2)
//
// Non-clickable (decorative): Oven, Counter, Electric_Range, Gas_Range, Fridge, Gas

export const KITCHEN_ZONES: KitchenZone[] = [
  // ============================================
  // UPPER ROW (top of kitchen, y ~ 5-18%)
  // ============================================
  // A1 - top-left small square cabinet
  { id: 'A1', label: 'A1', locationName: 'A1', x: 2.2, y: 13.3, w: 6.4, h: 11, clickable: true },
  { id: 'B1', label: 'B1', locationName: 'B1', x: 8.9, y: 13.6, w: 7.4, h: 10.5, clickable: true },
  { id: 'C1', label: 'C1', locationName: 'C1', x: 16.8, y: 12.8, w: 8.1, h: 10, clickable: true, opensAs: 'B1' },
  { id: 'D1', label: 'D1', locationName: 'D1', x: 25.2, y: 12.8, w: 8.9, h: 10.5, clickable: true },
  { id: 'E1', label: 'E1', locationName: 'E1', x: 34.1, y: 13.3, w: 8, h: 10.5, clickable: true, opensAs: 'D1' },
  { id: 'F1', label: 'F1', locationName: 'F1', x: 42.3, y: 13.3, w: 5.5, h: 19.3, clickable: true },
  { id: 'G1', label: 'G1', locationName: 'G1', x: 47.7, y: 13.8, w: 4.9, h: 19, clickable: true },
  { id: 'H1', label: 'H1', locationName: 'H1', x: 52.6, y: 14.8, w: 5.3, h: 18, clickable: true, opensAs: 'G1' },
  { id: 'I1', label: 'I1', locationName: 'I1', x: 57.8, y: 14.1, w: 5, h: 19.5, clickable: true },
  { id: 'J1', label: 'J1', locationName: 'J1', x: 62.3, y: 15.1, w: 7.3, h: 8.7, clickable: true },
  { id: 'K1', label: 'K1', locationName: 'K1', x: 69.9, y: 14.8, w: 7.9, h: 9, clickable: true, opensAs: 'J1' },
  { id: 'L1', label: 'L1', locationName: 'L1', x: 77.8, y: 14.8, w: 6.2, h: 10.5, clickable: true },
  { id: 'M1', label: 'M1', locationName: 'M1', x: 84.5, y: 15.6, w: 6.4, h: 10, clickable: true, opensAs: 'L1' },
  { id: 'N1', label: 'N1', locationName: 'N1', x: 91.3, y: 15.8, w: 6, h: 9.5, clickable: true },
  { id: 'B2', label: 'B2', locationName: 'B2', x: 9, y: 23.8, w: 7.5, h: 7.5, clickable: true },
  { id: 'C2', label: 'C2', locationName: 'C2', x: 17, y: 24.1, w: 7, h: 8, clickable: true, opensAs: 'B2' },
  { id: 'D2', label: 'D2', locationName: 'D2', x: 25.3, y: 23.8, w: 8.7, h: 25.1, clickable: true },
  { id: 'E2', label: 'E2', locationName: 'E2', x: 34.3, y: 23.3, w: 8.4, h: 25.3, clickable: true, opensAs: 'D2' },
  { id: 'A2', label: 'A2', locationName: 'A2', x: 2.6, y: 23.8, w: 6.2, h: 26.5, clickable: true },
  { id: 'A3', label: 'A3', locationName: 'A3', x: 2.8, y: 50, w: 6.9, h: 31, clickable: true },
  { id: 'D3', label: 'D3', locationName: 'D3', x: 24.8, y: 61.6, w: 8, h: 5, clickable: true },
  { id: 'D4', label: 'D4', locationName: 'D4', x: 24.4, y: 66.8, w: 8, h: 14, clickable: true },
  { id: 'E3', label: 'E3', locationName: 'E3', x: 32.6, y: 61.3, w: 8, h: 5, clickable: true },
  { id: 'E4', label: 'E4', locationName: 'E4', x: 32.4, y: 65.8, w: 8, h: 14.8, clickable: true, opensAs: 'D4' },
  { id: 'F2', label: 'F2', locationName: 'F2', x: 40.3, y: 61.8, w: 12.7, h: 4.7, clickable: true },
  { id: 'F3', label: 'F3', locationName: 'F3', x: 40.8, y: 66.3, w: 12.2, h: 7.3, clickable: true },
  { id: 'F4', label: 'F4', locationName: 'F4', x: 41, y: 73.5, w: 11.9, h: 8, clickable: true },
  { id: 'H2', label: 'H2', locationName: 'H2', x: 53.2, y: 66.9, w: 7.5, h: 5.8, clickable: true },
  { id: 'H3', label: 'H3', locationName: 'H3', x: 53, y: 72.6, w: 7.5, h: 8.3, clickable: true },
  { id: 'J2', label: 'J2', locationName: 'J2', x: 62.5, y: 22.8, w: 7.2, h: 25.4, clickable: true },
  { id: 'K2', label: 'K2', locationName: 'K2', x: 69.7, y: 23.3, w: 7, h: 24.9, clickable: true, opensAs: 'J2' },
  { id: 'J3', label: 'J3', locationName: 'J3', x: 60.6, y: 61.6, w: 7.4, h: 6.3, clickable: true },
  { id: 'K3', label: 'K3', locationName: 'K3', x: 68.2, y: 62, w: 7.7, h: 5.8, clickable: true },
  { id: 'J4', label: 'J4', locationName: 'J4', x: 60.9, y: 66.5, w: 7, h: 14, clickable: true },
  { id: 'K4', label: 'K4', locationName: 'K4', x: 68.2, y: 67.3, w: 7.4, h: 13.5, clickable: true, opensAs: 'J4' },
  { id: 'L2', label: 'L2', locationName: 'L2', x: 76.9, y: 24.8, w: 8.1, h: 19.3, clickable: true },
  { id: 'M2', label: 'M2', locationName: 'M2', x: 84.5, y: 24.8, w: 6.5, h: 19.1, clickable: true, opensAs: 'L2' },
  { id: 'N2', label: 'N2', locationName: 'N2', x: 90.6, y: 24.8, w: 6.9, h: 26.3, clickable: true },
  { id: 'N3', label: 'N3', locationName: 'N3', x: 90.3, y: 50.6, w: 6.5, h: 28, clickable: true },
]

// Images that are purely decorative (no Supabase data)
export const DECORATIVE_IDS = new Set([
  'Oven', 'Counter', 'Electric_Range', 'Gas_Range', 'Fridge', 'Gas', 'Hood'
])

// Grouped zones: clicking either member opens the first member's data
// Key = zone that redirects, Value = zone whose data to show
export const ZONE_GROUPS: Record<string, string> = {
  'C1': 'B1',
  'C2': 'B2',
  'E1': 'D1',
  'E2': 'D2',
  'E4': 'D4',
  'H1': 'G1',
  'K1': 'J1',
  'K2': 'J2',
  'K4': 'J4',
  'M1': 'L1',
  'M2': 'L2',
}

// All PNG filenames that make up the kitchen composite
export const ALL_LAYER_FILES = [
  'A1', 'A2', 'A3',
  'B1', 'B2',
  'C1', 'C2',
  'Counter',
  'D1', 'D2', 'D3', 'D4',
  'E1', 'E2', 'E3', 'E4',
  'Electric_Range',
  'F1', 'F2', 'F3', 'F4',
  'Fridge',
  'G1',
  'Gas', 'Gas_Range',
  'H1', 'H2', 'H3',
  'Hood',
  'I1',
  'J1', 'J2', 'J3', 'J4',
  'K1', 'K2', 'K3', 'K4',
  'L1', 'L2',
  'M1', 'M2',
  'N1', 'N2', 'N3',
  'Oven',
]
