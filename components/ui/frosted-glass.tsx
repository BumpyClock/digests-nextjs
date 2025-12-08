import React, { ReactNode } from "react";

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
  blurAmount = "24",
  rounded = 24,
  bgOpacity = 10,
  bgColor = "white",
  id = "",
}) => {
  // Generate unique ID for SVG mask
  const maskId = id
    ? `frosted-glass-mask-${id}`
    : `frosted-glass-mask-${Math.random().toString(36).substring(2, 11)}`;

  // Map blurAmount to Tailwind blur classes
  const blurClass = `backdrop-blur-${blurAmount}`;

  // Create background opacity class
  const bgOpacityClass = `bg-opacity-${bgOpacity}`;

  // Handle bgColor class properly
  const bgColorClass = bgColor.startsWith("bg-") ? bgColor : `bg-${bgColor}`;

  return (
    <div className={`relative ${className} rounded-[${rounded}px]`}>
      {/* Extended container to allow for blur to consider neighboring pixels */}
      <div className="absolute -inset-16">
        {/* Backdrop element with blur filter */}
        <div
          className={`absolute inset-16 ${blurClass} ${bgColorClass} ${bgOpacityClass} rounded-[${rounded}px]`}
          style={{
            maskImage: `url(#${maskId})`,
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
