"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContentDetailShellProps {
  title: string;
  titleClassName?: string;
  onBack?: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function ContentDetailShell({
  title,
  titleClassName,
  onBack,
  children,
  className,
  bodyClassName,
}: ContentDetailShellProps) {
  const router = useRouter();

  const handleBack = onBack ?? (() => router.back());

  return (
    <div className={cn("container max-w-3xl py-8", className)}>
      <div className={cn("mb-6", bodyClassName)}>
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className={cn("mb-4 text-display-small text-primary-content", titleClassName)}>
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

interface ContentDetailToolbarProps {
  metadata: ReactNode;
  actions?: ReactNode;
  className?: string;
  metadataClassName?: string;
  actionsClassName?: string;
}

export function ContentDetailToolbar({
  metadata,
  actions,
  className,
  metadataClassName,
  actionsClassName,
}: ContentDetailToolbarProps) {
  return (
    <div className={cn("mb-6 flex items-center justify-between", className)}>
      <div className={cn("flex items-center space-x-2", metadataClassName)}>{metadata}</div>
      {actions ? <div className={cn("flex space-x-2", actionsClassName)}>{actions}</div> : null}
    </div>
  );
}
