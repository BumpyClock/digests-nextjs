"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Settings, Rss, Home } from "lucide-react";
import logo192 from "@/public/logo192.png";
import Image from "next/image";

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-sticky w-full max-w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 px-4">
      <div className="container flex h-14 items-center mx-auto">
        <div className="mr-4 flex">
          <Link href="/web" className="flex items-center space-x-2">
            <Image src={logo192} alt="Digests" className="h-6 w-6" />
            <span className="font-medium">Digests</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/web">
              <Button variant={pathname === "/web" ? "default" : "ghost"}>
                <Rss className="h-4 w-4 mr-2" />
                Feeds
              </Button>
            </Link>
            <Link href="/web/settings">
              <Button variant={pathname === "/web/settings" ? "default" : "ghost"}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </nav>
          <div className="flex items-center space-x-2">
            <ModeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="grid gap-6 text-lg font-medium">
                  <Link href="/web" className="flex items-center gap-2 text-lg font-semibold">
                    <Rss className="h-5 w-5" />
                    <span>Digests</span>
                  </Link>
                  <div className="grid gap-3">
                    <Link href="/web" className="flex items-center gap-2">
                      <Rss className="h-5 w-5" />
                      Feeds
                    </Link>
                    <Link href="/web/settings" className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Settings
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-muted-foreground">
                      <Home className="h-5 w-5" />
                      Back to Home
                    </Link>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
