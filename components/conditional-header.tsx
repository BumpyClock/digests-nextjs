"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";

export function ConditionalHeader() {
  const pathname = usePathname();

  // Don't render the landing header on /web routes
  // The /web routes have their own AppHeader in the web layout
  if (pathname?.startsWith("/web")) {
    return null;
  }

  return <Header />;
}
