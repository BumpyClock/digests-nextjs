"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { themes } from "@/lib/theme-definitions"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const themeNames = themes.map(t => t.name);
  
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      themes={themeNames}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

