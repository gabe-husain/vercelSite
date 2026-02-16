'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { KITCHEN_ZONES, ALL_LAYER_FILES, ZONE_GROUPS, type KitchenZone } from '@/src/lib/kitchenZones'
import { useIsMobile } from '@/src/hooks/useIsMobile'
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
function toPrimary(zoneId: string): string {
  return ZONE_GROUPS[zoneId] || zoneId
}

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

// ── Image preloading cache (desktop only) ─────────────────────
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
  const isMobile = useIsMobile()

  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [hoveredGroupPrimary, setHoveredGroupPrimary] = useState<string | null>(null)
  const [tunerActive, setTunerActive] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const creakAudioRef = useRef<HTMLAudioElement | null>(null)

  // Which _(open) images are available (desktop only)
  const [openImageAvailable, setOpenImageAvailable] = useState<Record<string, boolean>>({})

  // ── Refs for stable hover callback (desktop fix) ──
  const hoveredRef = useRef(hoveredGroupPrimary)
  const activeRef = useRef(activeZoneId)
  useEffect(() => { hoveredRef.current = hoveredGroupPrimary }, [hoveredGroupPrimary])
  useEffect(() => { activeRef.current = activeZoneId }, [activeZoneId])

  // ── Preload closed layers (desktop) + probe open variants (both) ──
  useEffect(() => {
    // Desktop: preload the closed layers (visible base map)
    if (!isMobile) {
      ALL_LAYER_FILES.forEach(file => {
        preloadImage(`/images/kitchen/${file}.webp`)
      })
    }

    // Both: probe which open images exist (mobile uses /mobile/ path)
    const base = isMobile ? '/images/kitchen/mobile' : '/images/kitchen'
    const clickableIds = KITCHEN_ZONES.filter(z => z.clickable).map(z => z.id)
    const results: Record<string, boolean> = {}
    Promise.all(
      clickableIds.map(id => {
        const src = `${base}/${id}_(open).webp`
        return preloadImage(src).then(exists => { results[id] = exists })
      })
    ).then(() => {
      setOpenImageAvailable(results)
    })
  }, [isMobile])

  // ── Creak audio (desktop only) ──
  useEffect(() => {
    if (isMobile) return // No hover on mobile = no sound needed

    const audio = new Audio('/sounds/creak.mp3')
    audio.volume = 0.2
    audio.preload = 'auto'
    audio.addEventListener('error', () => { creakAudioRef.current = null })
    creakAudioRef.current = audio
    return () => { audio.pause() }
  }, [isMobile])

  const playCreak = useCallback(() => {
    const audio = creakAudioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [])

  // ── Derived sets ──
  const openZoneIds = useMemo(() => {
    const s = new Set<string>()
    // Both mobile and desktop: active (clicked/tapped) group shows open
    if (activeZoneId) {
      getGroupSet(activeZoneId).forEach(id => s.add(id))
    }
    // Desktop only: hovered group also shows open
    if (!isMobile && hoveredGroupPrimary) {
      getGroupSet(hoveredGroupPrimary).forEach(id => s.add(id))
    }
    return s
  }, [activeZoneId, hoveredGroupPrimary, isMobile])

  const highlightedZoneIds = useMemo(() => {
    if (isMobile || !hoveredGroupPrimary) return new Set<string>()
    return getGroupSet(hoveredGroupPrimary)
  }, [hoveredGroupPrimary, isMobile])

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
    setActiveZoneId(prev => prev === resolvedId ? null : resolvedId)
  }

  // ── Hover handlers (desktop only — uses refs for stable callback) ──
  const handleHoverEnter = useCallback((zoneId: string) => {
    const primary = toPrimary(zoneId)
    if (primary !== hoveredRef.current && primary !== activeRef.current) {
      playCreak()
    }
    setHoveredGroupPrimary(primary)
  }, [playCreak])

  const handleHoverLeave = useCallback(() => {
    setHoveredGroupPrimary(null)
  }, [])

  // ── Derived data ──
  const activeItems = getItemsForActiveZone()
  const activeZone = activeZoneId ? KITCHEN_ZONES.find(z => z.id === activeZoneId) : null

  const clickableZones = useMemo(() => KITCHEN_ZONES.filter(z => z.clickable), [])
  const primaryClickableZones = useMemo(() => clickableZones.filter(z => !z.opensAs), [clickableZones])
  const aliasZones = useMemo(() => clickableZones.filter(z => z.opensAs), [clickableZones])

  // ── Image base path ──
  const imgBase = isMobile ? '/images/kitchen/mobile' : '/images/kitchen'

  return (
    <div className="flex flex-col gap-6">
      {/* Editor tuner toggle — desktop only */}
      {canEdit && !isMobile && (
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
        {/* Image layers */}
        {ALL_LAYER_FILES.map(file => {
          if (isMobile) {
            // ── MOBILE: closed image + open variant cross-fade on tap ──
            const shouldOpen = openZoneIds.has(file) && openImageAvailable[file]

            return (
              <React.Fragment key={file}>
                <picture className="absolute inset-0 w-full h-full pointer-events-none select-none" style={{ opacity: shouldOpen ? 0 : 1, transition: 'opacity 200ms' }}>
                  <source srcSet={`${imgBase}/${file}.webp`} type="image/webp" />
                  <img
                    src={`/images/kitchen/${file}.png`}
                    alt=""
                    className="w-full h-full object-contain dark:invert"
                    draggable={false}
                    loading="lazy"
                  />
                </picture>
                {openImageAvailable[file] && (
                  <picture className="absolute inset-0 w-full h-full pointer-events-none select-none" style={{ opacity: shouldOpen ? 1 : 0, transition: 'opacity 200ms' }}>
                    <source srcSet={`${imgBase}/${file}_(open).webp`} type="image/webp" />
                    <img
                      src={`/images/kitchen/${file}_(open).png`}
                      alt=""
                      className="w-full h-full object-contain dark:invert"
                      draggable={false}
                      loading="lazy"
                    />
                  </picture>
                )}
              </React.Fragment>
            )
          }

          // ── DESKTOP: closed + open variant with cross-fade ──
          const shouldOpen = openZoneIds.has(file) && openImageAvailable[file] && !tunerActive

          return (
            <React.Fragment key={file}>
              <picture className="absolute inset-0 w-full h-full pointer-events-none select-none" style={{ opacity: shouldOpen ? 0 : 1, transition: 'opacity 200ms' }}>
                <source srcSet={`/images/kitchen/${file}.webp`} type="image/webp" />
                <img
                  src={`/images/kitchen/${file}.png`}
                  alt=""
                  className="w-full h-full object-contain dark:invert"
                  draggable={false}
                />
              </picture>
              {openImageAvailable[file] && (
                <picture className="absolute inset-0 w-full h-full pointer-events-none select-none" style={{ opacity: shouldOpen ? 1 : 0, transition: 'opacity 200ms' }}>
                  <source srcSet={`/images/kitchen/${file}_(open).webp`} type="image/webp" />
                  <img
                    src={`/images/kitchen/${file}_(open).png`}
                    alt=""
                    className="w-full h-full object-contain dark:invert"
                    draggable={false}
                  />
                </picture>
              )}
            </React.Fragment>
          )
        })}

        {/* ── Primary zone hotspots ── */}
        {!tunerActive && primaryClickableZones.map(zone => {
          const count = getItemCountForZone(zone)
          const isActive = toPrimary(activeZoneId || '') === zone.id
          const isHovered = highlightedZoneIds.has(zone.id)

          if (isMobile) {
            // ── MOBILE: pure click targets, no transitions/transforms/hover ──
            return (
              <div
                key={zone.id}
                onClick={() => handleZoneClick(zone)}
                className="absolute cursor-pointer"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                  zIndex: isActive ? 20 : 10,
                  borderRadius: '4px',
                  outline: isActive ? '2px solid hsl(var(--primary))' : 'none',
                  background: isActive ? 'hsla(var(--primary), 0.15)' : 'transparent',
                }}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleZoneClick(zone) }}
                aria-label={`${zone.label} - ${count} item${count !== 1 ? 's' : ''}`}
              >
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
          }

          // ── DESKTOP: full hover experience ──
          return (
            <div
              key={zone.id}
              onClick={() => handleZoneClick(zone)}
              onMouseEnter={() => handleHoverEnter(zone.id)}
              onMouseLeave={handleHoverLeave}
              className="absolute cursor-pointer transition-[transform,background,outline] duration-200"
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

        {/* ── Alias zone hotspots (desktop only — no hover on mobile means aliases are unnecessary) ── */}
        {!isMobile && !tunerActive && aliasZones.map(zone => {
          const isHovered = highlightedZoneIds.has(zone.id)
          const isActive = toPrimary(activeZoneId || '') === toPrimary(zone.id)

          return (
            <div
              key={zone.id}
              onClick={() => handleZoneClick(zone)}
              onMouseEnter={() => handleHoverEnter(zone.id)}
              onMouseLeave={handleHoverLeave}
              className="absolute cursor-pointer transition-[transform,background,outline] duration-200"
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

        {/* Fine-tuner overlay (desktop only) */}
        {!isMobile && tunerActive && <ZoneFineTuner containerRef={mapContainerRef} />}
      </div>

      <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
        {isMobile
          ? 'Tap on a cabinet or drawer to see what\u2019s inside.'
          : 'Click on a cabinet or drawer to see what\u2019s inside. Hover to see item counts.'}
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
