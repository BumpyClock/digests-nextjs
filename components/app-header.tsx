"use client";

import { Home, Rss, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { HeaderShell, type HeaderShellProps } from "@/components/HeaderShell";

export function AppHeader() {
  const pathname = usePathname();
  const isFeedsPage = pathname === "/web";
  const isSettingsPage = pathname === "/web/settings";

  const desktopNavItems = [
    {
      id: "feeds",
      href: "/web",
      label: "Feeds",
      icon: Rss,
      desktopButtonVariant: isFeedsPage ? "default" : "ghost",
    },
    {
      id: "settings",
      href: "/web/settings",
      label: "Settings",
      icon: Settings,
      desktopButtonVariant: isSettingsPage ? "default" : "ghost",
    },
  ] satisfies HeaderShellProps["navItems"];

  const mobileNavItems = [
    { id: "feeds", href: "/web", label: "Feeds", icon: Rss },
    { id: "settings", href: "/web/settings", label: "Settings", icon: Settings },
    {
      id: "home",
      href: "/",
      label: "Back to Home",
      icon: Home,
      mobileClassName: "text-secondary-content",
    },
  ] satisfies HeaderShellProps["navItems"];

  return <HeaderShell brandHref="/web" navItems={desktopNavItems} mobileNavItems={mobileNavItems} />;
}
