/**
 * Content cleanup helpers that are independent of image deduplication.
 */

const escapeRegExp = (string: string): string => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ExtractedAuthor {
  name: string;
  image?: string;
}

/**
 * Removes redundant title/author/source metadata from markdown and extracts author info.
 */
export function cleanupMarkdownMetadata(
  markdown: string,
  title?: string,
  author?: string,
  siteName?: string
): { cleanedMarkdown: string; extractedAuthor?: ExtractedAuthor } {
  if (!markdown) return { cleanedMarkdown: markdown };

  let cleaned = markdown;

  if (title) {
    const esc = escapeRegExp(title);
    const titlePattern = new RegExp(
      `^#{1,6}\\s*${esc}\\s*\n+|^\\*\\*${esc}\\*\\*\\s*\n+|^${esc}\\s*\n[=\\-]{3,}\\s*\n+`,
      "i"
    );
    cleaned = cleaned.replace(titlePattern, "");
  }

  if (author) {
    const esc = escapeRegExp(author);
    const authorPattern = new RegExp(
      `^\\s*By\\s+\\*\\*?${esc}\\*\\*?\\s*\n+|^\\s*Author:\\s*\\*\\*?${esc}\\*\\*?\\s*\n+|^\\s*\\*\\*?By\\s+${esc}\\*\\*?\\s*\n+|^\\s*\\*${esc}\\*\\s*\n+|\\*\\*By\\s+${esc}\\*\\*`,
      "gim"
    );
    cleaned = cleaned.replace(authorPattern, "\n");
  }

  if (siteName) {
    const esc = escapeRegExp(siteName);
    const sourcePattern = new RegExp(
      `^\\s*Source:\\s*\\*\\*?${esc}\\*\\*?\\s*\n+|^\\s*Originally\\s+published\\s+(?:at|on)\\s+\\*\\*?${esc}\\*\\*?\\s*\n+|^\\s*From\\s+\\*\\*?${esc}\\*\\*?\\s*\n+|\\*\\*${esc}\\*\\*`,
      "gim"
    );
    cleaned = cleaned.replace(sourcePattern, "\n");
  }

  const genericPattern =
    /^\s*\*\*Author:\*\*\s*[^|\n]+\s*\|\s*\*\*Source:\*\*\s*[^.\n]+\s*\n+|^\s*Author:\s*[^|\n]+\s*\|\s*Source:\s*[^.\n]+\s*\n+|^\s*\*\*Author:\*\*\s*[^.\n]+\s*\n+|^\s*\*\*Source:\*\*\s*[^.\n]+\s*\n+|^\s*By\s+[^.\n]+\s*\n+|^\s*Source:\s*[^.\n]+\s*\n+|^\s*Author:\s*[^.\n]+\s*\n+|^\s*Originally\s+published\s+(?:at|on)\s+[^.\n]+\s*\n+|^\s*\*{1,2}Originally\s+published.*?\*{1,2}\s*\n+|^\s*---+\s*\n+/gim;
  cleaned = cleaned.replace(genericPattern, "\n");

  const authorNames = new Set<string>();
  let extractedAuthor: ExtractedAuthor | undefined;

  if (author) {
    authorNames.add(author.toLowerCase().trim());
    extractedAuthor = { name: author };
  }

  const authorExtractionPatterns = [
    /(?:\*\*)?Author:(?:\*\*)?\s*([^|\n]+?)(?:\s*\||\s*\n)/gi,
    /(?:\*\*)?By\s+([^.\n]+?)(?:\s*\n)/gi,
  ];

  authorExtractionPatterns.forEach((pattern) => {
    let match: RegExpExecArray | null = pattern.exec(markdown);
    while (match !== null) {
      const extractedAuthorName = match[1].trim();
      const extractedAuthorLower = extractedAuthorName.toLowerCase();
      if (extractedAuthorName && !extractedAuthor) {
        extractedAuthor = { name: extractedAuthorName };
      }
      if (extractedAuthorLower) {
        authorNames.add(extractedAuthorLower);
        const nameParts = extractedAuthorLower.split(/\s+/);
        if (nameParts.length > 1) {
          authorNames.add(nameParts[0]);
          authorNames.add(nameParts[nameParts.length - 1]);
        }
      }

      match = pattern.exec(markdown);
    }
  });

  if (authorNames.size > 0) {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    cleaned = cleaned.replace(imageRegex, (match, altText, imageUrl) => {
      if (altText && imageUrl) {
        const altLower = altText.toLowerCase().trim();
        for (const authorName of authorNames) {
          if (altLower.includes(authorName) || authorName.includes(altLower)) {
            if (extractedAuthor && !extractedAuthor.image) {
              extractedAuthor.image = imageUrl;
            }
            return "";
          }
        }
      }
      return match;
    });
  }

  cleaned = cleaned.replace(/^\s*\n+/, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return {
    cleanedMarkdown: cleaned.trim(),
    extractedAuthor,
  };
}
