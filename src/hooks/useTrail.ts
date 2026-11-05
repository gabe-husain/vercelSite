"use client";

import { useState, useEffect } from "react";
import {
  type Trail,
  subscribe,
  readTrail,
} from "@/src/lib/trail";

const EMPTY: Trail = { v: 1, visits: {} };

export function useTrail(): Trail {
  const [trail, setTrail] = useState<Trail>(EMPTY);

  useEffect(() => {
    setTrail(readTrail());
    return subscribe(() => setTrail(readTrail()));
  }, []);

  return trail;
}

export function useVisitCount(id: string): number {
  const trail = useTrail();
  return trail.visits[id]?.n ?? 0;
}

export function useHasVisits(): boolean {
  const trail = useTrail();
  return Object.keys(trail.visits).length > 0;
}

export function wearLevel(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}
