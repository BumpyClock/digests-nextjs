import type { ReactNode } from "react";

export default function MDXLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen ">
      <div className="max-w-4xl mx-auto px-4 py-8 text-left">
        <article className="w-full">{children}</article>

        <footer className="mt-12 border-t border-border pt-6 text-body-small text-secondary-content">
          <p>© {new Date().getFullYear()} Digests RSS Reader. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
