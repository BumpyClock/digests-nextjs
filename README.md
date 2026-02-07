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
- [Bun](https://bun.sh/) package manager/runtime

## Setup
1. Install dependencies:
   ```bash
   bun install
   ```
2. Generate theme CSS variables:
   ```bash
   bun run generate:themes
   ```
3. Start the development server:
   ```bash
   bun run dev
   ```
   Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Key directories
- `app/` – Next.js app router files, layout, and global styles
- `components/` – Reusable UI components
- `store/` – Zustand stores for application state
- `services/` – Helper utilities including the worker service
- `workers/` – Web workers for RSS parsing and shadow generation

## Generating themes
Run `bun run generate:themes` whenever theme colors change. This script outputs `app/generated-themes.css`, which the application imports at startup. Theme colors are defined in `lib/theme-definitions.ts`.

## Deployment
Build and start the app with:
```bash
bun run build
bun run start
```
You can also deploy to platforms like Vercel using their standard Next.js workflow.

## Toast notifications
The custom `useToast` hook automatically removes dismissed toasts after five
seconds. You can adjust this delay by editing `TOAST_REMOVE_DELAY` in
`hooks/use-toast.ts`.
