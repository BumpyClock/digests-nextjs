"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bookmark, Share2, ExternalLink, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Scrollbars } from "react-custom-scrollbars-2"

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  link: string
  initialPosition: { x: number; y: number; width: number; height: number }
  children: React.ReactNode
}

export function BaseModal({ isOpen, onClose, title, link, initialPosition, children }: BaseModalProps) {
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
      <DialogContent className="sm:max-w-4xl h-[90vh] max-h-[90vh] p-0 gap-0" style={modalStyle}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
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
        <Scrollbars
          autoHide
          universal
          style={{ height: "100%" }}
          renderThumbVertical={({ style, ...props }) => (
            <div
              {...props}
              style={{
                ...style,
                backgroundColor: "var(--scrollbar-thumb)",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            />
          )}
        >
          <div className="max-w-3xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-bold mb-6">{title}</h1>
            {children}
          </div>
        </Scrollbars>
      </DialogContent>
    </Dialog>
  )
}

