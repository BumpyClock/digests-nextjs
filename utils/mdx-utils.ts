import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Define content directories
const APP_MDX_DIR = path.join(process.cwd(), 'app/pages');
const CONTENT_MDX_DIR = path.join(process.cwd(), 'content/pages');
const DIRECT_MDX_PAGES = ['terms']; // Add direct MDX pages here that aren't in the dynamic route

// Add this interface near the top of the file
interface MdxMetadata {
  title: string;
  description: string;
  [key: string]: any; // For any additional frontmatter data
}

/**
 * Get all available MDX pages
 */
export function getAllMdxPages() {
  const pages = new Set();
  
  // Add pages from the app/pages directory
  if (fs.existsSync(APP_MDX_DIR)) {
    fs.readdirSync(APP_MDX_DIR)
      .filter(file => file.endsWith('.mdx') || file.endsWith('.md'))
      .forEach(file => {
        pages.add(file.replace(/\.mdx?$/, ''));
      });
  }
  
  // Add pages from the content/pages directory
  if (fs.existsSync(CONTENT_MDX_DIR)) {
    fs.readdirSync(CONTENT_MDX_DIR)
      .filter(file => file.endsWith('.mdx') || file.endsWith('.md'))
      .forEach(file => {
        pages.add(file.replace(/\.mdx?$/, ''));
      });
  }
  
  // Add direct MDX pages
  DIRECT_MDX_PAGES.forEach(page => pages.add(page));
  
  return Array.from(pages).map(slug => ({
    slug: String(slug),
    ...getMdxMetadata(String(slug))
  }));
}

/**
 * Get MDX file metadata by slug
 */
export function getMdxMetadata(slug: string): MdxMetadata {
  try {
    const filePath = findMdxFile(slug);
    if (!filePath) {
      return { 
        title: formatTitle(slug),
        description: '' // Provide default empty description
      };
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContent);
    
    return {
      title: data.title || formatTitle(slug),
      description: data.description || '',
      ...data
    };
  } catch (error) {
    return { 
      title: formatTitle(slug),
      description: '' // Provide default empty description
    };
  }
}

/**
 * Find MDX file by slug
 */
export function findMdxFile(slug: string) {
  // Possible file paths
  const possiblePaths = [
    path.join(APP_MDX_DIR, `${slug}.mdx`),
    path.join(APP_MDX_DIR, `${slug}.md`),
    path.join(CONTENT_MDX_DIR, `${slug}.mdx`),
    path.join(CONTENT_MDX_DIR, `${slug}.md`),
  ];
  
  // Find first existing path
  return possiblePaths.find(p => fs.existsSync(p));
}

/**
 * Format a slug as a title
 */
function formatTitle(slug: string) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}