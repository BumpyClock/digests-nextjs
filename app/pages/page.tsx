import Link from "next/link";
import { getAllMdxPages } from "@/utils/mdx-utils";

export const metadata = {
  title: "MDX Pages",
  description: "Static pages built with MDX",
};

export default async function MDXIndex() {
  const pages = getAllMdxPages();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="mb-8 text-display-small text-primary-content">Static Pages</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {pages.map((page) => (
          <Link
            key={page.slug}
            href={`/pages/${page.slug}`}
            className="block rounded-lg border border-border bg-card p-6 shadow-sm transition-token-shadow duration-token-fast hover:shadow-md"
          >
            <h2 className="mb-2 text-title text-primary-content">{page.title}</h2>
            {"description" in page && (
              <p className="text-body text-secondary-content">{page.description}</p>
            )}
          </Link>
        ))}

        {/* Add direct MDX pages that aren't in the dynamic route */}
        <Link
          href="/terms"
          className="block rounded-lg border border-border bg-card p-6 shadow-sm transition-token-shadow duration-token-fast hover:shadow-md"
        >
          <h2 className="mb-2 text-title text-primary-content">Terms of Service</h2>
          <p className="text-body text-secondary-content">
            Terms and conditions for using our service
          </p>
        </Link>
      </div>
    </div>
  );
}
