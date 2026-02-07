"use client";

import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WebSettingsTabs } from "./components/web-settings-tabs";

export default function SettingsPage() {
  return (
    <div className="h-dvh w-full px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
      <div className="flex h-full min-h-0 flex-col gap-3 sm:gap-4">
        <div className="flex shrink-0 items-center justify-between rounded-lg border bg-card/40 p-2.5">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl">Settings</h1>
              <p className="text-muted-foreground text-sm">
                Manage your feeds and application preferences
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/web" aria-label="Back to feeds">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Feeds
            </Link>
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card/20 p-3 sm:p-4">
          <WebSettingsTabs />
        </div>
      </div>
    </div>
  );
}
