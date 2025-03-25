"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AmbiLightProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /**
   * If you want to hide or show the glow on rest vs. hover,
   * you can keep these props as a styling convenience.
   */
  opacity?: {
    rest: number;
    hover: number;
  };
  isActive?: boolean;
  parentHovered?: boolean;
}

/**
 * A simple wrapper that applies `filter: url(#feedCardAmbilight-filter)`
 * so the feedCard's image gets the 'ambilight' effect.
 */
export function Ambilight({
  children,
  className,
  isActive,
  parentHovered,
  ...props
}: AmbiLightProps) {
  return (
    <div
      className={cn(
        "ambilight-wrapper",
        isActive !== undefined || parentHovered !== undefined
          ? isActive || parentHovered
            ? "ambilight-active"
            : "ambilight-inactive"
          : "group-hover:ambilight-active ambilight-inactive",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}