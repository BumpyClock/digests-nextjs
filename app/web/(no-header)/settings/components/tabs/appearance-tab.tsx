"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";
import { themes } from "@/lib/theme-definitions";
import { useUiPreferencesStore } from "@/store/useUiPreferencesStore";

export const AppearanceTab = memo(function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const { animationsEnabled, setAnimationsEnabled } = useUiPreferencesStore();

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
            <SelectTrigger className="w-[180px]" id="theme-select">
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
          <Switch
            id="compact-view"
            disabled
            aria-disabled={true}
            title="TODO: compact view preference wiring"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="font-size">Font Size</Label>
            <p className="text-body-small text-secondary-content">
              Adjust the text size for better readability
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled title="Decrease font size">
              A-
            </Button>
            <Button variant="outline" size="sm" disabled title="Increase font size">
              A+
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
