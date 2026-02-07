import { designTokens } from "./design-tokens";

const msToSeconds = (value: string): number => {
  const ms = Number.parseFloat(value.replace("ms", ""));
  return Number.isFinite(ms) ? ms / 1000 : 0.2;
};

export const motionTokens = {
  duration: {
    fast: msToSeconds(designTokens.motion.duration.fast),
    normal: msToSeconds(designTokens.motion.duration.normal),
    slow: msToSeconds(designTokens.motion.duration.slow),
    slower: msToSeconds(designTokens.motion.duration.slower),
  },
  ease: {
    standard: [0.2, 0, 0, 1] as const,
    decelerate: [0, 0, 0, 1] as const,
    accelerate: [0.4, 0, 1, 1] as const,
  },
} as const;

