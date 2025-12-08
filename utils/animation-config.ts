// Spring configurations for consistent animations
export const springConfig = {
  controlled: { type: "spring" as const, stiffness: 400, damping: 40 },
  stiff: { type: "spring" as const, stiffness: 800, damping: 70 }, // Increased for snappier animation
};

// Staggered content animation for modal content
export const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15, // Reduced from 0.3
      staggerChildren: 0.05, // Reduced from 0.1
    },
  },
};
