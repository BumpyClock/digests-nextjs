// ABOUTME: Shared modal component with animated overlay and responsive layout.
// ABOUTME: Provides consistent modal structure for reader and podcast detail views.
"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { Logger } from "@/utils/logger";
import { Dialog } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useIsMobile } from "@/hooks/use-media-query";

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
}

/**
 * Renders a modal dialog with smooth animations and blurred backdrop.
 *
 * Features:
 * - 80% opacity backdrop with 40px blur
 * - Smooth scale and fade animations
 * - Centered modal with proper sizing
 */
export function BaseModal({ isOpen, onClose, title, children, className }: BaseModalProps) {
  const isMobile = useIsMobile();
  // Store the initial mobile state when modal opens to prevent resize issues
  const [initialIsMobile, setInitialIsMobile] = useState<boolean | null>(null);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogPrimitive.Portal>
            {/* Custom backdrop with blur and opacity (smaller blur for performance) */}
            <DialogPrimitive.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ willChange: "opacity" }}
              />
            </DialogPrimitive.Overlay>

            {/* Modal content */}
            <DialogPrimitive.Content asChild>
              <motion.div
                className={
                  effectiveIsMobile
                    ? "fixed z-50 w-full h-full left-0 top-0 overflow-hidden"
                    : "fixed z-50 w-full max-w-[1050px] h-[90vh] left-1/2 top-1/2 mx-4 overflow-hidden"
                }
                initial={{
                  opacity: 0,
                  scale: 0.9,
                  x: effectiveIsMobile ? 0 : "-50%",
                  y: effectiveIsMobile ? "100%" : "-50%",
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: effectiveIsMobile ? 0 : "-50%",
                  y: effectiveIsMobile ? 0 : "-50%",
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  x: effectiveIsMobile ? 0 : "-50%",
                  y: effectiveIsMobile ? "100%" : "-50%",
                }}
                transition={{
                  duration: 0.25,
                  ease: [0.16, 1, 0.3, 1], // Custom ease for smooth feel
                }}
                style={{ willChange: "transform, opacity" }}
              >
                <div
                  className={`relative w-full h-full bg-background shadow-2xl overflow-hidden ${
                    effectiveIsMobile ? "rounded-none" : "rounded-[32px]"
                  } ${className || ""}`}
                >
                  {/* Invisible title for accessibility */}
                  <DialogPrimitive.Title className="sr-only">
                    {title || "Content"}
                  </DialogPrimitive.Title>

                  {/* Close button */}
                  <motion.div
                    className="absolute top-4 right-4 z-50"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.25 }}
                  >
                    {children}
                  </motion.div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
