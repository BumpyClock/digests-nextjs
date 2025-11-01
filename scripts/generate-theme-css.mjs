/**
 * Theme CSS Generator Script
 * Generates CSS variables for all defined themes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tinycolor from 'tinycolor2';
import themeDefinitions from '../lib/theme-definitions.js';

// Current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to output file
const outputPath = path.join(__dirname, '..', 'app', 'generated-themes.css');

// Import themes from the shared theme definitions file
const themes = themeDefinitions.themes;

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
 * Generates a CSS file defining CSS variables for all color themes.
 *
 * For each theme, creates a CSS block with custom properties for use in theme switching.
 * The default theme is applied to the `:root` selector, and a special block is added for dark mode.
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
  
  // Add special cases for light and dark mode aliases
  // Light mode alias
  css += `html[data-theme="light"] {\n`;
  const lightTheme = themes.find(t => t.name === 'flexoki-light') || themes[0];
  const lightVars = generateCssVariables(lightTheme.coreColors);

  // Add all light theme variables
  Object.entries(lightVars).forEach(([name, value]) => {
    css += `  ${name}: ${value};\n`;
  });
  css += '}\n\n';

  // Dark mode alias
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
  console.log(`✓ Generated theme CSS at ${outputPath}`);
}

// Execute the function
generateCssFile();