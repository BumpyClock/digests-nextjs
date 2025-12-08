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
      <h1 className="text-3xl font-bold mb-8">Static Pages</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {pages.map((page) => (
          <Link
            key={page.slug}
            href={`/pages/${page.slug}`}
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">{page.title}</h2>
            {"description" in page && (
              <p className="text-gray-600 dark:text-gray-300">{page.description}</p>
            )}
          </Link>
        ))}

        {/* Add direct MDX pages that aren't in the dynamic route */}
        <Link
          href="/terms"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Terms of Service</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Terms and conditions for using our service
          </p>
        </Link>
      </div>
    </div>
  );
}
