import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistSans } from "geist/font";
import Navbar from "../components/layout/Navbar";

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
  return (
    <html lang="en" className={GeistSans.className}>
      <head>
        <Preload />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Your site description" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
