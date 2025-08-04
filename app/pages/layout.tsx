export default function MDXLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen ">
      <div className="max-w-4xl mx-auto px-4 py-8 text-left">
        <article className="w-full">{children}</article>

        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm">
          <p>
            © {new Date().getFullYear()} Digests RSS Reader. All rights
            reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
