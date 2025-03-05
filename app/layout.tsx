import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { Toaster } from "@/components/ui/toaster"
import { AudioPlayerProvider } from "@/components/audio-player-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Digests - Modern RSS Reader",
  description: "Subscribe, manage and read your favorite RSS feeds and podcasts",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AudioPlayerProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

