"use client";
import { Moon, Sun, Palette, Check } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { themes } from "@/lib/theme-definitions";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  // Extract color scheme from theme name
  const getCurrentScheme = () => {
    if (!theme) return null;
    if (theme === "system") return null;

    // Extract the scheme part (before the -light or -dark suffix)
    const schemePart = theme.split("-")[0];
    return schemePart;
  };

  // Determine if the theme is dark
  const isDark = theme ? theme.includes("-dark") || theme === "dark" : false;
  const isLight = theme ? theme.includes("-light") || theme === "light" : false;
  const isSystem = theme === "system";

  // Current color scheme
  const currentScheme = getCurrentScheme();

  // Function to set theme based on mode and scheme
  const setThemeWithScheme = (mode: "light" | "dark", scheme: string) => {
    setTheme(`${scheme}-${mode}`);
  };

  // Get available color schemes (unique scheme names without mode suffix)
  const colorSchemes = Array.from(
    new Set(themes.map((t) => t.name.split("-")[0])),
  );

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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Main mode options */}
        <DropdownMenuItem
          onClick={() =>
            currentScheme
              ? setThemeWithScheme("light", currentScheme)
              : setTheme("light")
          }
          className="flex justify-between items-center"
        >
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </div>
          {isLight && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() =>
            currentScheme
              ? setThemeWithScheme("dark", currentScheme)
              : setTheme("dark")
          }
          className="flex justify-between items-center"
        >
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span>Dark</span>
          </div>
          {isDark && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex justify-between items-center"
        >
          <span>System</span>
          {isSystem && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Color schemes accordion */}
        <DropdownMenuGroup className="px-2 py-1">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="color-schemes" className="border-b-0">
              <AccordionTrigger className="py-1.5 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span>Color Scheme</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1">
                {colorSchemes.map((scheme) => {
                  // Capitalize first letter of scheme
                  const displayName =
                    scheme.charAt(0).toUpperCase() + scheme.slice(1);
                  const isCurrentScheme = currentScheme === scheme;

                  return (
                    <DropdownMenuItem
                      key={scheme}
                      onClick={() =>
                        setThemeWithScheme(isDark ? "dark" : "light", scheme)
                      }
                      className="flex justify-between items-center pl-6"
                    >
                      <span>{displayName}</span>
                      {isCurrentScheme && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
