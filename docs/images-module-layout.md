# Images module layout and export surface

Read when:
- You create or move image-related helper utilities.
- You touch `ArticleImage`, `PodcastArtwork`, `SiteFavicon`, or any image cleanup flow.
- You define new CDN/URL transforms for images.

## Layout

- `utils/images/index.ts` (canonical public barrel)
- `utils/images/image-config.ts`
- `utils/images/image-url.ts`
- `utils/images/imageDeduplicator.ts`
- `utils/images/imagekit.ts`

## Canonical export surface

Import from `@/utils/images` for stable callsites:

```ts
export { canUseImageKit, getImageKitUrl, IMAGE_PRESETS } from "./imagekit";
export type { ImageKitTransformOptions } from "./imagekit";
export { isValidImageUrl, normalizeImageUrl } from "./image-url";
export { IMAGE_SIZES, IMAGE_LOADING, getImageProps } from "./image-config";
export {
  deduplicateMarkdownImages,
  deduplicateHtmlImages,
  cleanupMarkdownContent,
  cleanupMarkdownMetadata,
} from "./imageDeduplicator";
```

## Export policy

- Prefer barrel exports via `@/utils/images` for cross-cutting image utility usage.
- Add a new function to the matching module under `utils/images/` and re-export it from `index.ts`.
- Keep deep `@/utils/images/<module>` imports to cases that truly need one specific concern.
