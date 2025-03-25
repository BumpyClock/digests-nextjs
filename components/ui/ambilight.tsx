"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface AmbiLightProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  opacity?: {
    rest: number;
    hover: number;
  };
  saturation?: number;
  colorCutoff?: number;
  spread?: number;
  blur?: number;
  isActive?: boolean;
  parentHovered?: boolean;
}

export function Ambilight({
  children,
  className,
  opacity = { rest: 0, hover: 0.7 },
  saturation = 1,
  colorCutoff = 0,
  spread = 2,
  blur = 8,
  isActive,
  parentHovered,
  ...props
}: AmbiLightProps) {
  useEffect(() => {
    // Check if both filters don't exist
    if (!document.getElementById("ambilight-filter")) {
      const filterContainer = document.createElement("div");
      filterContainer.className = "filter-container";
      filterContainer.innerHTML = `
        <svg width="0" height="0">
          <defs>
            <filter id="ambilight" width="300%" height="300%" x="-0.75" y="-0.75" color-interpolation-filters="sRGB">
              <feOffset in="SourceGraphic" result="source-copy"/>
              <feColorMatrix in="source-copy" type="saturate" values="${saturation}" result="saturated-copy"/>
              <feColorMatrix 
                in="saturated-copy" 
                type="matrix" 
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        33 33 33 33 -33"
                result="bright-colors"
              />
              <feMorphology in="bright-colors" operator="dilate" radius="${spread}" result="spread"/>
              <feGaussianBlur in="spread" stdDeviation="${blur}" result="ambilight-light"/>
              <feOffset in="SourceGraphic" result="source"/>
              <feComposite in="source" in2="ambilight-light" operator="over"/>
            </filter>
          </defs>
        </svg>
      `;
      document.body.appendChild(filterContainer);
    }
  }, [saturation, colorCutoff, spread, blur]);

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
      style={{
        "--ambilight-opacity-rest": opacity.rest,
        "--ambilight-opacity-hover": opacity.hover,
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
} 