export type AlmanacArticle = {
  title: string;
  url: string;
  excerpt: string;
  date: string;
};

export type FarmersCornerData = {
  lead: AlmanacArticle | null;
  upcoming: { date: string; title: string; url: string }[];
  moonPhase: string | null;
  daysUntilSeason: { days: number; season: string } | null;
};

const FARMERS = "https://www.farmersalmanac.com/";
const POSTS_API =
  FARMERS +
  "wp-json/wp/v2/posts?_fields=date,modified,link,title,excerpt&";
const SEASONAL =
  POSTS_API + "categories=64,177,6664,6691&per_page=5&orderby=modified";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[^;]+;/g, (m) => {
      const el =
        typeof document !== "undefined"
          ? document.createElement("span")
          : null;
      if (el) {
        el.innerHTML = m;
        return el.textContent || "";
      }
      return m.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    })
    .replace(/\s+/g, " ")
    .trim();
}

function trimExcerpt(text: string, limit = 160): string {
  const clean = stripHtml(text).replace(/\[…\]|Read more\s*$/i, "…").trim();
  if (clean.length <= limit) return clean;
  return clean.slice(0, limit).trimEnd() + "…";
}

const SEASONS: [number, number, string][] = [
  [3, 20, "spring"],
  [6, 21, "summer"],
  [9, 22, "autumn"],
  [12, 21, "winter"],
];

function nextSeason(
  day: Date
): { days: number; season: string } {
  const today = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    for (const [m, d, name] of SEASONS) {
      const start = new Date(year, m - 1, d);
      if (start > today) {
        const diff = Math.ceil(
          (start.getTime() - today.getTime()) / 86_400_000
        );
        return { days: diff, season: name };
      }
    }
  }
  return { days: 0, season: "spring" };
}

function moonPhase(now: Date): string {
  const t =
    (now.getTime() / 1000 - Date.UTC(2000, 0, 1, 12) / 1000) /
    86400 /
    36525;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const d = rad(297.8502 + 445267.1115 * t);
  const m = rad(357.5291 + 35999.0503 * t);
  const mp = rad(134.9634 + 477198.8676 * t);
  let elong =
    (297.8502 +
      445267.1115 * t +
      6.289 * Math.sin(mp) -
      2.1 * Math.sin(m) +
      1.274 * Math.sin(2 * d - mp) +
      0.658 * Math.sin(2 * d)) %
    360;
  if (elong < 0) elong += 360;
  const lit = Math.round((100 * (1 - Math.cos(rad(elong)))) / 2);

  const phases: [number, string, string][] = [
    [12, "new moon", "\u{1F311}"],
    [78, "waxing crescent", "\u{1F312}"],
    [102, "first quarter", "\u{1F313}"],
    [168, "waxing gibbous", "\u{1F314}"],
    [192, "full moon", "\u{1F315}"],
    [258, "waning gibbous", "\u{1F316}"],
    [282, "third quarter", "\u{1F317}"],
    [348, "waning crescent", "\u{1F318}"],
    [361, "new moon", "\u{1F311}"],
  ];

  for (const [limit, name, glyph] of phases) {
    if (elong < limit) return `${glyph} ${name}, ${lit}% lit`;
  }
  return `\u{1F311} new moon`;
}

export async function fetchFarmersCornerData(): Promise<FarmersCornerData> {
  const now = new Date();
  const result: FarmersCornerData = {
    lead: null,
    upcoming: [],
    moonPhase: moonPhase(now),
    daysUntilSeason: nextSeason(now),
  };

  try {
    const resp = await fetch(SEASONAL, {
      next: { revalidate: 86400 },
      headers: { "User-Agent": "gabriels-site/1.0 (personal site)" },
    });
    if (resp.ok) {
      const posts = await resp.json();
      if (Array.isArray(posts) && posts.length > 0) {
        const p = posts[0];
        result.lead = {
          title: stripHtml(p.title?.rendered || ""),
          url: p.link || "",
          excerpt: trimExcerpt(p.excerpt?.rendered || ""),
          date: (p.date || "").slice(0, 10),
        };
      }
    }
  } catch {
    // Almanac is optional
  }

  try {
    const pageResp = await fetch(FARMERS, {
      next: { revalidate: 86400 },
      headers: { "User-Agent": "gabriels-site/1.0 (personal site)" },
    });
    if (pageResp.ok) {
      const html = await pageResp.text();
      const upcomingRe = new RegExp(
        '<li class="falm-upcoming__item[^"]*">(.*?)</li>',
        "gs"
      );
      let match;
      while ((match = upcomingRe.exec(html)) !== null) {
        const item = match[1];
        const linkMatch = item.match(
          /href="(https:\/\/www\.farmersalmanac\.com\/[^"]+)"/
        );
        const dateMatch = item.match(
          /<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/
        );
        const titleMatch = item.match(
          new RegExp('falm-upcoming__title">(.*?)</span>', "s")
        );
        if (linkMatch && dateMatch && titleMatch) {
          const itemDate = dateMatch[1];
          if (itemDate >= now.toISOString().slice(0, 10)) {
            result.upcoming.push({
              date: itemDate,
              title: stripHtml(titleMatch[1]),
              url: linkMatch[1],
            });
          }
        }
      }
      result.upcoming = result.upcoming.slice(0, 4);
    }
  } catch {
    // Front page scrape is optional
  }

  return result;
}

export const gabSitePosts: AlmanacArticle[] = [
  {
    title: "Oh So Many",
    url: "https://gab-site.vercel.app/posts/Oh-So-Many",
    excerpt: "Gabriel's thoughts on the overwhelming abundance of things...",
    date: "2025-01-09",
  },
  {
    title: "Wonderful Reads",
    url: "https://gab-site.vercel.app/posts/wonderful-reads",
    excerpt: "A curated collection of articles and reads worth your time.",
    date: "2025-01-04",
  },
  {
    title: "Amazing Blogs",
    url: "https://gab-site.vercel.app/posts/amazing-blogs",
    excerpt: "Blogs that inspire, inform, and entertain.",
    date: "2025-01-01",
  },
];
