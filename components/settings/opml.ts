import type { Feed } from "@/types"

export function generateOPML(feeds: Feed[]): string {
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
      type="${feed.type || "rss"}"
      text="${feed.feedTitle || ""}"
      title="${feed.feedTitle || ""}"
      xmlUrl="${feed.feedUrl}"
      htmlUrl="${feed.feedUrl || ""}"
    />`
      )
      .join("")}
  </body>
</opml>`
}

export function downloadBlob(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
