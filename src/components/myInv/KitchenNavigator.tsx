'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { KITCHEN_ZONES, ALL_LAYER_FILES, ZONE_GROUPS, type KitchenZone } from '@/src/lib/kitchenZones'
import dynamic from 'next/dynamic'

const ZoneFineTuner = dynamic(() => import('./ZoneFineTuner'), { ssr: false })

type Location = {
  id: number
  name: string
  notes: string | null
}

type ItemWithLocation = {
  id: number
  name: string
  quantity: number
  notes: string | null
  location: Location | null
}

interface KitchenNavigatorProps {
  items: ItemWithLocation[]
  locations: Location[]
  canEdit?: boolean
}

// ── Group helpers ──────────────────────────────────────────────
// Resolve any zone id to its primary (e.g. 'C1' → 'B1', 'B1' → 'B1')
function toPrimary(zoneId: string): string {
  return ZONE_GROUPS[zoneId] || zoneId
}

// For a primary zone, return the full set of group member ids (including itself)
// Pre-compute once at module level for speed.
const GROUP_MEMBERS: Record<string, Set<string>> = {}
for (const zone of KITCHEN_ZONES) {
  if (!zone.clickable) continue
  const primary = toPrimary(zone.id)
  if (!GROUP_MEMBERS[primary]) GROUP_MEMBERS[primary] = new Set()
  GROUP_MEMBERS[primary].add(zone.id)
}

function getGroupSet(zoneId: string): Set<string> {
  return GROUP_MEMBERS[toPrimary(zoneId)] || new Set([zoneId])
}

// ── Image preloading cache ────────────────────────────────────
// Sits at module level so it persists across re-renders and even
// hot-reloads during dev.  Once an image is loaded into the
// browser cache the <img> tag picks it up instantly.
const imagePreloadCache: Record<string, HTMLImageElement> = {}

function preloadImage(src: string): Promise<boolean> {
  if (imagePreloadCache[src]) return Promise.resolve(true)
  return new Promise(resolve => {
    const img = new window.Image()
    img.onload = () => { imagePreloadCache[src] = img; resolve(true) }
    img.onerror = () => { resolve(false) }
    img.src = src
  })
}

// ── Component ─────────────────────────────────────────────────
export default function KitchenNavigator({ items, locations, canEdit = false }: KitchenNavigatorProps) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  // hoveredGroupPrimary tracks the *primary* id of the currently
  // hovered group so moving between B1↔C1 is treated as one
  // continuous hover and doesn't re-trigger anything.
  const [hoveredGroupPrimary, setHoveredGroupPrimary] = useState<string | null>(null)
  const [tunerActive, setTunerActive] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const creakAudioRef = useRef<HTMLAudioElement | null>(null)

  // Which _(open) images are available
  const [openImageAvailable, setOpenImageAvailable] = useState<Record<string, boolean>>({})

  // ── Preload all images on mount ──
  useEffect(() => {
    // 1. Preload every closed layer
    ALL_LAYER_FILES.forEach(file => {
      preloadImage(`/images/kitchen/${file}.png`)
    })

    // 2. Probe + preload every open variant
    const clickableIds = KITCHEN_ZONES.filter(z => z.clickable).map(z => z.id)
    const results: Record<string, boolean> = {}
    Promise.all(
      clickableIds.map(id => {
        const src = `/images/kitchen/${id}_(open).png`
        return preloadImage(src).then(exists => { results[id] = exists })
      })
    ).then(() => {
      setOpenImageAvailable(results)
    })
  }, [])

  // ── Creak audio ──
  useEffect(() => {
    const audio = new Audio('/sounds/creak.mp3')
    audio.volume = 0.2
    audio.preload = 'auto'
    audio.addEventListener('error', () => { creakAudioRef.current = null })
    creakAudioRef.current = audio
    return () => { audio.pause() }
  }, [])

  const playCreak = useCallback(() => {
    const audio = creakAudioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [])

  // ── Derived sets ──
  // The set of zone ids whose images should show as "open".
  // This is the union of:
  //   • the active (clicked) group
  //   • the hovered group (if different from active)
  const openZoneIds = useMemo(() => {
    const s = new Set<string>()
    if (activeZoneId) {
      getGroupSet(activeZoneId).forEach(id => s.add(id))
    }
    if (hoveredGroupPrimary) {
      getGroupSet(hoveredGroupPrimary).forEach(id => s.add(id))
    }
    return s
  }, [activeZoneId, hoveredGroupPrimary])

  // The set of zone ids that should show the hover highlight
  // (scale-up, background tint).  Only the hovered group, not
  // the active-but-not-hovered group.
  const highlightedZoneIds = useMemo(() => {
    if (!hoveredGroupPrimary) return new Set<string>()
    return getGroupSet(hoveredGroupPrimary)
  }, [hoveredGroupPrimary])

  // ── Location lookups ──
  const locationNameToId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const loc of locations) map[loc.name] = loc.id
    return map
  }, [locations])

  const locationItemCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const item of items) {
      if (item.location?.id) {
        counts[item.location.id] = (counts[item.location.id] || 0) + 1
      }
    }
    return counts
  }, [items])

  function getItemCountForZone(zone: KitchenZone): number {
    const resolvedZone = KITCHEN_ZONES.find(z => z.id === toPrimary(zone.id))
    if (!resolvedZone) return 0
    const locId = locationNameToId[resolvedZone.locationName]
    if (!locId) return 0
    return locationItemCounts[locId] || 0
  }

  function getItemsForActiveZone(): ItemWithLocation[] {
    if (!activeZoneId) return []
    const zone = KITCHEN_ZONES.find(z => z.id === toPrimary(activeZoneId))
    if (!zone) return []
    const locId = locationNameToId[zone.locationName]
    if (!locId) return []
    return items.filter(item => item.location?.id === locId)
  }

  // ── Click handler ──
  function handleZoneClick(zone: KitchenZone) {
    if (!zone.clickable) return
    const resolvedId = toPrimary(zone.id)
    // Toggle: clicking the same group again closes it
    setActiveZoneId(prev => prev === resolvedId ? null : resolvedId)
  }

  // ── Hover handlers ──
  // We track hover at the *group* level.  Moving the mouse from
  // B1 to C1 (same group) is a no-op: no sound, no animation
  // restart.  Moving from B1 to D1 is a new group, so we play
  // the creak and update.
