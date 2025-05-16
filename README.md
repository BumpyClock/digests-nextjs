# Digests

Digests is an open-source RSS reader built with Next.js. It lets you subscribe to feeds and read articles in a clean interface that works offline. Web workers handle feed fetching and other heavy tasks so the UI stays responsive.

## Features
- Subscribe to and manage RSS feeds
- Search across feeds and articles
- Mark items as read or save them for later
- Offline-first caching using localforage
- Customizable themes

## Prerequisites
- Node.js 18 or later
- [pnpm](https://pnpm.io/) package manager

## Setup
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Generate theme CSS variables:
   ```bash
   pnpm generate:themes
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
   Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Key directories
- `app/` – Next.js app router files, layout, and global styles
- `components/` – Reusable UI components
- `store/` – Zustand stores for application state
- `services/` – Helper utilities including the worker service
- `workers/` – Web workers for RSS parsing and shadow generation

## Generating themes
Run `pnpm generate:themes` whenever theme colors change. This script outputs `app/generated-themes.css`, which the application imports at startup. Theme colors are defined in `lib/theme-definitions.ts`.

## Deployment
Build and start the app with:
```bash
pnpm build
pnpm start
```
You can also deploy to platforms like Vercel using their standard Next.js workflow.
