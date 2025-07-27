"use client"

import * as React from "react"
import SimpleBar from "simplebar-react"
// import type { Props as SimpleBarProps } from "simplebar-react"
import { cn } from "@/lib/utils"
import "simplebar-react/dist/simplebar.min.css"

export interface ScrollAreaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onScroll'> {
  children: React.ReactNode
  // Custom props for different use cases
  variant?: "default" | "modal" | "list"
  // SimpleBar options
  maxHeight?: string | number
  autoHide?: boolean
  // For components that need scroll position tracking
  onScroll?: (e: Event) => void
  // Ref to access SimpleBar instance
  scrollableNodeRef?: React.Ref<HTMLDivElement>
}

const ScrollArea = React.forwardRef<typeof SimpleBar, ScrollAreaProps>(
  ({ 
    className, 
    children, 
    variant = "default",
    maxHeight,
    autoHide = true,
    onScroll,
    scrollableNodeRef,
    style,
    ...props 
  }, ref) => {
    // Extract ref from props to avoid conflicts
    const { ref: _, ...restProps } = props as any;
    // Different configurations for different variants
    const variantStyles = {
      default: "",
      modal: "simplebar-modal",
      list: "simplebar-list",
    }

    // Merge styles
    const mergedStyle = {
      maxHeight: maxHeight || "100%",
      ...style,
    }

    return (
      <SimpleBar
        ref={ref}
        className={cn(
          "relative w-full",
          variantStyles[variant],
          className
        )}
        style={mergedStyle}
        autoHide={autoHide}
        scrollableNodeProps={{ 
          ref: scrollableNodeRef,
          onScroll: onScroll 
        }}
        {...restProps}
      >
        <div className="w-full">
          {children}
        </div>
      </SimpleBar>
    )
  }
)
ScrollArea.displayName = "ScrollArea"

// Export a hook to access SimpleBar instance methods
export const useScrollAreaRef = () => {
  return React.useRef<typeof SimpleBar>(null)
}

export { ScrollArea }