const handleHoverEnter = useCallback((zoneId: string) => {
  const primary = toPrimary(zoneId)
  
  // Only play sound if this is a different group than the one currently being hovered
  // AND it's not the active group
  if (primary !== hoveredGroupPrimary && primary !== activeZoneId) {
    playCreak()
  }
  
  // Always update the hover state
  setHoveredGroupPrimary(primary)
}, [playCreak, hoveredGroupPrimary, activeZoneId])

  const handleHoverLeave = useCallback(() => {
    setHoveredGroupPrimary(null)
  }, [])

  // ── Derived data ──
  const activeItems = getItemsForActiveZone()
  const activeZone = activeZoneId ? KITCHEN_ZONES.find(z => z.id === activeZoneId) : null

  const clickableZones = useMemo(() => KITCHEN_ZONES.filter(z => z.clickable), [])
  const primaryClickableZones = useMemo(() => clickableZones.filter(z => !z.opensAs), [clickableZones])
  const aliasZones = useMemo(() => clickableZones.filter(z => z.opensAs), [clickableZones])

  return (
    <div className="flex flex-col gap-6">
      {/* Editor tuner toggle */}
      {canEdit && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setTunerActive(prev => !prev)}
            className="px-3 py-1.5 text-xs rounded-md font-medium transition-colors border"
            style={{
              background: tunerActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              color: tunerActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
              borderColor: tunerActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
            }}
          >
            {tunerActive ? 'Exit Fine-Tuner' : 'Fine-Tune Zones'}
          </button>
        </div>
      )}

      {/* Kitchen Map with PNG overlays */}
      <div ref={mapContainerRef} className="relative w-full" style={{ aspectRatio: '2388 / 1668' }}>
        {/* All PNG layers — cross-fade between closed/open variants */}
        {ALL_LAYER_FILES.map(file => {
          const shouldOpen = openZoneIds.has(file) && openImageAvailable[file] && !tunerActive

          return (
            <React.Fragment key={file}>
              {/* Closed image */}
              <img
                src={`/images/kitchen/${file}.png`}
                alt=""
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none dark:invert transition-opacity duration-200"
                style={{ opacity: shouldOpen ? 0 : 1 }}
                draggable={false}
              />
              {/* Open variant (only rendered when known to exist) */}
              {openImageAvailable[file] && (
                <img
                  src={`/images/kitchen/${file}_(open).png`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none dark:invert transition-opacity duration-200"
                  style={{ opacity: shouldOpen ? 1 : 0 }}
                  draggable={false}
                />
              )}
            </React.Fragment>
          )
        })}

        {/* ── Primary zone hotspots ── */}
        {!tunerActive && primaryClickableZones.map(zone => {
          const count = getItemCountForZone(zone)
          const isActive = toPrimary(activeZoneId || '') === zone.id
          const isHovered = highlightedZoneIds.has(zone.id)

          return (
            <div
              key={zone.id}
              onClick={() => handleZoneClick(zone)}
              onMouseEnter={() => handleHoverEnter(zone.id)}
              onMouseLeave={handleHoverLeave}
              className="absolute cursor-pointer transition-all duration-200"
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.w}%`,
                height: `${zone.h}%`,
                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                transformOrigin: 'center center',
                zIndex: isHovered || isActive ? 20 : 10,
                borderRadius: '4px',
                background: isActive
                  ? 'hsla(var(--primary), 0.15)'
                  : isHovered
                    ? 'hsla(var(--primary), 0.08)'
                    : 'transparent',
                outline: isActive
                  ? '2px solid hsl(var(--primary))'
                  : 'none',
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleZoneClick(zone) }}
              aria-label={`${zone.label} - ${count} item${count !== 1 ? 's' : ''}`}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div
                  className="absolute z-30 px-2 py-1 rounded text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none"
                  style={{
                    bottom: '105%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  {zone.label}: {count} item{count !== 1 ? 's' : ''}
                </div>
              )}

              {/* Item count badge */}
              {count > 0 && (
                <div
                  className="absolute flex items-center justify-center rounded-full text-[10px] font-bold pointer-events-none"
                  style={{
                    top: '-4px',
                    right: '-4px',
                    width: '18px',
                    height: '18px',
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    zIndex: 25,
                  }}
                >
                  {count}
                </div>
              )}
            </div>
          )
        })}

        {/* ── Alias zone hotspots (grouped partners) ── */}
        {!tunerActive && aliasZones.map(zone => {
          const isHovered = highlightedZoneIds.has(zone.id)
          const isActive = toPrimary(activeZoneId || '') === toPrimary(zone.id)

          return (
            <div
              key={zone.id}
              onClick={() => handleZoneClick(zone)}
              onMouseEnter={() => handleHoverEnter(zone.id)}
              onMouseLeave={handleHoverLeave}
              className="absolute cursor-pointer transition-all duration-200"
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.w}%`,
                height: `${zone.h}%`,
                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                transformOrigin: 'center center',
                zIndex: isHovered || isActive ? 20 : 10,
                borderRadius: '4px',
                background: isActive
                  ? 'hsla(var(--primary), 0.15)'
                  : isHovered
                    ? 'hsla(var(--primary), 0.08)'
                    : 'transparent',
                outline: isActive
                  ? '2px solid hsl(var(--primary))'
                  : 'none',
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleZoneClick(zone) }}
              aria-label={`${zone.label} (opens ${zone.opensAs})`}
            />
          )
        })}

        {/* Fine-tuner overlay */}
        {tunerActive && <ZoneFineTuner containerRef={mapContainerRef} />}
      </div>

      <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
        Click on a cabinet or drawer to see what&apos;s inside. Hover to see item counts.
      </p>

      {/* Detail panel below the map */}
      <div
        className="w-full transition-all duration-300"
        style={{ minHeight: activeZone ? '120px' : '0px' }}
      >
        {activeZone ? (
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {activeZone.label}
              </h3>
              <button
                onClick={() => setActiveZoneId(null)}
                className="text-sm px-2 py-1 rounded hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
              >
                Close
              </button>
            </div>

            {activeItems.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Nothing stored here yet.
              </p>
            ) : (
              <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[hsl(var(--muted))]">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Item</th>
                      <th className="px-3 py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Qty</th>
                      <th className="px-3 py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {activeItems.map(item => (
                      <tr key={item.id} className="hover:bg-[hsl(var(--muted))] transition-colors">
                        <td className="px-3 py-2 text-[hsl(var(--foreground))]">{item.name}</td>
                        <td className="px-3 py-2 text-[hsl(var(--foreground))]">{item.quantity}</td>
                        <td className="px-3 py-2 text-[hsl(var(--muted-foreground))]">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
