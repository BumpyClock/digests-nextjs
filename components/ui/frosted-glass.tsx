import type React from "react";
import { useId, type ReactNode } from "react";

interface FrostedGlassProps {
  children: ReactNode;
  className?: string;
  blurAmount?: number;
  rounded?: number;
  bgOpacity?: 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90;
  bgColor?: string;
  id?: string;
}

const FrostedGlass: React.FC<FrostedGlassProps> = ({
  children,
  className = "",
  blurAmount = 24,
  rounded = 24,
  bgOpacity = 10,
  bgColor = "hsl(var(--background))",
  id = "",
}) => {
  const generatedId = useId();
  const maskId = id
    ? `frosted-glass-mask-${id}`
    : `frosted-glass-mask-${generatedId.replace(/[:]/g, "")}`;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ borderRadius: rounded }}>
      {/* Extended container to allow for blur to consider neighboring pixels */}
      <div className="absolute -inset-16">
        {/* Backdrop element with blur filter */}
        <div
          className="absolute inset-16 transition-token-filter"
          style={{
            backgroundColor: `color-mix(in srgb, ${bgColor} ${bgOpacity}%, transparent)`,
            borderRadius: rounded,
            backdropFilter: `blur(${blurAmount}px)`,
            WebkitBackdropFilter: `blur(${blurAmount}px)`,
            maskImage: `url(#${maskId})`,
            WebkitMaskImage: `url(#${maskId})`,
          }}
        />

        {/* SVG mask to shape the backdrop */}
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <title>Frosted glass mask</title>
          <defs>
            <mask id={maskId}>
              <rect
                x="16"
                y="16"
                width="calc(100% - 32px)"
                height="calc(100% - 32px)"
                fill="white"
                rx={rounded}
                ry={rounded}
              />
            </mask>
          </defs>
        </svg>
      </div>

      {/* Content inside the frosted glass */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default FrostedGlass;
