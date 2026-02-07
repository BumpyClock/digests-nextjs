"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AccountTab } from "./tabs/account-tab";
import { ApiSettingsTab } from "./tabs/api-settings-tab";
import { AppearanceTab } from "./tabs/appearance-tab";
import { FeedsTab } from "./tabs/feeds-tab";

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
      <TabsList className={cn("mb-4 grid w-full grid-cols-4", tabsListClassName)}>
        <TabsTrigger value="feeds">Feeds</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="api">API</TabsTrigger>
      </TabsList>

      <div className={cn("min-h-0 flex-1 overflow-auto", contentWrapperClassName)}>
        <TabsContent value="feeds" className="mt-0 h-full">
          <FeedsTab />
        </TabsContent>

        <TabsContent value="appearance" className="mt-0">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="account" className="mt-0">
          <AccountTab />
        </TabsContent>

        <TabsContent value="api" className="mt-0">
          <ApiSettingsTab />
        </TabsContent>
      </div>
    </Tabs>
  );
}
