import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "dark"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "bounce-x": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(25%)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "bounce-x": "bounce-x 1s ease-in-out infinite",
        "accordion-down":
          "accordion-down var(--motion-duration-fast, 0.2s) var(--motion-ease-decelerate, ease-out)",
        "accordion-up":
          "accordion-up var(--motion-duration-fast, 0.2s) var(--motion-ease-decelerate, ease-out)",
      },
      fontFamily: {
        sans: ["var(--font-family-sans, ui-sans-serif, system-ui, sans-serif)"],
        serif: ["var(--font-family-serif, ui-serif, Georgia, serif)"],
        mono: ["var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace)"],
      },
      fontWeight: {
        normal: "var(--font-weight-regular, 400)",
        medium: "var(--font-weight-medium, 500)",
        semibold: "var(--font-weight-semibold, 600)",
        bold: "var(--font-weight-bold, 700)",
      },
      fontSize: {
        xs: [
          "var(--font-size-xs, var(--text-xs, 0.75rem))",
          {
            lineHeight: "var(--line-height-xs, var(--text-xs--line-height, 1rem))",
            letterSpacing: "var(--letter-spacing-xs, var(--tracking-xs, 0em))",
          },
        ],
        sm: [
          "var(--font-size-sm, var(--text-sm, 0.875rem))",
          {
            lineHeight: "var(--line-height-sm, var(--text-sm--line-height, 1.25rem))",
            letterSpacing: "var(--letter-spacing-sm, var(--tracking-sm, 0em))",
          },
        ],
        base: [
          "var(--font-size-base, var(--text-base, 1rem))",
          {
            lineHeight: "var(--line-height-base, var(--text-base--line-height, 1.5rem))",
            letterSpacing: "var(--letter-spacing-base, var(--tracking-base, 0em))",
          },
        ],
        lg: [
          "var(--font-size-lg, var(--text-lg, 1.125rem))",
          {
            lineHeight: "var(--line-height-lg, var(--text-lg--line-height, 1.75rem))",
            letterSpacing: "var(--letter-spacing-lg, var(--tracking-lg, 0em))",
          },
        ],
        xl: [
          "var(--font-size-xl, var(--text-xl, 1.25rem))",
          {
            lineHeight: "var(--line-height-xl, var(--text-xl--line-height, 1.75rem))",
            letterSpacing: "var(--letter-spacing-xl, var(--tracking-xl, 0em))",
          },
        ],
        "2xl": [
          "var(--font-size-2xl, var(--text-2xl, 1.5rem))",
          {
            lineHeight: "var(--line-height-2xl, var(--text-2xl--line-height, 2rem))",
            letterSpacing: "var(--letter-spacing-2xl, var(--tracking-2xl, -0.01em))",
          },
        ],
        "3xl": [
          "var(--font-size-3xl, var(--text-3xl, 1.875rem))",
          {
            lineHeight: "var(--line-height-3xl, var(--text-3xl--line-height, 2.25rem))",
            letterSpacing: "var(--letter-spacing-3xl, var(--tracking-3xl, -0.02em))",
          },
        ],
        "4xl": [
          "var(--font-size-4xl, var(--text-4xl, 2.25rem))",
          {
            lineHeight: "var(--line-height-4xl, var(--text-4xl--line-height, 2.5rem))",
            letterSpacing: "var(--letter-spacing-4xl, var(--tracking-4xl, -0.02em))",
          },
        ],
        "5xl": [
          "var(--font-size-5xl, var(--text-5xl, 3rem))",
          {
            lineHeight: "var(--line-height-5xl, var(--text-5xl--line-height, 1))",
            letterSpacing: "var(--letter-spacing-5xl, var(--tracking-5xl, -0.02em))",
          },
        ],
        "6xl": [
          "var(--font-size-6xl, var(--text-6xl, 3.75rem))",
          {
            lineHeight: "var(--line-height-6xl, var(--text-6xl--line-height, 1))",
            letterSpacing: "var(--letter-spacing-6xl, var(--tracking-6xl, -0.02em))",
          },
        ],
      },
      lineHeight: {
        xs: "var(--line-height-xs, var(--text-xs--line-height, 1rem))",
        sm: "var(--line-height-sm, var(--text-sm--line-height, 1.25rem))",
        base: "var(--line-height-base, var(--text-base--line-height, 1.5rem))",
        lg: "var(--line-height-lg, var(--text-lg--line-height, 1.75rem))",
        xl: "var(--line-height-xl, var(--text-xl--line-height, 1.75rem))",
        "2xl": "var(--line-height-2xl, var(--text-2xl--line-height, 2rem))",
        "3xl": "var(--line-height-3xl, var(--text-3xl--line-height, 2.25rem))",
        "4xl": "var(--line-height-4xl, var(--text-4xl--line-height, 2.5rem))",
        "5xl": "var(--line-height-5xl, var(--text-5xl--line-height, 1))",
        "6xl": "var(--line-height-6xl, var(--text-6xl--line-height, 1))",
        tight: "var(--line-height-tight, 1.25)",
        snug: "var(--line-height-snug, 1.375)",
        normal: "var(--line-height-normal, 1.5)",
        relaxed: "var(--line-height-relaxed, 1.625)",
        loose: "var(--line-height-loose, 2)",
      },
      letterSpacing: {
        tighter: "var(--letter-spacing-tighter, -0.05em)",
        tight: "var(--letter-spacing-tight, -0.025em)",
        normal: "var(--letter-spacing-normal, 0em)",
        wide: "var(--letter-spacing-wide, 0.025em)",
        wider: "var(--letter-spacing-wider, 0.05em)",
        widest: "var(--letter-spacing-widest, 0.1em)",
      },
      boxShadow: {
        xs: "var(--shadow-xs, 0 1px 2px 0 rgb(0 0 0 / 0.05))",
        sm: "var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.1))",
        DEFAULT: "var(--shadow-md, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1))",
        md: "var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1))",
        lg: "var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))",
        xl: "var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1))",
        "2xl": "var(--shadow-2xl, 0 25px 50px -12px rgb(0 0 0 / 0.25))",
        inner: "var(--shadow-inner, inset 0 2px 4px 0 rgb(0 0 0 / 0.05))",
        none: "var(--shadow-none, 0 0 #0000)",
      },
      colors: {
        "red-primary": "hsl(var(--red-primary))",
        "red-secondary": "hsl(var(--red-secondary))",
        "orange-primary": "hsl(var(--orange-primary))",
        "orange-secondary": "hsl(var(--orange-secondary))",
        "yellow-primary": "hsl(var(--yellow-primary))",
        "yellow-secondary": "hsl(var(--yellow-secondary))",
        "green-primary": "hsl(var(--green-primary))",
        "green-secondary": "hsl(var(--green-secondary))",
        "cyan-primary": "hsl(var(--cyan-primary))",
        "cyan-secondary": "hsl(var(--cyan-secondary))",
        "blue-primary": "hsl(var(--blue-primary))",
        "blue-secondary": "hsl(var(--blue-secondary))",
        "purple-primary": "hsl(var(--purple-primary))",
        "purple-secondary": "hsl(var(--purple-secondary))",
        "magenta-primary": "hsl(var(--magenta-primary))",
        "magenta-secondary": "hsl(var(--magenta-secondary))",
        "blockquote-background-color": "hsl(var(--blockquote-background-color))",
        "brand-primary": "hsl(var(--brand-primary))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        xs: "var(--radius-xs, 0.125rem)",
        sm: "var(--radius-sm, calc(var(--radius, 0.5rem) - 4px))",
        md: "var(--radius-md, calc(var(--radius, 0.5rem) - 2px))",
        lg: "var(--radius-lg, var(--radius, 0.5rem))",
        xl: "var(--radius-xl, calc(var(--radius, 0.5rem) + 4px))",
        "2xl": "var(--radius-2xl, calc(var(--radius, 0.5rem) + 8px))",
        "3xl": "var(--radius-3xl, calc(var(--radius, 0.5rem) + 12px))",
        "4xl": "var(--radius-4xl, calc(var(--radius, 0.5rem) + 20px))",
        "5xl": "var(--radius-5xl, calc(var(--radius, 0.5rem) + 28px))",
        full: "9999px",
      },
      transitionProperty: {
        colors: "color, background-color, border-color, text-decoration-color, fill, stroke",
        opacity: "opacity",
        shadow: "box-shadow",
        transform: "transform",
        filter: "filter",
        backdrop: "-webkit-backdrop-filter, backdrop-filter",
        size: "width, height",
      },
      transitionDuration: {
        instant: "var(--motion-duration-instant, 10ms)",
        fast: "var(--motion-duration-fast, 150ms)",
        normal: "var(--motion-duration-normal, 200ms)",
        slow: "var(--motion-duration-slow, 250ms)",
        slower: "var(--motion-duration-slower, 400ms)",
      },
      transitionTimingFunction: {
        standard: "var(--motion-ease-standard, cubic-bezier(0.4, 0, 0.2, 1))",
        emphasized: "var(--motion-ease-emphasized, cubic-bezier(0.2, 0, 0, 1))",
        decelerate: "var(--motion-ease-decelerate, cubic-bezier(0, 0, 0.2, 1))",
        accelerate: "var(--motion-ease-accelerate, cubic-bezier(0.4, 0, 1, 1))",
        linear: "var(--motion-ease-linear, linear)",
      },
      zIndex: {
        base: "var(--z-base, 0)",
        dropdown: "var(--z-dropdown, 1000)",
        sticky: "var(--z-sticky, 1020)",
        fixed: "var(--z-fixed, 1030)",
        overlay: "var(--z-overlay, 1040)",
        modal: "var(--z-modal, 1050)",
        popover: "var(--z-popover, 1060)",
        toast: "var(--z-toast, 1080)",
        tooltip: "var(--z-tooltip, 1090)",
        max: "var(--z-max, 2147483647)",
      },
      backdropBlur: {
        none: "var(--backdrop-blur-none, 0)",
        xs: "var(--backdrop-blur-xs, 2px)",
        sm: "var(--backdrop-blur-sm, 4px)",
        DEFAULT: "var(--backdrop-blur-md, 8px)",
        md: "var(--backdrop-blur-md, 8px)",
        lg: "var(--backdrop-blur-lg, 12px)",
        xl: "var(--backdrop-blur-xl, 16px)",
        "2xl": "var(--backdrop-blur-2xl, 24px)",
        "3xl": "var(--backdrop-blur-3xl, 40px)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography")({
      className: "prose",
    }),
  ],
};
export default config;
