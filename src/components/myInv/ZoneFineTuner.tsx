'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { KITCHEN_ZONES, type KitchenZone } from '@/src/lib/kitchenZones'

interface ZoneFineTunerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

type DragMode = 'move' | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl' | null

export default function ZoneFineTuner({ containerRef }: ZoneFineTunerProps) {
  const [zones, setZones] = useState<KitchenZone[]>(() =>
    KITCHEN_ZONES.filter(z => z.clickable)
  )
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [dragStart, setDragStart] = useState<{ mx: number; my: number; x: number; y: number; w: number; h: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const outputRef = useRef<HTMLTextAreaElement>(null)

  const selectedZone = zones.find(z => z.id === selectedZoneId) || null

  const handleMouseDown = useCallback((e: React.MouseEvent, zoneId: string, mode: DragMode) => {
    e.stopPropagation()
    e.preventDefault()
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return
    setSelectedZoneId(zoneId)
    setDragMode(mode)
    setDragStart({ mx: e.clientX, my: e.clientY, x: zone.x, y: zone.y, w: zone.w, h: zone.h })
  }, [zones])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragMode || !dragStart || !selectedZoneId || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - dragStart.mx) / rect.width) * 100
    const dy = ((e.clientY - dragStart.my) / rect.height) * 100

    setZones(prev => prev.map(z => {
      if (z.id !== selectedZoneId) return z
      const updated = { ...z }

      switch (dragMode) {
        case 'move':
          updated.x = Math.max(0, Math.min(100 - dragStart.w, dragStart.x + dx))
          updated.y = Math.max(0, Math.min(100 - dragStart.h, dragStart.y + dy))
          break
        case 'resize-br':
          updated.w = Math.max(1, dragStart.w + dx)
          updated.h = Math.max(1, dragStart.h + dy)
          break
        case 'resize-bl':
          updated.x = Math.max(0, dragStart.x + dx)
          updated.w = Math.max(1, dragStart.w - dx)
          updated.h = Math.max(1, dragStart.h + dy)
          break
        case 'resize-tr':
          updated.y = Math.max(0, dragStart.y + dy)
          updated.w = Math.max(1, dragStart.w + dx)
          updated.h = Math.max(1, dragStart.h - dy)
          break
        case 'resize-tl':
          updated.x = Math.max(0, dragStart.x + dx)
          updated.y = Math.max(0, dragStart.y + dy)
          updated.w = Math.max(1, dragStart.w - dx)
          updated.h = Math.max(1, dragStart.h - dy)
          break
      }
      return updated
    }))
  }, [dragMode, dragStart, selectedZoneId, containerRef])

  const handleMouseUp = useCallback(() => {
    setDragMode(null)
    setDragStart(null)
  }, [])

  useEffect(() => {
    if (dragMode) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragMode, handleMouseMove, handleMouseUp])

  // Generate output config for pasting into kitchenZones.ts
  function generateOutput(): string {
    const lines = zones.map(z => {
      const base = `  { id: '${z.id}', label: '${z.label}', locationName: '${z.locationName}', x: ${round(z.x)}, y: ${round(z.y)}, w: ${round(z.w)}, h: ${round(z.h)}, clickable: true${z.opensAs ? `, opensAs: '${z.opensAs}'` : ''} },`
      return base
    })
    return lines.join('\n')
  }

  function round(n: number): number {
    return Math.round(n * 10) / 10
  }

  function handleCopy() {
    const text = generateOutput()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Manual input for selected zone
  function updateSelectedField(field: 'x' | 'y' | 'w' | 'h', value: string) {
    const num = parseFloat(value)
    if (isNaN(num)) return
    setZones(prev => prev.map(z =>
      z.id === selectedZoneId ? { ...z, [field]: num } : z
    ))
  }

  // Nudge with arrow keys
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!selectedZoneId) return
    const step = e.shiftKey ? 1 : 0.2
    let field: 'x' | 'y' | null = null
    let delta = 0

    switch (e.key) {
      case 'ArrowLeft': field = 'x'; delta = -step; break
      case 'ArrowRight': field = 'x'; delta = step; break
      case 'ArrowUp': field = 'y'; delta = -step; break
      case 'ArrowDown': field = 'y'; delta = step; break
      default: return
    }

    e.preventDefault()
    setZones(prev => prev.map(z =>
      z.id === selectedZoneId ? { ...z, [field!]: Math.max(0, z[field!] + delta) } : z
    ))
  }

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
      {/* Overlay rectangles on the kitchen map */}
      {zones.map(zone => {
        const isSelected = zone.id === selectedZoneId
        return (
          <div
            key={zone.id}
            className="absolute"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.w}%`,
              height: `${zone.h}%`,
              border: isSelected ? '2px solid #f97316' : '1px solid rgba(59, 130, 246, 0.5)',
              background: isSelected ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.08)',
              zIndex: isSelected ? 50 : 40,
              cursor: dragMode === 'move' ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
            onMouseDown={(e) => handleMouseDown(e, zone.id, 'move')}
            onClick={(e) => { e.stopPropagation(); setSelectedZoneId(zone.id) }}
          >
            {/* Zone label */}
            <span
              className="absolute text-[9px] font-bold pointer-events-none"
              style={{
                top: '2px',
                left: '3px',
                color: isSelected ? '#f97316' : '#3b82f6',
                textShadow: '0 0 3px white, 0 0 3px white',
              }}
            >
              {zone.id}
            </span>

            {/* Resize handles (only on selected) */}
            {isSelected && (
              <>
                <div className="absolute w-2.5 h-2.5 bg-orange-500 rounded-sm cursor-nwse-resize" style={{ top: -5, left: -5 }} onMouseDown={e => handleMouseDown(e, zone.id, 'resize-tl')} />
                <div className="absolute w-2.5 h-2.5 bg-orange-500 rounded-sm cursor-nesw-resize" style={{ top: -5, right: -5 }} onMouseDown={e => handleMouseDown(e, zone.id, 'resize-tr')} />
                <div className="absolute w-2.5 h-2.5 bg-orange-500 rounded-sm cursor-nesw-resize" style={{ bottom: -5, left: -5 }} onMouseDown={e => handleMouseDown(e, zone.id, 'resize-bl')} />
                <div className="absolute w-2.5 h-2.5 bg-orange-500 rounded-sm cursor-nwse-resize" style={{ bottom: -5, right: -5 }} onMouseDown={e => handleMouseDown(e, zone.id, 'resize-br')} />
              </>
            )}
          </div>
        )
      })}

      {/* Control panel below the map */}
      <div className="mt-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm" style={{ position: 'relative', zIndex: 60 }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[hsl(var(--foreground))]">Zone Fine-Tuner</h4>
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs rounded font-medium transition-colors"
            style={{
              background: copied ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              color: copied ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
            }}
          >
            {copied ? 'Copied!' : 'Copy Config'}
          </button>
        </div>

        {selectedZone ? (
          <div className="space-y-2">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Selected: <strong className="text-[hsl(var(--foreground))]">{selectedZone.id}</strong> ({selectedZone.label})
              {selectedZone.opensAs && <span className="ml-1 opacity-60">→ opens {selectedZone.opensAs}</span>}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['x', 'y', 'w', 'h'] as const).map(field => (
                <label key={field} className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] font-medium">
                    {field === 'x' ? 'Left %' : field === 'y' ? 'Top %' : field === 'w' ? 'Width %' : 'Height %'}
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={round(selectedZone[field])}
                    onChange={e => updateSelectedField(field, e.target.value)}
                    className="w-full px-2 py-1 rounded text-xs border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                  />
                </label>
              ))}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
              Drag to move. Corners to resize. Arrow keys to nudge (hold Shift for bigger steps).
            </p>
          </div>
        ) : (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Click a zone rectangle to select it, then drag or use the inputs to adjust its position.
          </p>
        )}

        {/* Collapsible output */}
        <details className="mt-3">
          <summary className="text-xs cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
            View raw config output
          </summary>
          <textarea
            ref={outputRef}
            readOnly
            value={generateOutput()}
            className="mt-2 w-full h-40 text-[10px] font-mono rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] p-2 resize-y"
          />
        </details>
      </div>
    </div>
  )
}
