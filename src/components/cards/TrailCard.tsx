"use client";

import { useCallback } from "react";
import { recordVisit } from "@/src/lib/trail";
import { useVisitCount, wearLevel } from "@/src/hooks/useTrail";

interface TrailCardProps {
  cardId: string;
  children: React.ReactNode;
}

export default function TrailCard({ cardId, children }: TrailCardProps) {
  const count = useVisitCount("card:" + cardId);
  const wear = wearLevel(count);

  const handleClick = useCallback(
    () => {
      recordVisit("card:" + cardId);
    },
    [cardId]
  );

  const handleAuxClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) recordVisit("card:" + cardId);
    },
    [cardId]
  );

  return (
    <div
      data-wear={wear}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      className="trail-card-wrap"
    >
      {children}
    </div>
  );
}
