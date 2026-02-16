"use client";

import { useTheme } from "next-themes";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { themes } from "@/lib/theme-definitions";
import { FONT_SIZE_MAX, FONT_SIZE_MIN, useUiPreferencesStore } from "@/store/useUiPreferencesStore";

// Keep theme select trigger aligned in the appearance settings layout.
const SELECT_TRIGGER_WIDTH_CLASS = "w-select-trigger";

export const AppearanceTab = memo(function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const {
    animationsEnabled,
    setAnimationsEnabled,
    compactView,
    setCompactView,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
  } = useUiPreferencesStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how Digests looks and feels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="theme-select">Theme</Label>
            <p className="text-body-small text-secondary-content">Choose your preferred theme</p>
          </div>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className={SELECT_TRIGGER_WIDTH_CLASS} id="theme-select">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              {themes.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="animations">Animations</Label>
            <p className="text-body-small text-secondary-content">
              Enable smooth transitions and animations
            </p>
          </div>
          <Switch
            id="animations"
            checked={animationsEnabled}
            onCheckedChange={setAnimationsEnabled}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="compact-view">Compact View</Label>
            <p className="text-body-small text-secondary-content">
              Display more items in a condensed layout
            </p>
          </div>
          <Switch id="compact-view" checked={compactView} onCheckedChange={setCompactView} />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="font-size">Font Size</Label>
            <p className="text-body-small text-secondary-content">
              Adjust the text size for better readability ({fontSize + 1}/{FONT_SIZE_MAX + 1})
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={fontSize <= FONT_SIZE_MIN}
              onClick={decreaseFontSize}
              title="Decrease font size"
            >
              A-
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={fontSize >= FONT_SIZE_MAX}
              onClick={increaseFontSize}
              title="Increase font size"
            >
              A+
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
