"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PAGE_MAP: Record<string, string> = {
  "/": "home",
  "/projects": "projects",
  "/blog": "blog",
  "/about": "about",
  "/contact": "contact",
};

function getPageKey(pathname: string): string {
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname];
  if (pathname.startsWith("/blog")) return "blog";
  if (pathname.startsWith("/myInv")) return "myInv";
  return "home";
}

export default function PageTint() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.setAttribute("data-page", getPageKey(pathname));
  }, [pathname]);

  return null;
}
