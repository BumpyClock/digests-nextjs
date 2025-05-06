/**
 * Theme CSS Generator Script
 * Generates CSS variables for all defined themes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tinycolor from 'tinycolor2';

// Current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to output file
const outputPath = path.join(__dirname, '..', 'app', 'generated-themes.css');

// Define themes directly in this file to avoid issues with TypeScript imports
const themes = [
  // Flexoki Light theme
  {
    name: "flexoki-light",
    displayName: "Flexoki Light",
    coreColors: {
      // Base colors
      background: "hsl(48 100% 97%)",
      foreground: "hsl(0 3% 6%)",
      
      // Card colors
      card: "hsl(48 100% 97%)",
      cardForeground: "hsl(0 3% 6%)",
      
      // Popover colors
      popover: "hsl(48 100% 97%)",
      popoverForeground: "hsl(0 3% 6%)",
      
      // Primary colors
      primary: "hsl(0 3% 6%)",
      primaryForeground: "hsl(48 100% 97%)",
      
      // Secondary colors
      secondary: "hsl(51 33% 92%)",
      secondaryForeground: "hsl(0 3% 6%)",
      
      // Muted colors
      muted: "hsl(51 33% 92%)",
      mutedForeground: "hsl(50 3% 30%)",
      
      // Accent colors
      accent: "hsl(51 33% 92%)",
      accentForeground: "hsl(0 3% 6%)",
      
      // Destructive colors
      destructive: "hsl(3 62% 42%)",
      destructiveForeground: "hsl(48 100% 97%)",
      
      // Border, input, and ring colors
      border: "hsl(51 21% 88%)",
      input: "hsl(51 21% 88%)",
      ring: "hsl(55 10% 79%)",
      
      // Additional colors
      blockquoteBackground: "hsl(51 33% 92%)",
      brandPrimary: "hsl(185 45% 47%)",
      
      // Color palette
      redPrimary: "hsl(3 62% 42%)",
      redSecondary: "hsl(5 61% 54%)",
      orangePrimary: "hsl(22 80% 41%)",
      orangeSecondary: "hsl(23 70% 51%)",
      yellowPrimary: "hsl(45 99% 34%)",
      yellowSecondary: "hsl(45 82% 45%)",
      greenPrimary: "hsl(73 84% 27%)",
      greenSecondary: "hsl(72 46% 41%)",
      cyanPrimary: "hsl(175 57% 33%)",
      cyanSecondary: "hsl(175 49% 45%)",
      bluePrimary: "hsl(212 68% 39%)",
      blueSecondary: "hsl(208 49% 50%)",
      purplePrimary: "hsl(259 42% 43%)",
      purpleSecondary: "hsl(251 40% 64%)",
      magentaPrimary: "hsl(326 55% 41%)",
      magentaSecondary: "hsl(329 54% 59%)",
    },
  },
  
  // Flexoki Dark theme
  {
    name: "flexoki-dark",
    displayName: "Flexoki Dark",
    coreColors: {
      // Base colors
      background: "hsl(0 3% 6%)",
      foreground: "hsl(55 10% 100%)",
      
      // Card colors
      card: "hsl(0 3% 6%)",
      cardForeground: "hsl(55 10% 100%)",
      
      // Popover colors
      popover: "hsl(0 3% 6%)",
      popoverForeground: "hsl(55 10% 79%)",
      
      // Primary colors
      primary: "hsl(55 10% 79%)",
      primaryForeground: "hsl(0 3% 6%)",
      
      // Secondary colors
      secondary: "hsl(30 4% 11%)",
      secondaryForeground: "hsl(55 10% 79%)",
      
      // Muted colors
      muted: "hsl(30 4% 11%)",
      mutedForeground: "hsl(43 3% 85%)",
      
      // Accent colors
      accent: "hsl(30 4% 11%)",
      accentForeground: "hsl(55 10% 79%)",
      
      // Destructive colors
      destructive: "hsl(5 61% 54%)",
      destructiveForeground: "hsl(0 3% 6%)",
      
      // Border, input, and ring colors
      border: "hsl(30 3% 15%)",
      input: "hsl(30 3% 15%)",
      ring: "hsl(30 3% 24%)",
      
      // Additional colors
      blockquoteBackground: "hsl(30 4% 11%)",
      brandPrimary: "hsl(185 45% 47%)",
      
      // Color palette
      redPrimary: "hsl(5 61% 54%)",
      redSecondary: "hsl(3 62% 42%)",
      orangePrimary: "hsl(23 70% 51%)",
      orangeSecondary: "hsl(22 80% 41%)",
      yellowPrimary: "hsl(45 82% 45%)",
      yellowSecondary: "hsl(45 99% 34%)",
      greenPrimary: "hsl(72 46% 41%)",
      greenSecondary: "hsl(73 84% 27%)",
      cyanPrimary: "hsl(175 49% 45%)",
      cyanSecondary: "hsl(175 57% 33%)",
      bluePrimary: "hsl(208 49% 50%)",
      blueSecondary: "hsl(212 68% 39%)",
      purplePrimary: "hsl(251 40% 64%)",
      purpleSecondary: "hsl(259 42% 43%)",
      magentaPrimary: "hsl(329 54% 59%)",
      magentaSecondary: "hsl(326 55% 41%)",
    },
  },
  
  // Standard Light theme
  {
    name: "standard-light",
    displayName: "Standard Light",
    coreColors: {
      // Base colors
      background: "hsl(0 0% 100%)",
      foreground: "hsl(222.2 84% 4.9%)",
      
      // Card colors
      card: "hsl(0 0% 100%)",
      cardForeground: "hsl(222.2 84% 4.9%)",
      
      // Popover colors
      popover: "hsl(0 0% 100%)",
      popoverForeground: "hsl(222.2 84% 4.9%)",
      
      // Primary colors
      primary: "hsl(221.2 83.2% 53.3%)",
      primaryForeground: "hsl(210 40% 98%)",
      
      // Secondary colors
      secondary: "hsl(210 40% 96.1%)",
      secondaryForeground: "hsl(222.2 47.4% 11.2%)",
      
      // Muted colors
      muted: "hsl(210 40% 96.1%)",
      mutedForeground: "hsl(215.4 16.3% 46.9%)",
      
      // Accent colors
      accent: "hsl(210 40% 96.1%)",
      accentForeground: "hsl(222.2 47.4% 11.2%)",
      
      // Destructive colors
      destructive: "hsl(0 84.2% 60.2%)",
      destructiveForeground: "hsl(210 40% 98%)",
      
      // Border, input, and ring colors
      border: "hsl(214.3 31.8% 91.4%)",
      input: "hsl(214.3 31.8% 91.4%)",
      ring: "hsl(221.2 83.2% 53.3%)",
      
      // Additional colors
      blockquoteBackground: "hsl(210 40% 96.1%)",
      brandPrimary: "hsl(221.2 83.2% 53.3%)",
      
      // Color palette
      redPrimary: "hsl(0 84.2% 60.2%)",
      redSecondary: "hsl(0 72.2% 50.6%)",
      orangePrimary: "hsl(24.6 95% 53.1%)",
      orangeSecondary: "hsl(35 91.7% 43.9%)",
      yellowPrimary: "hsl(45 93.4% 47.5%)",
      yellowSecondary: "hsl(48 96.6% 60%)",
      greenPrimary: "hsl(142.1 76.2% 36.3%)",
      greenSecondary: "hsl(142.1 70.6% 45.3%)",
      cyanPrimary: "hsl(182.1 73.8% 46.1%)",
      cyanSecondary: "hsl(184.6 70.3% 45.7%)",
      bluePrimary: "hsl(221.2 83.2% 53.3%)",
      blueSecondary: "hsl(221.2 83.1% 65.9%)",
      purplePrimary: "hsl(262.1 83.3% 57.8%)",
      purpleSecondary: "hsl(262.1 83.3% 67.8%)",
      magentaPrimary: "hsl(325.1 80.2% 53.1%)",
      magentaSecondary: "hsl(328.2 85.1% 70.2%)",
    },
  },
  
  // Standard Dark theme
  {
    name: "standard-dark",
    displayName: "Standard Dark",
    coreColors: {
      // Base colors
      background: "hsl(222.2 84% 4.9%)",
      foreground: "hsl(210 40% 98%)",
      
      // Card colors
      card: "hsl(222.2 84% 4.9%)",
      cardForeground: "hsl(210 40% 98%)",
      
      // Popover colors
      popover: "hsl(222.2 84% 4.9%)",
      popoverForeground: "hsl(210 40% 98%)",
      
      // Primary colors
      primary: "hsl(217.2 91.2% 59.8%)",
      primaryForeground: "hsl(222.2 47.4% 11.2%)",
      
      // Secondary colors
      secondary: "hsl(217.2 32.6% 17.5%)",
      secondaryForeground: "hsl(210 40% 98%)",
      
      // Muted colors
      muted: "hsl(217.2 32.6% 17.5%)",
      mutedForeground: "hsl(215 20.2% 65.1%)",
      
      // Accent colors
      accent: "hsl(217.2 32.6% 17.5%)",
      accentForeground: "hsl(210 40% 98%)",
      
      // Destructive colors
      destructive: "hsl(0 62.8% 30.6%)",
      destructiveForeground: "hsl(210 40% 98%)",
      
      // Border, input, and ring colors
      border: "hsl(217.2 32.6% 17.5%)",
      input: "hsl(217.2 32.6% 17.5%)",
      ring: "hsl(224.3 76.3% 48%)",
      
      // Additional colors
      blockquoteBackground: "hsl(217.2 32.6% 17.5%)",
      brandPrimary: "hsl(217.2 91.2% 59.8%)",
      
      // Color palette
      redPrimary: "hsl(0 72.2% 50.6%)",
      redSecondary: "hsl(0 62.8% 30.6%)",
      orangePrimary: "hsl(20.5 90.2% 48.2%)",
      orangeSecondary: "hsl(17.5 98.6% 35.1%)",
      yellowPrimary: "hsl(40.8 96.6% 40%)",
      yellowSecondary: "hsl(47.9 95.8% 53.1%)",
      greenPrimary: "hsl(142.4 70.6% 45.3%)",
      greenSecondary: "hsl(139.9 47.2% 36.7%)",
      cyanPrimary: "hsl(185.6 78.3% 40.8%)",
      cyanSecondary: "hsl(172.5 66% 50.4%)",
      bluePrimary: "hsl(210.5 100% 66.1%)",
      blueSecondary: "hsl(213.8 93.9% 67.8%)",
      purplePrimary: "hsl(266.3 96.5% 80%)",
      purpleSecondary: "hsl(269.1 75.3% 70%)",
      magentaPrimary: "hsl(332.2 86.8% 70.4%)",
      magentaSecondary: "hsl(333.9 84.7% 70.8%)",
    },
  },
  
  // Dracula Light theme
  {
    name: "dracula-light",
    displayName: "Dracula Light",
    coreColors: {
      // Base colors
      background: "hsl(60 30% 96%)",
      foreground: "hsl(231 15% 18%)",
      
      // Card colors
      card: "hsl(60 30% 96%)",
      cardForeground: "hsl(231 15% 18%)",
      
      // Popover colors
      popover: "hsl(60 30% 96%)",
      popoverForeground: "hsl(231 15% 18%)",
      
      // Primary colors
      primary: "hsl(326 100% 74%)",
      primaryForeground: "hsl(231 15% 18%)",
      
      // Secondary colors
      secondary: "hsl(60 30% 92%)",
      secondaryForeground: "hsl(231 15% 18%)",
      
      // Muted colors
      muted: "hsl(60 30% 92%)",
      mutedForeground: "hsl(231 15% 50%)",
      
      // Accent colors
      accent: "hsl(60 30% 92%)",
      accentForeground: "hsl(231 15% 18%)",
      
      // Destructive colors
      destructive: "hsl(0 100% 67%)",
      destructiveForeground: "hsl(60 30% 96%)",
      
      // Border, input, and ring colors
      border: "hsl(60 30% 88%)",
      input: "hsl(60 30% 88%)",
      ring: "hsl(231 15% 50%)",
      
      // Additional colors
      blockquoteBackground: "hsl(60 30% 92%)",
      brandPrimary: "hsl(326 100% 74%)",
      
      // Color palette
      redPrimary: "hsl(0 100% 67%)",
      redSecondary: "hsl(0 100% 77%)",
      orangePrimary: "hsl(31 100% 71%)",
      orangeSecondary: "hsl(31 100% 81%)",
      yellowPrimary: "hsl(60 100% 70%)",
      yellowSecondary: "hsl(60 100% 80%)",
      greenPrimary: "hsl(135 94% 65%)",
      greenSecondary: "hsl(135 94% 75%)",
      cyanPrimary: "hsl(191 97% 77%)",
      cyanSecondary: "hsl(191 97% 87%)",
      bluePrimary: "hsl(225 100% 75%)",
      blueSecondary: "hsl(225 100% 85%)",
      purplePrimary: "hsl(250 100% 75%)",
      purpleSecondary: "hsl(250 100% 85%)",
      magentaPrimary: "hsl(326 100% 74%)",
      magentaSecondary: "hsl(326 100% 84%)",
    },
  },
  
  // Dracula Dark theme
  {
    name: "dracula-dark",
    displayName: "Dracula Dark",
    coreColors: {
      // Base colors
      background: "hsl(231 15% 18%)",
      foreground: "hsl(60 30% 96%)",
      
      // Card colors
      card: "hsl(231 15% 18%)",
      cardForeground: "hsl(60 30% 96%)",
      
      // Popover colors
      popover: "hsl(231 15% 18%)",
      popoverForeground: "hsl(60 30% 96%)",
      
      // Primary colors
      primary: "hsl(326 100% 74%)",
      primaryForeground: "hsl(231 15% 18%)",
      
      // Secondary colors
      secondary: "hsl(231 15% 26%)",
      secondaryForeground: "hsl(60 30% 96%)",
      
      // Muted colors
      muted: "hsl(231 15% 26%)",
      mutedForeground: "hsl(60 30% 76%)",
      
      // Accent colors
      accent: "hsl(231 15% 26%)",
      accentForeground: "hsl(60 30% 96%)",
      
      // Destructive colors
      destructive: "hsl(0 100% 67%)",
      destructiveForeground: "hsl(60 30% 96%)",
      
      // Border, input, and ring colors
      border: "hsl(231 15% 26%)",
      input: "hsl(231 15% 26%)",
      ring: "hsl(326 100% 74%)",
      
      // Additional colors
      blockquoteBackground: "hsl(231 15% 26%)",
      brandPrimary: "hsl(326 100% 74%)",
      
      // Color palette
      redPrimary: "hsl(0 100% 67%)",
      redSecondary: "hsl(0 100% 57%)",
      orangePrimary: "hsl(31 100% 71%)",
      orangeSecondary: "hsl(31 100% 61%)",
      yellowPrimary: "hsl(60 100% 70%)",
      yellowSecondary: "hsl(60 100% 60%)",
      greenPrimary: "hsl(135 94% 65%)",
      greenSecondary: "hsl(135 94% 55%)",
      cyanPrimary: "hsl(191 97% 77%)",
      cyanSecondary: "hsl(191 97% 67%)",
      bluePrimary: "hsl(225 100% 75%)",
      blueSecondary: "hsl(225 100% 65%)",
      purplePrimary: "hsl(250 100% 75%)",
      purpleSecondary: "hsl(250 100% 65%)",
      magentaPrimary: "hsl(326 100% 74%)",
      magentaSecondary: "hsl(326 100% 64%)",
    },
  },
];

/**
 * Generates CSS variables from core colors
 * @param {Object} coreColors - The core colors object from theme definition
 * @returns {Object} - CSS variables mapping
 */
