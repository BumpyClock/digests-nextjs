"use client"
import { Moon, Sun, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { themes } from "@/lib/theme-definitions"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  // Determine which icon to show based on the current theme
  const isDark = theme === 'flexoki-dark' || 
                theme === 'standard-dark' || 
                theme === 'dracula-dark' || 
                theme === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {isDark ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        
        {/* Light themes */}
        {themes
          .filter(t => t.name.endsWith('-light'))
          .map((t) => (
            <DropdownMenuItem 
              key={t.name} 
              onClick={() => setTheme(t.name)}
              className="flex items-center gap-2"
            >
              <Sun className="h-[1rem] w-[1rem]" />
              {t.displayName}
            </DropdownMenuItem>
          ))
        }
        
        <DropdownMenuSeparator />
        
        {/* Dark themes */}
        {themes
          .filter(t => t.name.endsWith('-dark'))
          .map((t) => (
            <DropdownMenuItem 
              key={t.name} 
              onClick={() => setTheme(t.name)}
              className="flex items-center gap-2"
            >
              <Moon className="h-[1rem] w-[1rem]" />
              {t.displayName}
            </DropdownMenuItem>
          ))
        }
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

