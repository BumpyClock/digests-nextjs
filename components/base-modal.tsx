"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bookmark, Share2, ExternalLink, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  link: string
  initialPosition: { x: number; y: number; width: number; height: number }
  children: React.ReactNode
  className?: string
}

export function BaseModal({ isOpen, onClose, title, link, initialPosition, children, className }: BaseModalProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const { toast } = useToast()

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    toast({
      title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
      description: isBookmarked
        ? "This item has been removed from your bookmarks."
        : "This item has been added to your bookmarks.",
    })
  }

  const handleShare = () => {
    toast({
      title: "Share link copied",
      description: "The link to this item has been copied to your clipboard.",
    })
  }

  const modalStyle = {
    "--initial-x": `${initialPosition.x}px`,
    "--initial-y": `${initialPosition.y}px`,
    "--initial-scale": `${initialPosition.width / window.innerWidth}`,
  } as React.CSSProperties

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      
      <DialogTitle className="sr-only">{title || "Content"}</DialogTitle>
      <DialogContent
        className={`xs:max-w-full xs:rounded-none xs:border-none xs:h-screen xs:max-h-screen sm:rounded-[32px] sm:border-none sm:h-screen sm:max-h-screen sm:w-screen sm:max-w-screen md:max-w-7xl md:h-[99vh] lg:max-h-[95vh] lg:w-[65vw] lg:max-w-[1050px] p-0 gap-0  ${className || ""}`}
        style={modalStyle}
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
        <div
          className="h-full overflow-y-auto scrollbar-thin"
          
        >
          <div className=" mx-auto  p-12 ">
            {children}
          </div>
        </div>
      </DialogContent>
   
    </Dialog>
  )
}