function generateCssVariables(coreColors) {
  const cssVars = {};
  
  // Direct mappings from camelCase to kebab-case
  const directMappings = {
    background: '--background',
    foreground: '--foreground',
    card: '--card',
    cardForeground: '--card-foreground',
    popover: '--popover',
    popoverForeground: '--popover-foreground',
    primary: '--primary',
    primaryForeground: '--primary-foreground',
    secondary: '--secondary',
    secondaryForeground: '--secondary-foreground',
    muted: '--muted',
    mutedForeground: '--muted-foreground',
    accent: '--accent',
    accentForeground: '--accent-foreground',
    destructive: '--destructive',
    destructiveForeground: '--destructive-foreground',
    border: '--border',
    input: '--input',
    ring: '--ring',
    blockquoteBackground: '--blockquote-background-color',
    brandPrimary: '--brand-primary',
    
    // Color palette
    redPrimary: '--red-primary',
    redSecondary: '--red-secondary',
    orangePrimary: '--orange-primary',
    orangeSecondary: '--orange-secondary',
    yellowPrimary: '--yellow-primary',
    yellowSecondary: '--yellow-secondary',
    greenPrimary: '--green-primary',
    greenSecondary: '--green-secondary',
    cyanPrimary: '--cyan-primary',
    cyanSecondary: '--cyan-secondary',
    bluePrimary: '--blue-primary',
    blueSecondary: '--blue-secondary',
    purplePrimary: '--purple-primary',
    purpleSecondary: '--purple-secondary',
    magentaPrimary: '--magenta-primary',
    magentaSecondary: '--magenta-secondary',
  };

  // Process direct mappings
  Object.entries(directMappings).forEach(([coreKey, cssVar]) => {
    if (coreColors[coreKey]) {
      // Extract the color values directly from HSL strings
      // Format is "hsl(48 100% 97%)" -> "48 100% 97%"
      const hslValue = coreColors[coreKey].replace(/hsl\(|\)/g, '');
      cssVars[cssVar] = hslValue;
    }
  });

  // Add radius variable (not derived from coreColors but needed for consistency)
  cssVars['--radius'] = '0.5rem';
  
  return cssVars;
}

