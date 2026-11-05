const STORAGE_KEY = "gh-trail-v1";
const SESSION_KEY = "gh-trail-session-v1";
const MAX_ENTRIES = 200;

export type Trail = {
  v: 1;
  visits: Record<string, { n: number; last: number }>;
};

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedSnapshot: Trail | null = null;

function empty(): Trail {
  return { v: 1, visits: {} };
}

export function readTrail(): Trail {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1) return empty();
    return parsed as Trail;
  } catch {
    return empty();
  }
}

function writeTrail(trail: Trail): void {
  try {
    const entries = Object.entries(trail.visits);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => a[1].last - b[1].last);
      trail.visits = Object.fromEntries(entries.slice(entries.length - MAX_ENTRIES));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trail));
  } catch {
    // storage full or blocked
  }
  notify();
}

function notify(): void {
  cachedSnapshot = null;
  listeners.forEach((fn) => {
    try { fn(); } catch { /* */ }
  });
}

export function recordVisit(id: string): void {
  try {
    const sessionSeen = sessionStorage.getItem(SESSION_KEY);
    const seen: string[] = sessionSeen ? JSON.parse(sessionSeen) : [];
    if (seen.includes(id)) return;
    seen.push(id);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(seen));
  } catch {
    // session storage blocked — still record the visit
  }

  const trail = readTrail();
  const existing = trail.visits[id];
  trail.visits[id] = {
    n: (existing?.n ?? 0) + 1,
    last: Date.now(),
  };
  writeTrail(trail);
}

export function visitCount(id: string): number {
  return readTrail().visits[id]?.n ?? 0;
}

export function hasVisits(): boolean {
  return Object.keys(readTrail().visits).length > 0;
}

export function clearTrail(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* */ }
  notify();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) notify();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getSnapshot(): Trail {
  if (!cachedSnapshot) {
    cachedSnapshot = readTrail();
  }
  return cachedSnapshot;
}

const SERVER_TRAIL: Trail = { v: 1, visits: {} };

export function getServerSnapshot(): Trail {
  return SERVER_TRAIL;
}
