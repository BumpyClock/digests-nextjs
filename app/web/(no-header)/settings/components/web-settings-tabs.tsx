"use client";

import type { ComponentType } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AccountTab } from "./tabs/account-tab";
import { ApiSettingsTab } from "./tabs/api-settings-tab";
import { AppearanceTab } from "./tabs/appearance-tab";
import { FeedsTab } from "./tabs/feeds-tab";

const SETTINGS_TABS: Array<{
  value: string;
  label: string;
  Content: ComponentType;
}> = [
  { value: "feeds", label: "Feeds", Content: FeedsTab },
  { value: "appearance", label: "Appearance", Content: AppearanceTab },
  { value: "account", label: "Account", Content: AccountTab },
  { value: "api", label: "API", Content: ApiSettingsTab },
];

interface WebSettingsTabsProps {
  className?: string;
  tabsListClassName?: string;
  contentWrapperClassName?: string;
}

export function WebSettingsTabs({
  className,
  tabsListClassName,
  contentWrapperClassName,
}: WebSettingsTabsProps) {
  return (
    <Tabs defaultValue="feeds" className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="sticky top-0 z-10 bg-background px-3 pt-3 sm:px-4 sm:pt-4">
        <TabsList className={cn("mb-4 grid w-full grid-cols-4", tabsListClassName)}>
          {SETTINGS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-auto px-3 pb-4 sm:px-4", contentWrapperClassName)}>
        {SETTINGS_TABS.map(({ value, Content }) => (
          <TabsContent key={value} value={value} className="mt-0">
            <Content />
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
