"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordVisit } from "@/src/lib/trail";

export default function TrailRecorder() {
  const pathname = usePathname();

  useEffect(() => {
    recordVisit("page:" + pathname);
  }, [pathname]);

  return null;
}
