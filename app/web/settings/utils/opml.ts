import type { Feed } from "@/types";
import type { Subscription } from "@/types/subscription";

export function generateOPML(feeds: Array<Feed | Subscription>): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>Digests Feed Subscriptions</title>
  </head>
  <body>
    ${feeds
      .map(
        (feed) => `
    <outline 
      type="${(feed as Feed).type || "rss"}"
      text="${feed.feedTitle || ""}"
      title="${feed.feedTitle || ""}"
      xmlUrl="${feed.feedUrl}"
      htmlUrl="${feed.feedUrl || ""}"
    />`
      )
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
