import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "../components/layout/Navbar";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: 'Gabriel\'s Site',
    template: '%s - Gabriel\'s Site'
  },
  description: 'Gabriel\'s personal website featuring blog posts, recipes, and projects',
  icons: {
    icon: '/images/favicon_ico/favicon.ico',
    shortcut: '/images/favicon_ico/favicon.ico',
    apple: '/images/favicon_ico/apple-touch-icon.png'
  }
};

// Advanced preload component
const Preload = () => {
  return (
    <>
      {/* Preconnect to critical domains */}
      <link rel="preconnect" href="https://vitals.vercel-insights.com" />
      {/* DNS prefetch for secondary resources */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
    </>
  );
};

// Placeholder loading component with FLIP animation
const Loading = () => (
  <div className="animate-pulse flex space-x-4">
    <div className="flex-1 space-y-6 py-1">
      <div className="h-2 bg-slate-200 rounded"></div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="h-2 bg-slate-200 rounded col-span-2"></div>
          <div className="h-2 bg-slate-200 rounded col-span-1"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SVG code for GitHub icon
  const ghSvgCode = "M12.5.75C6.146.75 1 5.896 1 12.25c0 5.089 3.292 9.387 7.863 10.91.575.101.79-.244.79-.546 0-.273-.014-1.178-.014-2.142-2.889.532-3.636-.704-3.866-1.35-.13-.331-.69-1.352-1.18-1.625-.402-.216-.977-.748-.014-.762.906-.014 1.553.834 1.769 1.179 1.035 1.74 2.688 1.25 3.349.948.1-.747.402-1.25.733-1.538-2.559-.287-5.232-1.279-5.232-5.678 0-1.25.445-2.285 1.178-3.09-.115-.288-.517-1.467.115-3.048 0 0 .963-.302 3.163 1.179.92-.259 1.897-.388 2.875-.388.977 0 1.955.13 2.875.388 2.2-1.495 3.162-1.179 3.162-1.179.633 1.581.23 2.76.115 3.048.733.805 1.179 1.825 1.179 3.09 0 4.413-2.688 5.39-5.247 5.678.417.36.776 1.05.776 2.128 0 1.538-.014 2.774-.014 3.162 0 .302.216.662.79.547C20.709 21.637 24 17.324 24 12.25 24 5.896 18.854.75 12.5.75Z";
  const XSvgCode = "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";
  return (
    <html lang="en">
      <head>
        <Preload />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Your site description" />
        <link rel="icon" href="/images/favicon_ico/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_ico/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon_ico/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/images/favicon_ico/apple-touch-icon.png" />
        <link rel="manifest" href="/images/favicon_ico/site.webmanifest" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </main>
        <Analytics />
        <SpeedInsights />

        <footer >
          <div className="github">
            <p>2025 Made with 🫧 in 🗽 by Gabriel ⦿ </p>
            <Link href="https://github.com/gabe-husain">
              <svg className="w-6 h-6">
                <path d={ghSvgCode}></path>
              </svg>
              <span>gabe.husain</span>
            </Link>
            <span> ⦿ </span>
            <Link href="https://x.com/gab_h333">
                <svg className="w-6 h-6">
                  <path d={XSvgCode}></path>
                </svg>
              <span>@gab_h333</span>
            </Link>
          </div>
        </footer>

      </body>
    </html>
  );
}