/**
 * Generates the complete CSS file from all themes
 */
function generateCssFile() {
  // Set the default theme to flexoki-light
  const defaultTheme = themes.find(t => t.name === 'flexoki-light') || themes[0];
  
  // Start with the root CSS block for the default theme
  let css = ':root {\n';
  const defaultVars = generateCssVariables(defaultTheme.coreColors);
  
  // Add all default variables to the :root block
  Object.entries(defaultVars).forEach(([name, value]) => {
    css += `  ${name}: ${value};\n`;
  });
  css += '}\n\n';
  
  // Add CSS blocks for each theme
  themes.forEach(theme => {
    css += `html[data-theme="${theme.name}"] {\n`;
    
    const themeVars = generateCssVariables(theme.coreColors);
    
    // Add all theme variables
    Object.entries(themeVars).forEach(([name, value]) => {
      css += `  ${name}: ${value};\n`;
    });
    
    css += '}\n\n';
  });
  
  // Add a special case for dark mode
  css += `html[data-theme="dark"] {\n`;
  const darkTheme = themes.find(t => t.name === 'flexoki-dark') || themes[1];
  const darkVars = generateCssVariables(darkTheme.coreColors);
  
  // Add all dark theme variables
  Object.entries(darkVars).forEach(([name, value]) => {
    css += `  ${name}: ${value};\n`;
  });
  css += '}\n\n';
  
  // Write the CSS file
  fs.writeFileSync(outputPath, css, 'utf8');
  console.log(`Generated theme CSS at ${outputPath}`);
}

// Execute the function
generateCssFile();