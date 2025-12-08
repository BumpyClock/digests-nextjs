// ABOUTME: Wrapper around simplebar-react providing styled scroll areas.
// ABOUTME: Supports variants and optional scroll event handling for modals/lists.
"use client";

import * as React from "react";
import SimpleBar from "simplebar-react";
// import type { Props as SimpleBarProps } from "simplebar-react"
import { cn } from "@/lib/utils";
import "simplebar-react/dist/simplebar.min.css";

export interface ScrollAreaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onScroll"> {
  children: React.ReactNode;
  // Custom props for different use cases
  variant?: "default" | "modal" | "list";
  // SimpleBar options
  maxHeight?: string | number;
  autoHide?: boolean;
  // For components that need scroll position tracking
  onScroll?: (e: Event) => void;
  // Ref to access SimpleBar instance
  scrollableNodeRef?: React.Ref<HTMLDivElement>;
}

// Use instance type of SimpleBar without exporting it as a type elsewhere
// Intentionally use any for the SimpleBar ref to avoid complex generic mismatch with the library's internal typing.
// This keeps external props type-safe while preventing TS errors about value/type distinctions.
const ScrollArea = ({
  className,
  children,
  variant = "default",
  maxHeight,
  autoHide = true,
  onScroll,
  scrollableNodeRef,
  style,
  ...props
}: ScrollAreaProps) => {
  // Different configurations for different variants
  const variantStyles = {
    default: "",
    modal: "simplebar-modal",
    list: "simplebar-list",
  };

  // Merge styles
  const mergedStyle = {
    maxHeight: maxHeight || "100%",
    ...style,
  };

  return (
    <SimpleBar
      className={cn("relative w-full", variantStyles[variant], className)}
      style={mergedStyle}
      autoHide={autoHide}
      scrollableNodeProps={{
        ref: scrollableNodeRef,
        // SimpleBar dispatches a native Event; keep user callback signature consistent
        onScroll: (e: Event) => onScroll?.(e),
      }}
      {...props}
    >
      <div className="w-full">{children}</div>
    </SimpleBar>
  );
};
// No displayName needed since not using forwardRef

// Export a hook to access SimpleBar instance methods
export const useScrollAreaRef = () => {
  return React.useRef(null);
};

export { ScrollArea };
