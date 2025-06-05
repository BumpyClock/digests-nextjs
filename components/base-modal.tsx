"use client"

import type React from "react"
import {  useEffect } from "react"
import { Logger } from "@/utils/logger"
import { Dialog, DialogContent, DialogTitle, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useFeedAnimation } from "@/contexts/FeedAnimationContext"

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  initialPosition: { x: number; y: number; width: number; height: number }
  children: React.ReactNode
  className?: string
  itemId?: string
}

/**
 * Renders a modal dialog with customizable content, title, and initial position.
 *
 * The modal supports responsive styling, an optional title, and a close button. The initial position and scale can be set via the {@link initialPosition} prop.
 *
 * @param initialPosition - Specifies the initial x and y coordinates, width, and height for modal placement and scaling.
 */
export function BaseModal({ isOpen, onClose, title, initialPosition, children, className, itemId }: BaseModalProps) {
  const { setActiveItemId, animationEnabled } = useFeedAnimation()

  useEffect(() => {
    if (isOpen) {
      Logger.debug(`[BaseModal] title: ${title}`)
    }
  }, [isOpen, title])

  const handleClose = () => {
    if (animationEnabled && itemId) {
      setActiveItemId(null)
      // Delay actual close to allow exit animation
      setTimeout(onClose, 200)
    } else {
      onClose()
    }
  }

  const modalStyle = {
    "--initial-x": `${initialPosition.x}px`,
    "--initial-y": `${initialPosition.y}px`,
    "--initial-scale": `${initialPosition.width / window.innerWidth}`,
  } as React.CSSProperties

  // Always use the same structure, let MotionConfig handle animation preferences
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-3xl z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>
            
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed inset-4 md:inset-8 lg:inset-12 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="relative w-full max-w-[1050px] mx-auto h-full">
                  <motion.div
                    layoutId={animationEnabled && itemId ? `card-${itemId}` : undefined}
                    className={`
                      bg-background rounded-[32px] h-full overflow-hidden shadow-2xl
                      w-full
                      ${className || ""}
                    `}
                    transition={{
                      layout: { type: "spring", stiffness: 800, damping: 70 },
                    }}
                  >
                    <DialogTitle className="sr-only">{title || "Content"}</DialogTitle>
                    <div className="h-full w-full overflow-hidden">
                      {children}
                    </div>
                  </motion.div>
                  {/* Close button positioned outside the animated container */}
                  <motion.div 
                    className="absolute top-4 right-4 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleClose}
                      className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
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

