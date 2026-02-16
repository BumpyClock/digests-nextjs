// ABOUTME: Shared modal component with animated overlay and responsive layout.
// ABOUTME: Provides consistent modal structure for reader and podcast detail views.
"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-media-query";
import { motionTokens } from "@/lib/motion-tokens";
import { Logger } from "@/utils/logger";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Optional identifier used by animation/transition systems.
   * Kept optional so existing usages without itemId remain valid.
   */
  itemId?: string;
  /**
   * When true, the browser View Transition API is handling the entrance —
   * skip Framer Motion scale/translate animations to avoid conflict.
   */
  useViewTransition?: boolean;
  /**
   * Optional delay for restoring full backdrop blur during VT mode.
   * If omitted, VT mode keeps a low-cost blur throughout the entrance.
   */
  viewTransitionBackdropSettleMs?: number;
  /**
   * Optional explicit signal that VT-connected reader transition is finished.
   * When set, backdrop blur switches to the full state immediately.
   */
  viewTransitionBackdropSettled?: boolean;
}

/**
 * Renders a modal dialog with smooth animations and blurred backdrop.
 *
 * Features:
 * - 80% opacity backdrop with 40px blur
 * - Smooth scale and fade animations
 * - Centered modal with proper sizing
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  className,
  useViewTransition,
  viewTransitionBackdropSettleMs,
  viewTransitionBackdropSettled,
}: BaseModalProps) {
  const isMobile = useIsMobile();
  // Store the initial mobile state when modal opens to prevent resize issues
  const [initialIsMobile, setInitialIsMobile] = useState<boolean | null>(null);
  const [isBackdropSettled, setIsBackdropSettled] = useState(false);
  const isResizing = useRef(false);

  useEffect(() => {
    if (isOpen) {
      Logger.debug(`[BaseModal] title: ${title}`);
      // Lock the mobile state when modal opens
      if (initialIsMobile === null) {
        setInitialIsMobile(isMobile);
      }
    } else {
      // Reset when modal closes
      setInitialIsMobile(null);
    }
  }, [isOpen, title, isMobile, initialIsMobile]);

  // Use the locked mobile state to prevent modal from closing on resize
  const effectiveIsMobile = initialIsMobile !== null ? initialIsMobile : isMobile;

  // Custom handler for dialog open change that ignores resize events
  const handleOpenChange = (open: boolean) => {
    // Only close if explicitly requested (not due to resize)
    if (!open && !isResizing.current) {
      onClose();
    }
  };

  // Track window resize events
  useEffect(() => {
    if (!isOpen) return;

    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      isResizing.current = true;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        isResizing.current = false;
      }, 200); // Debounce resize flag
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !useViewTransition) {
      setIsBackdropSettled(false);
      return;
    }

    if (typeof viewTransitionBackdropSettled === "boolean") {
      setIsBackdropSettled(viewTransitionBackdropSettled);
      return;
    }

    if (!viewTransitionBackdropSettleMs || viewTransitionBackdropSettleMs <= 0) {
      setIsBackdropSettled(false);
      return;
    }

    setIsBackdropSettled(false);
    const settleTimer = window.setTimeout(() => {
      setIsBackdropSettled(true);
    }, viewTransitionBackdropSettleMs);

    return () => {
      window.clearTimeout(settleTimer);
    };
  }, [isOpen, useViewTransition, viewTransitionBackdropSettleMs, viewTransitionBackdropSettled]);

  const backdropBlurClass = useViewTransition
    ? isBackdropSettled
      ? "backdrop-blur-xl"
      : "backdrop-blur-sm"
    : "backdrop-blur-xl";

  const modalContent = (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Custom backdrop with 40px blur + translucent overlay */}
        <DialogPrimitive.Overlay asChild>
          <motion.div
            className={`fixed inset-0 z-overlay bg-background/45 ${backdropBlurClass}`}
            initial={useViewTransition ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: "easeOut" }}
            style={{ willChange: "opacity" }}
          />
        </DialogPrimitive.Overlay>

        {/* Modal content */}
        <DialogPrimitive.Content asChild>
          <motion.div
            className={
              effectiveIsMobile
                ? "fixed z-modal w-full h-full left-0 top-0 overflow-hidden"
                : "fixed z-modal w-full max-w-[1050px] h-[90vh] left-1/2 top-1/2 mx-4 overflow-hidden"
            }
            initial={
              useViewTransition
                ? false
                : {
                    opacity: 0,
                    scale: 0.9,
                    x: effectiveIsMobile ? 0 : "-50%",
                    y: effectiveIsMobile ? "100%" : "-50%",
                  }
            }
            animate={{
              opacity: 1,
              x: effectiveIsMobile ? 0 : "-50%",
              y: effectiveIsMobile ? 0 : "-50%",
              ...(useViewTransition
                ? {}
                : {
                    scale: 1,
                  }),
            }}
            exit={
              useViewTransition
                ? undefined
                : {
                    opacity: 0,
                    scale: 0.9,
                    x: effectiveIsMobile ? 0 : "-50%",
                    y: effectiveIsMobile ? "100%" : "-50%",
                  }
            }
            transition={{
              ...(useViewTransition
                ? { duration: 0 }
                : {
                    duration: motionTokens.duration.normal,
                    ease: motionTokens.ease.standard,
                  }),
            }}
            style={{ willChange: "transform, opacity" }}
          >
            <div
              className={`relative w-full h-full bg-background shadow-2xl overflow-hidden ${
                effectiveIsMobile ? "rounded-none" : "rounded-3xl"
              } ${className || ""}`}
            >
              {/* Invisible title for accessibility */}
              <DialogPrimitive.Title className="sr-only">
                {title || "Content"}
              </DialogPrimitive.Title>

              {/* Close button */}
              <motion.div
                className="absolute top-4 right-4 z-modal"
                initial={useViewTransition ? false : { opacity: 0, scale: 0.8 }}
                animate={useViewTransition ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                transition={
                  useViewTransition
                    ? { duration: 0 }
                    : { delay: motionTokens.duration.fast, duration: motionTokens.duration.normal }
                }
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="bg-background/90 backdrop-blur-sm hover:bg-background border border-border/20"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </motion.div>

              {/* Content area with proper scrolling */}
              <motion.div
                className="h-full w-full overflow-auto"
                initial={useViewTransition ? false : { opacity: 0, y: 20 }}
                animate={useViewTransition ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={
                  useViewTransition
                    ? { duration: 0 }
                    : { delay: motionTokens.duration.fast, duration: motionTokens.duration.normal }
                }
              >
                {children}
              </motion.div>
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );

  if (useViewTransition) {
    return isOpen ? modalContent : null;
  }

  return <AnimatePresence>{isOpen ? modalContent : null}</AnimatePresence>;
}
