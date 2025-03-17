import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { AudioPlayerProvider } from "@/components/audio-player-provider";
import { WorkerInitializer } from "@/components/worker-init";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';


const notoSans = Noto_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Digests - Modern RSS Reader",
  description:
    "Subscribe, manage and read your favorite RSS feeds and podcasts",
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
        <link rel="apple-touch-icon" sizes="192x192" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={notoSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          
        >
          <AudioPlayerProvider>
            {/* Initialize worker on client side */}
            <WorkerInitializer />
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 w-full p-4 xs:p-4 md:p-4 xs:max-w-full md:max-w-5xl lg:max-w-full">
                {children}
                <SpeedInsights />
                <Analytics />
              </main>
            </div>
            <Toaster />
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
