import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { notFound } from 'next/navigation';

// Get content directories
const APP_MDX_DIR = path.join(process.cwd(), 'app/pages');
const CONTENT_MDX_DIR = path.join(process.cwd(), 'content/pages');

const findMdxFile = (slug: string) => {
  const possiblePaths = [
    path.join(APP_MDX_DIR, `${slug}.mdx`),
    path.join(APP_MDX_DIR, `${slug}.md`),
    path.join(CONTENT_MDX_DIR, `${slug}.mdx`),
    path.join(CONTENT_MDX_DIR, `${slug}.md`),
  ];

  const filePath = possiblePaths.find(p => fs.existsSync(p));
  return filePath;
};

// Function to get page metadata
export async function getPageMetadata(slug: string) {
  try {
    const filePath = findMdxFile(slug);
    if (!filePath) {
      throw new Error(`File not found for slug: ${slug}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContent);
    return data;
  } catch (error) {
    console.error(`Error getting page metadata for slug: ${slug}`, error);
    return { title: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ') };
  }
}

export default async function Page(
  props: {
    params: Promise<{ slug: string }>
  }
) {
  const params = await props.params;
  const slug = params.slug;

  try {
    try {
      const { default: Content } = await import(`@/app/pages/${slug}.mdx`);
      const metadata = await getPageMetadata(slug);
      return (
        <article className="prose prose-lg dark:prose-invert max-w-none">
          {metadata.title && <h1 className="text-3xl font-bold mb-6">{metadata.title}</h1>}
          <Content />
        </article>
      );
    } catch (appError) {
      try {
        console.error(`Error getting page metadata for slug: ${slug}`, appError);
        const { default: Content } = await import(`@/content/pages/${slug}.md`);
        const metadata = await getPageMetadata(slug);
        return (
          <article className="prose prose-lg dark:prose-invert max-w-none">
            {metadata.title && <h1 className="text-3xl font-bold mb-6">{metadata.title}</h1>}
            <Content />
          </article>
        );
      } catch (contentError) {
        console.error(`Error getting page metadata for slug: ${slug}`, contentError);
        throw new Error(`MDX file not found for slug: ${slug}`);
      }
    }
  } catch (error) {
    console.error(`Error getting page metadata for slug: ${slug}`, error);
    notFound();
  }
}

export async function generateStaticParams() {
  const dirs = [APP_MDX_DIR, CONTENT_MDX_DIR];
  const slugs = new Set();
  
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir)
        .filter(file => file.endsWith('.mdx') || file.endsWith('.md'))
        .forEach(file => {
          slugs.add({ slug: file.replace(/\.mdx?$/, '') });
        });
    }
  }
  
  return Array.from(slugs);
}
 
export const dynamicParams = false;