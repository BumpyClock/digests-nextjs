// ABOUTME: OPML generation, parsing, export, and feed URL validation utilities.
// ABOUTME: Used by the settings page for import/export of feed subscriptions.

import type { Feed } from "@/types";
import type { Subscription } from "@/types/subscription";
import { isHttpUrl } from "@/utils/url";

export interface OPMLFeedItem {
  url: string;
  title: string;
  isSubscribed: boolean;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function generateOPML(feeds: Array<Feed | Subscription>): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>Digests Feed Subscriptions</title>
  </head>
  <body>
    ${feeds
      .map((feed) => {
        const feedType = "type" in feed ? feed.type : "rss";
        const feedTitle = feed.feedTitle || "";
        const feedUrl = feed.feedUrl || "";

        return `
    <outline 
      type="${escapeXml(feedType || "rss")}"
      text="${escapeXml(feedTitle)}"
      title="${escapeXml(feedTitle)}"
      xmlUrl="${escapeXml(feedUrl)}"
      htmlUrl="${escapeXml(feedUrl)}"
    />`;
      })
      .join("")}
  </body>
</opml>`;
}

export function downloadBlob(content: string, filename: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportOPML(feeds: Array<Feed | Subscription>): void {
  const opml = generateOPML(feeds);
  downloadBlob(opml, "digests-subscriptions.opml", "text/xml");
}

/**
 * Extracts and deduplicates feed URLs from a parsed OPML document.
 * Each feed is marked as already-subscribed when its URL appears in existingUrls.
 */
export function parseFeedsFromDocument(doc: Document, existingUrls: Set<string>): OPMLFeedItem[] {
  const outlines = doc.querySelectorAll("outline");
  const uniqueFeeds = new Map<string, OPMLFeedItem>();

  outlines.forEach((outline) => {
    const feedUrl = outline.getAttribute("xmlUrl");
    const title = outline.getAttribute("title") || outline.getAttribute("text") || feedUrl || "";
    const trimmedFeedUrl = feedUrl?.trim() ?? "";
    if (isHttpUrl(trimmedFeedUrl)) {
      uniqueFeeds.set(trimmedFeedUrl, {
        url: trimmedFeedUrl,
        title,
        isSubscribed: existingUrls.has(trimmedFeedUrl),
      });
    }
  });

  return Array.from(uniqueFeeds.values());
}

export interface DeduplicateUrlsResult {
  urls: string[];
  invalidCount: number;
  duplicateCount: number;
}

/**
 * Validates, trims, and deduplicates a list of URL strings.
 * Returns the unique valid URLs along with counts of invalid/duplicate entries.
 */
export function deduplicateUrls(selectedUrls: string[]): DeduplicateUrlsResult {
  const seen = new Set<string>();
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const url of selectedUrls) {
    const trimmed = url.trim();
    if (!isHttpUrl(trimmed)) {
      invalidCount++;
    } else if (seen.has(trimmed)) {
      duplicateCount++;
    } else {
      seen.add(trimmed);
    }
  }

  return { urls: Array.from(seen), invalidCount, duplicateCount };
}
