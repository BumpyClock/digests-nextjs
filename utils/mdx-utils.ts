import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Define content directories
export const APP_MDX_DIR = path.join(process.cwd(), "app/pages");
export const CONTENT_MDX_DIR = path.join(process.cwd(), "content/pages");
const DIRECT_MDX_PAGES = ["terms"]; // Add direct MDX pages here that aren't in the dynamic route

export interface MdxMetadata {
  title: string;
  description: string;
  content: string;
  [key: string]: unknown;
}

/**
 * Find MDX file by slug
 */
export function findMdxFile(slug: string) {
  const possiblePaths = [
    path.join(APP_MDX_DIR, `${slug}.mdx`),
    path.join(APP_MDX_DIR, `${slug}.md`),
    path.join(CONTENT_MDX_DIR, `${slug}.mdx`),
    path.join(CONTENT_MDX_DIR, `${slug}.md`),
  ];

  return possiblePaths.find((p) => fs.existsSync(p));
}

/**
 * Format a slug as a title
 */
export function formatTitle(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get MDX file metadata and content by slug
 */
export function getMdxMetadata(slug: string): MdxMetadata {
  try {
    const filePath = findMdxFile(slug);
    if (!filePath) {
      console.warn(`No MDX file found for slug: ${slug}`);
      return {
        title: formatTitle(slug),
        description: "",
        content: "",
      };
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      if (!fileContent) {
        console.error(`Empty file content for slug: ${slug}`);
        throw new Error("Empty file content");
      }

      try {
        const { data, content } = matter(fileContent);
        if (!content) {
          console.warn(`No content found in MDX file for slug: ${slug}`);
        }

        return {
          title: data?.title || formatTitle(slug),
          description: data?.description || "",
          content: content || "",
          ...data,
        };
      } catch (matterError) {
        console.error(`Error parsing frontmatter for slug: ${slug}`, matterError);
        throw matterError;
      }
    } catch (readError) {
      console.error(`Error reading file for slug: ${slug}`, readError);
      throw readError;
    }
  } catch (error) {
    console.error(`Error in getMdxMetadata for slug: ${slug}`, error);
    return {
      title: formatTitle(slug),
      description: "",
      content: "",
    };
  }
}

/**
 * Get all available MDX pages
 */
export function getAllMdxPages() {
  const pages = new Set();

  [APP_MDX_DIR, CONTENT_MDX_DIR].forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir)
        .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
        .forEach((file) => pages.add(file.replace(/\.mdx?$/, "")));
    }
  });

  DIRECT_MDX_PAGES.forEach((page) => pages.add(page));

  return Array.from(pages).map((slug) => ({
    slug: String(slug),
    ...getMdxMetadata(String(slug)),
  }));
}
