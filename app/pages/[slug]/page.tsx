import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { notFound } from 'next/navigation';

// Dynamic imports for MDX content
const MDXComponents = {
  'privacy-policy': () => import('@/app/pages/privacy-policy.mdx'),
  // Add more MDX files here as you create them
};

// Function to get page metadata
export async function getPageMetadata(slug: string) {
  try {
    const filePath = path.join(process.cwd(), 'app/content', `${slug}.mdx`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContent);
    return data;
  } catch (error) {
    return { title: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ') };
  }
}

export default async function Page({
    params,
  }: {
    params: { slug: string }
  }) {
    const { slug } = params
    try {
      const { default: Post } = await import(`@/app/content/${slug}.mdx`)
      return (
        <div className="container mx-auto px-4 py-8">
          <Post />
        </div>
      )
    } catch (error) {
      notFound()
    }
  }
   
  export async function generateStaticParams() {
    const contentDirectory = path.join(process.cwd(), 'app/pages')
    const files = fs.readdirSync(contentDirectory)
      .filter(file => file.endsWith('.mdx'))
      .map(file => ({
        slug: file.replace('.mdx', '')
      }))
    
    return files
  }
   
  export const dynamicParams = false