import fs from "fs";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getMDXComponents } from "@/mdx-components";
import { APP_MDX_DIR, CONTENT_MDX_DIR, getMdxMetadata } from "@/utils/mdx-utils";

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;
  const components = getMDXComponents({});

  try {
    const { title, content } = getMdxMetadata(slug);

    // Compile the MDX content without frontmatter
    const { content: Content } = await compileMDX({
      source: content,
      components,
      options: {
        parseFrontmatter: false,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [],
        },
      },
    });

    return (
      <article className="prose prose-lg dark:prose-invert max-w-none">
        {title && <h1 className="mb-6 text-display-small text-primary-content">{title}</h1>}
        {Content}
      </article>
    );
  } catch (error) {
    console.error(`Error rendering page for slug: ${slug}`, error);
    notFound();
  }
}

export async function generateStaticParams() {
  const slugs = new Set();

  [APP_MDX_DIR, CONTENT_MDX_DIR].forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir)
        .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
        .forEach((file) => slugs.add({ slug: file.replace(/\.mdx?$/, "") }));
    }
  });

  return Array.from(slugs);
}

export const dynamicParams = false;
