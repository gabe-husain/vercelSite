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

// Build a reverse lookup: for a primary zone, find all its group members (including itself)
// e.g. 'B1' -> ['B1', 'C1'] because C1 opensAs B1
function getGroupMembers(zoneId: string): string[] {
  const members = [zoneId]
  for (const [alias, primary] of Object.entries(ZONE_GROUPS)) {
    if (primary === zoneId) members.push(alias)
  }
  return members
}

// Check if an image exists (caches results)
const imageExistsCache: Record<string, boolean> = {}
function checkImageExists(src: string): Promise<boolean> {
  if (src in imageExistsCache) return Promise.resolve(imageExistsCache[src])
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => { imageExistsCache[src] = true; resolve(true) }
    img.onerror = () => { imageExistsCache[src] = false; resolve(false) }
    img.src = src
  })
}

export default function KitchenNavigator({ items, locations, canEdit = false }: KitchenNavigatorProps) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)
  const [tunerActive, setTunerActive] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const creakAudioRef = useRef<HTMLAudioElement | null>(null)

  // Track which open images actually exist
  const [openImageAvailable, setOpenImageAvailable] = useState<Record<string, boolean>>({})

  // Pre-check which _open images exist on mount
  useEffect(() => {
    const clickableIds = KITCHEN_ZONES.filter(z => z.clickable).map(z => z.id)
    clickableIds.forEach(id => {
      const src = `/images/kitchen/${id}_(open).png`
      checkImageExists(src).then(exists => {
        if (exists) {
          setOpenImageAvailable(prev => ({ ...prev, [id]: true }))
        }
      })
    })
  }, [])

  // Initialize creak audio (graceful: if file missing, nothing happens)
  useEffect(() => {
    const audio = new Audio('/sounds/creak.mp3')
    audio.volume = 0.3
    audio.preload = 'auto'
    // If the sound file doesn't load, just silently fail
    audio.addEventListener('error', () => {
      creakAudioRef.current = null
    })
    creakAudioRef.current = audio
    return () => { audio.pause() }
  }, [])

  // Compute all zones that are currently "highlighted" (hovered zone + its group members)
  const highlightedZoneIds = useMemo(() => {
    if (!hoveredZoneId) return new Set<string>()
    // Resolve to the primary zone first
    const primaryId = ZONE_GROUPS[hoveredZoneId] || hoveredZoneId
    return new Set(getGroupMembers(primaryId))
  }, [hoveredZoneId])

  const locationNameToId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const loc of locations) {
      map[loc.name] = loc.id
    }
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

  function resolveZoneId(zoneId: string): string {
    return ZONE_GROUPS[zoneId] || zoneId
  }

  function getItemCountForZone(zone: KitchenZone): number {
    const resolvedId = resolveZoneId(zone.id)
    const resolvedZone = KITCHEN_ZONES.find(z => z.id === resolvedId)
    if (!resolvedZone) return 0
    const locId = locationNameToId[resolvedZone.locationName]
    if (!locId) return 0
    return locationItemCounts[locId] || 0
  }

  function getItemsForActiveZone(): ItemWithLocation[] {
    if (!activeZoneId) return []
    const resolvedId = resolveZoneId(activeZoneId)
    const zone = KITCHEN_ZONES.find(z => z.id === resolvedId)
    if (!zone) return []
    const locId = locationNameToId[zone.locationName]
    if (!locId) return []
    return items.filter(item => item.location?.id === locId)
  }

  function handleZoneClick(zone: KitchenZone) {
    if (!zone.clickable) return
    const resolvedId = resolveZoneId(zone.id)
    setActiveZoneId(prev => prev === resolvedId ? null : resolvedId)
  }

  // Play creak sound once per hover event
  const playCreak = useCallback(() => {
    const audio = creakAudioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {/* silently ignore if browser blocks autoplay */})
  }, [])

  const handleHoverEnter = useCallback((zoneId: string) => {
    setHoveredZoneId(zoneId)
    playCreak()
  }, [playCreak])

  const handleHoverLeave = useCallback(() => {
    setHoveredZoneId(null)
  }, [])

  const activeItems = getItemsForActiveZone()
  const activeZone = activeZoneId ? KITCHEN_ZONES.find(z => z.id === activeZoneId) : null

  const clickableZones = KITCHEN_ZONES.filter(z => z.clickable)
  const primaryClickableZones = clickableZones.filter(z => !z.opensAs)
  const aliasZones = clickableZones.filter(z => z.opensAs)

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
        {/* All PNG layers stacked absolutely — swap to open variant on hover */}
        {ALL_LAYER_FILES.map(file => {
          const isHighlighted = highlightedZoneIds.has(file)
          const hasOpenImage = openImageAvailable[file]
          const showOpen = isHighlighted && hasOpenImage && !tunerActive

          return (
            <React.Fragment key={file}>
              {/* Normal (closed) image — hide when showing open variant */}
              <img
                src={`/images/kitchen/${file}.png`}
                alt=""
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none dark:invert transition-opacity duration-200"
                style={{ opacity: showOpen ? 0 : 1 }}
                draggable={false}
                loading="lazy"
              />
              {/* Open variant — only render if available */}
              {hasOpenImage && (
                <img
                  src={`/images/kitchen/${file}_(open).png`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none dark:invert transition-opacity duration-200"
                  style={{ opacity: showOpen ? 1 : 0 }}
                  draggable={false}
                  loading="lazy"
                />
              )}
            </React.Fragment>
          )
        })}

        {/* Clickable hotspot overlays for primary zones (hidden when tuner is active) */}
        {!tunerActive && primaryClickableZones.map(zone => {
          const count = getItemCountForZone(zone)
          const isActive = activeZoneId === zone.id
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

        {/* Alias zones (grouped partners) - clickable areas that redirect + also trigger group highlight */}
        {!tunerActive && aliasZones.map(zone => {
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
                zIndex: isHovered ? 20 : 10,
                borderRadius: '4px',
                background: isHovered ? 'hsla(var(--primary), 0.08)' : 'transparent',
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
