// ABOUTME: Shared adaptive container that switches between modal (mobile) and pane (desktop)
// layouts for detail views.
"use client";

import { BaseModal } from "@/components/base-modal";
import { DetailPaneShell } from "@/components/Feed/shared/DetailPaneShell";
import { useIsMobile } from "@/hooks/use-media-query";
import type { ReactNode } from "react";

type AdaptiveDetailMode = "adaptive" | "modal" | "pane";

interface AdaptiveDetailContainerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  itemId?: string;
  className?: string;
  mode?: AdaptiveDetailMode;
  useViewTransition?: boolean;
  viewTransitionBackdropSettleMs?: number;
  viewTransitionBackdropSettled?: boolean;
}

export function AdaptiveDetailContainer({
  isOpen,
  onClose,
  children,
  title,
  itemId,
  className,
  mode = "adaptive",
  useViewTransition,
  viewTransitionBackdropSettleMs,
  viewTransitionBackdropSettled,
}: AdaptiveDetailContainerProps) {
  const isMobile = useIsMobile();

  if (!isOpen) {
    return null;
  }

  const useModal =
    mode === "modal" || (mode === "adaptive" && isMobile);

  if (useModal) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        itemId={itemId}
        className={className}
        useViewTransition={useViewTransition}
        viewTransitionBackdropSettleMs={viewTransitionBackdropSettleMs}
        viewTransitionBackdropSettled={viewTransitionBackdropSettled}
      >
        {children}
      </BaseModal>
    );
  }

  return <DetailPaneShell className={className}>{children}</DetailPaneShell>;
}

