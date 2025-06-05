"use client";

interface ScrollShadowProps {
  visible: boolean;
  position: "top" | "bottom";
}

export function ScrollShadow({ visible, position }: ScrollShadowProps) {
  const isTop = position === "top";
  
  return (
    <div 
      className={`absolute ${isTop ? 'top-[-10px]' : 'bottom-0'} left-0 right-0 
                 bg-background/35 z-10 pointer-events-none transition-all ease-in-out 
                 dark:bg-background/85 duration-300 
                 ${visible ? 'opacity-100 h-24' : 'opacity-0 h-0'}
                 not-[@supports_(backdrop-filter:blur(0))]:bg-background/90`}
      style={{
        filter: 'brightness(0.75)',
        backdropFilter: 'blur(40px)',
        maskImage: `linear-gradient(to ${isTop ? 'bottom' : 'top'}, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to ${isTop ? 'bottom' : 'top'}, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)`
      }}
    />
  );
} 