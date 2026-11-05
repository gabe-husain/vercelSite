"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useTrail } from "@/src/hooks/useTrail";
import { promotedItems, type Promoted } from "@/src/lib/promoted";
import { recordVisit } from "@/src/lib/trail";

function dailyHash(dateStr: string, id: string): number {
  let h = 0;
  const s = dateStr + id;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function Bikan() {
  const trail = useTrail();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const picked = useMemo<Promoted | null>(() => {
    const candidates = promotedItems.filter(
      (p) => (trail.visits[p.id]?.n ?? 0) === 0
    );
    if (candidates.length === 0) return null;

    const maxWeight = Math.max(...candidates.map((c) => c.weight));
    const top = candidates.filter((c) => c.weight === maxWeight);

    const today = new Date().toISOString().slice(0, 10);
    const idx = dailyHash(today, top[0].id) % top.length;
    return top[idx];
  }, [trail]);

  if (!mounted || !picked) return null;

  const isExternal = picked.href.startsWith("http");

  return (
    <div className="bikan-container" style={{ opacity: mounted ? 1 : 0 }}>
      <span className="bikan-label" lang="zh" title="cānguān — go take a look">
        必看
      </span>
      <Link
        href={picked.href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="bikan-card tinted"
        onClick={() => recordVisit(picked.id)}
        onAuxClick={(e) => {
          if (e.button === 1) recordVisit(picked.id);
        }}
      >
        <span className="bikan-title">{picked.title}</span>
        <span className="bikan-blurb">{picked.blurb}</span>
      </Link>
    </div>
  );
}
