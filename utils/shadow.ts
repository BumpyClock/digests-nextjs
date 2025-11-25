import tinycolor from 'tinycolor2';

const easeInQuad = (x: number) => x * x;

export function adjustColorLuminosity(color: { r: number, g: number, b: number }, isDarkMode: boolean) {
  const parsedColor = tinycolor({ r: color.r, g: color.g, b: color.b });
  const hsl = parsedColor.toHsl();
  
  const MaxLuminosityLightMode = 0.5;
  const MaxLuminosityDarkMode = 0.9;
  const MinLuminosityLightMode = 0.15;
  const MinLuminosityDarkMode = 0.4;  
  
  const maxThreshold = isDarkMode ? MaxLuminosityDarkMode : MaxLuminosityLightMode;
  const minThreshold = isDarkMode ? MinLuminosityDarkMode : MinLuminosityLightMode;
  
  if (hsl.l > maxThreshold) {
    hsl.l = maxThreshold;
  } else if (hsl.l < minThreshold) {
    hsl.l = minThreshold;
  }
  
  return tinycolor(hsl);
}

export function generateLayeredShadows(color: { r: number, g: number, b: number }, elevation: number = 20, opacity: number = 0.05, isDarkMode: boolean) {
  const adjustedColor = adjustColorLuminosity(color, isDarkMode);
  const hsl = adjustedColor.toHsl();
  
  const state = {
    shadowStyle: "soft",
    layerAmount: 5,
    opacity,
    blur: elevation,
    verticalDistance: elevation * 0.6,
    horizontalDistance: 0,
    spread: elevation * 0.3,
  };

  const boxShadows = [];
  
  for (let i = 0; i < state.layerAmount; i++) {
    const progress = easeInQuad((i + 1) / state.layerAmount);
    const x = (0 + progress * state.horizontalDistance).toFixed(0);
    const y = (0 + progress * state.verticalDistance).toFixed(0);
    const blur = (1 + progress * state.blur).toFixed(0);
    const spread = (progress * state.spread).toFixed(0);
    const alpha = ((i + 1) * (state.opacity / state.layerAmount)).toFixed(2);

    boxShadows.push(
      `${x}px ${y}px ${blur}px ${spread}px hsla(${hsl.h}, ${hsl.s * 100}%, ${hsl.l * 100}%, ${alpha})`
    );
  }

  return boxShadows.join(", ");
}

export function generateCardShadows(color: { r: number, g: number, b: number }, isDarkMode: boolean) {
  return {
    restShadow: generateLayeredShadows(color, 20, 0.05, isDarkMode),
    hoverShadow: generateLayeredShadows(color, 30, 0.15, isDarkMode),
    pressedShadow: generateLayeredShadows(color, 10, 0.20, isDarkMode)
  };
}