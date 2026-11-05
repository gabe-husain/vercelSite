"use client";

import { useState, useCallback } from "react";
import { useHasVisits } from "@/src/hooks/useTrail";
import { clearTrail } from "@/src/lib/trail";

export default function TrailFooter() {
  const has = useHasVisits();
  const [swept, setSwept] = useState(false);

  const handleClear = useCallback(() => {
    clearTrail();
    setSwept(true);
    setTimeout(() => setSwept(false), 2000);
  }, []);

  if (!has && !swept) return null;

  return (
    <div className="trail-footer">
      <button
        onClick={handleClear}
        className="trail-footer-btn"
        aria-label="Clear browsing trail"
      >
        <em>{swept ? "swept" : "leave no trace"}</em>
      </button>
    </div>
  );
}
