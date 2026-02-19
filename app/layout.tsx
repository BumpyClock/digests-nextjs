import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import "./generated-themes.css";
import "./generated-design-tokens.css";
import "./typography.css";
import "../public/prism-tomorrow.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AudioPlayer } from "@/components/AudioPlayer";
import { QueryProvider } from "@/components/providers/query-provider";
import { RouteShell } from "@/components/route-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { AmbilightFilterDefs } from "@/components/ui/AmbilightFilterDefs";
import { Toaster } from "@/components/ui/sonner";
import { WorkerInitializer } from "@/components/worker-init";
import { FeedAnimationProvider } from "@/contexts/FeedAnimationContext";

const notoSans = Noto_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Digests - Modern RSS Reader",
  description: "Subscribe, manage and read your favorite RSS feeds and podcasts",
  icons: {
    icon: "/logo192.png",
    shortcut: "/logo192.png",
    apple: "/logo192.png",
    other: {
      rel: "icon",
      url: "/logo192.png",
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Digests",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Add manifest.json for PWA */}
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="apple-touch-icon" sizes="192x192" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#43A1AB" />
      </head>
      <body className={notoSans.className}>
        <QueryProvider>
          <ThemeProvider>
            <FeedAnimationProvider>
              <WorkerInitializer />
              <AmbilightFilterDefs saturation={1} spread={2} blur={8} />
              <RouteShell>
                {children}
                <SpeedInsights />
                <Analytics />
              </RouteShell>
              <AudioPlayer />
              <Toaster />
            </FeedAnimationProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
