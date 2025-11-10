// Main component
export { ArticleReader, LoadingSkeleton, EmptyState, processArticleContent } from "./ArticleReader";

// Sub-components (now in separate files)
export { ArticleImage } from "./ArticleImage";
export { ArticleHeader } from "./ArticleHeader";
export { ArticleActions } from "./ArticleActions";
export { ArticleContent } from "./ArticleContent";
export { ArticleMetadata } from "./ArticleMetadata";
export { SiteFavicon } from "./SiteFavicon";

// Hooks
export { useArticleActions } from "./hooks/use-article-actions";