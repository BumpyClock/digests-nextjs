import { FeedItem } from "@/types";

export interface ScrollData {
  scrollTop: number;
  scrollHeight?: number;
  clientHeight?: number;
}

export interface ImageAttributes {
  src: string;
  alt: string;
  width?: string;
  height?: string;
  className?: string;
  isSmall: boolean;
}

export type ReaderLayout = "modal" | "standard" | "compact";

export interface ReaderViewProps {
  feedItem: FeedItem | null;
  onScroll?: (data: ScrollData) => void;
}
