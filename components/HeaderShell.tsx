"use client";

import { Menu, Rss } from "lucide-react";
import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import logo192 from "@/public/logo192.png";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type HeaderLink = {
  id: string;
  href: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  desktopButtonVariant?: "default" | "ghost";
  mobileClassName?: string;
};

export interface HeaderShellProps {
  brandHref: string;
  navItems: ReadonlyArray<HeaderLink>;
  mobileNavItems?: ReadonlyArray<HeaderLink>;
  mobileBrandIcon?: ComponentType<{ className?: string }>;
  mobileBrandLabel?: string;
}

export function HeaderShell({
  brandHref,
  navItems,
  mobileNavItems = navItems,
  mobileBrandIcon: MobileBrandIcon = Rss,
  mobileBrandLabel = "Digests",
}: HeaderShellProps) {
  return (
    <header className="sticky top-0 z-sticky w-full max-w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 px-4">
      <div className="container flex h-14 items-center mx-auto">
        <div className="mr-4 flex">
          <Link href={brandHref} className="flex items-center space-x-2">
            <Image src={logo192} alt="Digests" className="h-6 w-6" />
            <span className="text-subtitle">{mobileBrandLabel}</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link key={item.id} href={item.href}>
                <Button variant={item.desktopButtonVariant ?? "ghost"}>
                  {item.icon ? <item.icon className="h-4 w-4 mr-2" /> : null}
                  {item.label}
                </Button>
              </Link>
            ))}
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
                  <Link href={brandHref} className="flex items-center gap-2">
                    <MobileBrandIcon className="h-5 w-5" />
                    <span>{mobileBrandLabel}</span>
                  </Link>
                  <div className="grid gap-3">
                    {mobileNavItems.map((item) => (
                      <Link
                        key={`mobile-${item.id}`}
                        href={item.href}
                        className={["flex items-center gap-2", item.mobileClassName]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {item.icon ? <item.icon className="h-5 w-5" /> : null}
                        <span>{item.label}</span>
                      </Link>
                    ))}
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
