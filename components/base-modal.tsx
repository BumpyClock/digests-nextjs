"use client"

import type React from "react"
import { useState, useCallback, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bookmark, Share2, ExternalLink, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { memo } from "react"

/**
 * Props for the BaseModal component
 */
interface BaseModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Callback function to close the modal */
  onClose: () => void
  /** Optional title to display in the modal */
  title?: string
  /** URL to link to when clicking the external link button */
  link: string
  /** Initial position and dimensions for the modal animation */
  initialPosition: { x: number; y: number; width: number; height: number }
  /** Child elements to render inside the modal */
  children: React.ReactNode
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Base modal component that provides a consistent layout and behavior for all modals in the application.
 * Includes bookmark, share, external link, and close functionality.
 */
export const BaseModal = memo(function BaseModal({ isOpen, onClose, title, link, initialPosition, children, className }: BaseModalProps) {
  // Only log when modal is actually open
  useEffect(() => {
    if (isOpen) {
      console.log('[BaseModal] render:', { 
        isOpen, 
        title,
        initialPositionChanged: JSON.stringify(initialPosition)
      });
    }
  }, [isOpen, title, initialPosition]);

  const [isBookmarked, setIsBookmarked] = useState(false)
  const { toast } = useToast()

  const handleBookmark = useCallback(() => {
    setIsBookmarked(!isBookmarked)
    toast({
      title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
      description: isBookmarked
        ? "This item has been removed from your bookmarks."
        : "This item has been added to your bookmarks.",
    })
  }, [isBookmarked, toast])

  const handleShare = useCallback(() => {
    toast({
      title: "Share link copied",
      description: "The link to this item has been copied to your clipboard.",
    })
  }, [toast])

  const modalStyle = useMemo(() => ({
    "--initial-x": `${initialPosition.x}px`,
    "--initial-y": `${initialPosition.y}px`,
    "--initial-scale": `${initialPosition.width / window.innerWidth}`,
  } as React.CSSProperties), [initialPosition])

  return (
    <Dialog open={isOpen}  onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-3xl" />
      
      <DialogTitle className="sr-only">{title || "Content"}</DialogTitle>
      <DialogContent
        className={`xs:max-w-full xs:rounded-none xs:border-none xs:h-screen xs:max-h-screen sm:rounded-[32px] sm:border-none sm:h-screen sm:max-h-screen sm:w-screen sm:max-w-screen md:max-w-screen md:w-screen md:rounded-none md:border-none md:h-screen md:max-h-screen lg:max-h-[95vh] lg:w-[65vw] lg:rounded-[40px] lg:max-w-[1050px] p-0 gap-0 overflow-hidden ${className || ""}`}
        style={modalStyle}
        hideCloseButton
      >
        
        <div className="fixed top-0 right-0 p-4 z-50 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBookmark}>
            <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
            <span className="sr-only">Bookmark</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            <span className="sr-only">Share</span>
          </Button>
          <Link href={link} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon">
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">Open original</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div className="h-full">
          <div className=" mx-auto scrollbar-none h-full w-full ">
            {children}
          </div>
        </div>
      </DialogContent>
   
    </Dialog>
  )
}, (prevProps, nextProps) => {
  // Don't compare props if both modals are closed
  if (!prevProps.isOpen && !nextProps.isOpen) return true;

  const propsChanged = {
    isOpen: prevProps.isOpen !== nextProps.isOpen,
    title: prevProps.title !== nextProps.title,
    link: prevProps.link !== nextProps.link,
    initialPosition: JSON.stringify(prevProps.initialPosition) !== JSON.stringify(nextProps.initialPosition),
    className: prevProps.className !== nextProps.className
  };

  const shouldUpdate = Object.values(propsChanged).some(Boolean);
  
  if (shouldUpdate) {
    console.log('[BaseModal] will update due to:', propsChanged);
  }
  
  return !shouldUpdate;
});

