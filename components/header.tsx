"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Rss, Headphones, BookMarked } from "lucide-react";
import logo192 from "@/public/logo192.png";
import Image from "next/image";

/**
 * Header component for the landing page and non-app routes.
 * For /web routes, see AppHeader component.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-sticky w-full max-w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 px-4">
      <div className="container flex h-14 items-center mx-auto">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Image src={logo192} alt="Digests" className="h-6 w-6" />
            <span className="text-subtitle">Digests</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/pages/privacy-policy">
              <Button variant="ghost">Privacy Policy</Button>
            </Link>
            <Link href="/#features">
              <Button variant="ghost">Features</Button>
            </Link>
            <Link href="/#download">
              <Button variant="ghost">Download</Button>
            </Link>
            <Link href="/web">
              <Button>Launch App</Button>
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
                <nav className="grid gap-6 text-title">
                  <Link href="/" className="flex items-center gap-2 text-title">
                    <Rss className="h-5 w-5" />
                    <span>Digests</span>
                  </Link>
                  <div className="grid gap-3">
                    <Link href="/" className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Home
                    </Link>
                    <Link href="/#features" className="flex items-center gap-2">
                      <Rss className="h-5 w-5" />
                      Features
                    </Link>
                    <Link href="/#download" className="flex items-center gap-2">
                      <Headphones className="h-5 w-5" />
                      Download
                    </Link>
                    <Link href="/web" className="flex items-center gap-2">
                      <BookMarked className="h-5 w-5" />
                      Launch App
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
