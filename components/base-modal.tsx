"use client"

import type React from "react"
import {  useEffect } from "react"
import { Logger } from "@/utils/logger"
import { Dialog, DialogContent, DialogTitle, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  initialPosition: { x: number; y: number; width: number; height: number }
  children: React.ReactNode
  className?: string
}

export function BaseModal({ isOpen, onClose, title, initialPosition, children, className }: BaseModalProps) {

  useEffect(() => {
    if (isOpen) {
      Logger.debug(`[BaseModal] title: ${title}`)
    }
  }, [isOpen, title])

  const modalStyle = {
    "--initial-x": `${initialPosition.x}px`,
    "--initial-y": `${initialPosition.y}px`,
    "--initial-scale": `${initialPosition.width / window.innerWidth}`,
  } as React.CSSProperties

  return (
    <Dialog open={isOpen}  onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-3xl" />
      
      <DialogTitle className="sr-only">{title || "Content"}</DialogTitle>
      <DialogContent
        className={`xs:max-w-full xs:rounded-none xs:border-none xs:h-screen xs:max-h-screen sm:rounded-[32px] sm:border-none sm:h-screen sm:max-h-screen sm:w-screen sm:max-w-screen md:max-w-screen md:w-screen md:rounded-none md:border-none md:h-screen md:max-h-screen lg:max-h-[95vh] lg:w-[65vw] lg:rounded-[40px] lg:max-w-[1050px] p-0 gap-0 overflow-hidden bg-background ${className || ""}`}
        style={modalStyle}
        hideCloseButton
      >
        
        <div className="fixed top-0 right-0 p-4 z-50 flex items-center gap-2">
          
          <Button variant="outline" size="icon" onClick={onClose}>
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
}

