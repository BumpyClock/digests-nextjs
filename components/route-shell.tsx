"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";

export function RouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWebRoute = pathname?.startsWith("/web");
  const isWebHome = pathname === "/web";

  return (
    <div
      className={
        isWebHome ? "flex min-h-dvh flex-col overflow-x-clip" : "flex min-h-screen flex-col"
      }
    >
      {!isWebRoute && <Header />}
      <main
        className={
          isWebHome
            ? "flex-1 w-full p-0"
            : "flex-1 w-full p-4 xs:p-4 md:p-4 xs:max-w-full md:max-w-5xl lg:max-w-full"
        }
      >
        {children}
      </main>
    </div>
  );
}
