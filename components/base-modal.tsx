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

  if (animationEnabled && itemId) {
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
                      layoutId={`card-${itemId}`}
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

  // Fallback to original non-animated version
  return (
    <Dialog open={isOpen}  onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-3xl" />
      
      <DialogTitle className="sr-only">{title || "Content"}</DialogTitle>
      <DialogContent
        className={`
          p-0 gap-0 overflow-hidden bg-background
          
          /* Reset default positioning */
          !left-0 !top-0 !translate-x-0 !translate-y-0
          
          /* Mobile: Full screen below 640px */
          fixed inset-0 w-full h-full max-w-none rounded-none border-none
          
          /* Small screens and up: Centered modal with rounded corners */
          sm:!inset-auto sm:!left-[50%] sm:!top-[50%] 
          sm:!translate-x-[-50%] sm:!translate-y-[-50%]
          sm:w-[90vw] sm:max-w-[1050px] sm:h-auto sm:max-h-[95vh]
          sm:rounded-[32px] sm:border sm:border-border
          
          /* Large screens: Optimal width */
          lg:w-[65vw]
          
          /* Override default animations for mobile */
          data-[state=closed]:!slide-out-to-bottom
          data-[state=open]:!slide-in-from-bottom
          sm:data-[state=closed]:!slide-out-to-left-1/2
          sm:data-[state=closed]:!slide-out-to-top-[48%]
          sm:data-[state=open]:!slide-in-from-left-1/2
          sm:data-[state=open]:!slide-in-from-top-[48%]
          
          ${className || ""}
        `}
        style={modalStyle}
        hideCloseButton
      >
        
        <div className="absolute top-0 right-0 p-4 z-50 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div className="h-full w-full overflow-hidden">
          {children}
        </div>
      </DialogContent>
   
    </Dialog>
  )
}

