"use client"

import type React from "react"
import { useEffect } from "react"
import { Logger } from "@/utils/logger"
import { Dialog } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useIsMobile } from "@/hooks/use-media-query"

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
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
  const isMobile = useIsMobile()
  
  useEffect(() => {
    if (isOpen) {
      Logger.debug(`[BaseModal] title: ${title}`)
    }
  }, [isOpen, title])

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogPrimitive.Portal>
            {/* Custom backdrop with blur and opacity */}
            <DialogPrimitive.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[40px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </DialogPrimitive.Overlay>
            
            {/* Modal content */}
            <DialogPrimitive.Content asChild>
              <motion.div
                className={isMobile 
                  ? "fixed z-50 w-full h-full left-0 top-0 overflow-hidden"
                  : "fixed z-50 w-full max-w-[1050px] h-[90vh] left-1/2 top-1/2 mx-4 overflow-hidden"
                }
                initial={{ 
                  opacity: 0, 
                  scale: 0.9,
                  x: isMobile ? 0 : "-50%",
                  y: isMobile ? "100%" : "-50%"
                }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: isMobile ? 0 : "-50%",
                  y: isMobile ? 0 : "-50%"
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.9,
                  x: isMobile ? 0 : "-50%",
                  y: isMobile ? "100%" : "-50%"
                }}
                transition={{ 
                  duration: 0.25, 
                  ease: [0.16, 1, 0.3, 1] // Custom ease for smooth feel
                }}
              >
                <div className={`relative w-full h-full bg-background shadow-2xl overflow-hidden ${
                  isMobile ? "rounded-none" : "rounded-[32px]"
                } ${className || ""}`}>
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
  )
}

