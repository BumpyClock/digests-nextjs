"use client";

import { BookMarked, Headphones, Home, Rss } from "lucide-react";
import { HeaderShell, type HeaderShellProps } from "@/components/HeaderShell";

/**
 * Header component for the landing page and non-app routes.
 * For /web routes, see AppHeader component.
 */
export function Header() {
  const navItems = [
    { id: "privacy-policy", href: "/pages/privacy-policy", label: "Privacy Policy" },
    { id: "features", href: "/#features", label: "Features" },
    { id: "download", href: "/#download", label: "Download" },
    { id: "launch-app", href: "/web", label: "Launch App", desktopButtonVariant: "default" },
  ] satisfies HeaderShellProps["navItems"];

  const mobileNavItems = [
    { id: "home", href: "/", label: "Home", icon: Home },
    { id: "features", href: "/#features", label: "Features", icon: Rss },
    { id: "download", href: "/#download", label: "Download", icon: Headphones },
    { id: "launch-app", href: "/web", label: "Launch App", icon: BookMarked },
  ] satisfies HeaderShellProps["navItems"];

  return <HeaderShell brandHref="/" navItems={navItems} mobileNavItems={mobileNavItems} />;
}
