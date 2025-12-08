import { getMdxMetadata, APP_MDX_DIR, CONTENT_MDX_DIR } from "@/utils/mdx-utils";
import fs from "fs";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { getMDXComponents } from "@/mdx-components";

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
      options: { parseFrontmatter: false },
    });

    return (
      <article className="prose prose-lg dark:prose-invert max-w-none">
        {title && <h1 className="text-3xl font-bold mb-6">{title}</h1>}
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
