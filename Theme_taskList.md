# Theme System Implementation Task List

This task list outlines the steps to implement a new, simplified theme system for the digests-nextjs project, allowing for easier addition of future color schemes.

## Phase 1: Define Themes and Generate CSS

-   [ ] **Define Core Color Palette Structure:**
    -   [ ] Identify the necessary semantic color keys based on `app/globals.css`: `background`, `foreground`, `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `muted`, `mutedForeground`, `destructive`, `destructiveForeground`, `border`, `ring`, `popoverForeground`, `brandPrimary`, `blockquoteBackground`.
    -   [ ] Decide on HSL strings (e.g., `'hsl(48 100% 97%)'`) as the standard format for color values.
-   [ ] **Create Centralized Theme Definitions (`lib/theme-definitions.ts`):**
    -   [ ] Create the new file `lib/theme-definitions.ts`.
    -   [ ] Define a `CoreColors` TypeScript interface using the keys identified above.
    -   [ ] Define a `ThemeDefinition` TypeScript interface with `name: string`, `displayName: string`, and `coreColors: CoreColors`.
    -   [ ] Create and export a `themes: ThemeDefinition[]` array.
    -   [ ] Populate the `themes` array with definitions for:
        -   [ ] `flexoki-light` (using HSL values derived from the current `:root` in `app/globals.css`).
        -   [ ] `flexoki-dark` (using HSL values derived from the current `.dark` in `app/globals.css`).
        -   [ ] `standard-light` (define appropriate standard light HSL values).
        -   [ ] `standard-dark` (define appropriate standard dark HSL values).
        -   [ ] `dracula-light` (define or find appropriate Dracula light HSL values).
        -   [ ] `dracula-dark` (define or find appropriate Dracula dark HSL values).
-   [ ] **Install Color Manipulation Library:**
    -   [ ] Run `pnpm add -D tinycolor2 @types/tinycolor2` in the terminal.
-   [ ] **Develop Theme Generation Script (`scripts/generate-theme-css.mjs`):**
    -   [ ] Create the new file `scripts/generate-theme-css.mjs`.
    -   [ ] Import `themes` from `lib/theme-definitions.ts`.
    -   [ ] Import `tinycolor2` and Node.js `fs` module.
    -   [ ] Implement a `generateCssVariables(coreColors: CoreColors): Record<string, string>` function:
        -   [ ] Ensure it accepts `coreColors` as input.
        -   [ ] Ensure it returns an object mapping *all* required CSS variable names (e.g., `--background`, `--card`, `--primary`, `--red-primary`, etc.) to their calculated HSL string values.
        -   [ ] Implement direct mapping for core colors (e.g., `coreColors.background` -> `--background`).
        -   [ ] Implement logic to derive other variables (e.g., `--card`, `--popover`, `--accent`, `--input`, `--card-foreground`). Use defaults based on core colors where appropriate.
        -   [ ] Decide how to handle the full color palette (`--red-primary`, etc.) - either derive them or use fixed palettes based on theme type (light/dark).
    -   [ ] Implement logic to loop through the imported `themes` array.
    -   [ ] Inside the loop, call `generateCssVariables` for each theme.
    -   [ ] Format the output of `generateCssVariables` into CSS rulesets: `html[data-theme='theme-name'] { /* variables */ }`.
    -   [ ] Select a default theme (e.g., `flexoki-light`).
    -   [ ] Generate a `:root { /* variables */ }` block using the variables for the chosen default theme.
    -   [ ] Combine the `:root` block and all `html[data-theme='...']` rulesets into a single CSS string.
    -   [ ] Write the final CSS string to `app/generated-themes.css`.
-   [ ] **Integrate Generated CSS:**
    -   [ ] Add a script command to `package.json`: `"generate:themes": "node scripts/generate-theme-css.mjs"`.
    -   [ ] Run `pnpm generate:themes` to create the initial `app/generated-themes.css`.
    -   [ ] In `app/layout.tsx`, add `import './generated-themes.css';` (ensure it's imported *after* `globals.css`).
    -   [ ] Edit `app/globals.css`: Remove the `@layer base { :root { ... } .dark { ... } }` block containing the theme variables. Keep only non-theme global styles.

## Phase 2: Update React Components

-   [ ] **Update Theme Provider (`components/theme-provider.tsx`):**
    -   [ ] Import `themes` from `lib/theme-definitions.ts`.
    -   [ ] Generate the list of theme names dynamically: `const themeNames = themes.map(t => t.name);`.
    -   [ ] Update the `NextThemesProvider` component props:
        -   [ ] Set `themes={themeNames}`.
        -   [ ] Ensure `attribute="data-theme"` is set.
        -   [ ] Set `defaultTheme="system"` (or preferred default).
-   [ ] **Update Appearance Settings UI (`app/web/settings/components/tabs/appearance-tab.tsx`):**
    -   [ ] Import `useTheme` from `next-themes`.
    -   [ ] Import `themes` from `lib/theme-definitions.ts`.
    -   [ ] Import necessary Shadcn UI components (`Select`, `SelectTrigger`, etc.).
    -   [ ] Get theme state using `const { theme, setTheme } = useTheme();`.
    -   [ ] Remove the old `div` containing the "Dark Mode" `Switch`.
    -   [ ] Add a new `div` with a `Label` ("Theme") and the `Select` component.
    -   [ ] Configure the `Select` component:
        -   [ ] Set `value={theme}`.
        -   [ ] Set `onValueChange={setTheme}`.
        -   [ ] Add a static `SelectItem` for `"system"`.
        -   [ ] Map over the `themes` array to generate `SelectItem`s for each theme, using `t.name` as the `value` and `t.displayName` as the label.
-   [ ] **Update Mode Toggle (`components/mode-toggle.tsx`):**
    -   [ ] Import `themes` from `lib/theme-definitions.ts`.
    -   [ ] Remove the hardcoded "Light", "Dark", "System" `DropdownMenuItem`s.
    *   [ ] Add a `DropdownMenuItem` for "System" that calls `setTheme('system')`.
    -   [ ] Map over the `themes` array to create a `DropdownMenuItem` for each theme:
        -   [ ] Use `t.displayName` as the label.
        -   [ ] Call `setTheme(t.name)` in the `onSelect` (or `onClick`) handler.

## Phase 3: Verification

-   [ ] **Testing:**
    -   [ ] Run the development server (`pnpm dev`).
    -   [ ] Navigate to the Settings -> Appearance page.
    -   [ ] Verify the "Theme" `Select` dropdown is present and correctly populated with all defined themes plus "System".
    -   [ ] Select each theme from the dropdown and verify the UI colors update correctly across different pages and components (header, cards, buttons, inputs, reader view, modals, etc.).
    -   [ ] Test the "System" option: Change the OS light/dark preference and verify the application theme updates accordingly.
    -   [ ] Test the theme toggle button (`ModeToggle`) in the header: Verify it cycles through or allows selection of all themes correctly.
    -   [ ] Check for any console errors related to theming.
    -   [ ] Briefly check color contrast and readability for each theme.
