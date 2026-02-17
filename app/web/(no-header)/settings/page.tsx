"use client";

import { WebSettingsTabs } from "./components/web-settings-tabs";
import { SettingsShell } from "./components/settings-shell";

export default function SettingsPage() {
  return (
    <div className="h-dvh w-full px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
      <SettingsShell variant="page">
        <WebSettingsTabs />
      </SettingsShell>
    </div>
  );
}
