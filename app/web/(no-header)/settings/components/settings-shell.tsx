"use client";

import { ArrowLeft, Settings, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";

type SettingsShellVariant = "page" | "modal";

interface SettingsShellProps {
  variant: SettingsShellVariant;
  children: ReactNode;
  backTo?: string;
}

const SETTINGS_VARIANTS: Record<
  SettingsShellVariant,
  { headerClassName: string; containerClassName: string; contentClassName: string }
> = {
  page: {
    containerClassName: "flex h-full min-h-0 flex-col gap-3 sm:gap-4",
    headerClassName: "flex shrink-0 items-center justify-between rounded-lg border bg-card/40 p-2.5",
    contentClassName: "flex min-h-0 flex-1 flex-col rounded-lg border bg-card/20 p-3 sm:p-4",
  },
  modal: {
    containerClassName: "flex h-full min-h-0 flex-col",
    headerClassName: "flex shrink-0 items-center justify-between border-b bg-card/40 px-4 py-3",
    contentClassName: "min-h-0 flex-1 overflow-auto",
  },
};

export function SettingsShell({ variant, children, backTo = "/web" }: SettingsShellProps) {
  const variantStyles = SETTINGS_VARIANTS[variant];

  return (
    <div className={variantStyles.containerClassName}>
      <div className={variantStyles.headerClassName}>
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-secondary-content" />
          {variant === "page" ? (
            <div>
              <h1 className="text-title-large text-primary-content">Settings</h1>
              <p className="text-body-small text-secondary-content">
                Manage your feeds and application preferences
              </p>
            </div>
          ) : (
            <p className="text-label text-primary-content">Settings</p>
          )}
        </div>

        {variant === "page" ? (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={backTo} aria-label="Back to feeds">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Feeds
            </Link>
          </Button>
        ) : (
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close settings dialog"
              title="Close settings dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        )}
      </div>

      <div className={variantStyles.contentClassName}>{children}</div>
    </div>
  );
}

