// ABOUTME: Custom MDX component mappings for links, images, and typography.
// ABOUTME: Enhances MDX rendering with Next.js Link/Image and styled elements.
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export function getMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({
      href = "#",
      children,
      ...props
    }: { href?: string; children?: ReactNode } & ComponentProps<"a">) => {
      try {
        if (href.startsWith("/")) {
          return (
            <Link className="block text-left" href={href} {...props}>
              {children}
            </Link>
          );
        }
        return (
          <a
            className="block text-left"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        );
      } catch (error) {
        console.error("Error in MDX anchor component:", error);
        return null;
      }
    },
    img: ({ src, alt = "", ...props }) => {
      try {
        if (!src) return null;
        return (
          <Image
            src={src}
            alt={alt}
            width={600}
            height={400}
            className="rounded-md my-4"
            style={{ objectFit: "contain" }}
            {...props}
          />
        );
      } catch (error) {
        console.error("Error in MDX image component:", error);
        return null;
      }
    },
    h1: ({ children }) => {
      try {
        return children ? (
          <h1 className="mt-8 mb-4 text-display-small text-primary-content">{children}</h1>
        ) : null;
      } catch (error) {
        console.error("Error in MDX h1 component:", error);
        return null;
      }
    },
    h2: ({ children }) => {
      try {
        return children ? (
          <h2 className="mt-6 mb-3 text-title-large text-primary-content">{children}</h2>
        ) : null;
      } catch (error) {
        console.error("Error in MDX h2 component:", error);
        return null;
      }
    },
    h3: ({ children }) => {
      try {
        return children ? (
          <h3 className="mt-4 mb-2 text-title text-primary-content">{children}</h3>
        ) : null;
      } catch (error) {
        console.error("Error in MDX h3 component:", error);
        return null;
      }
    },
    p: ({ children }) => {
      try {
        return children ? <p className="my-4">{children}</p> : null;
      } catch (error) {
        console.error("Error in MDX paragraph component:", error);
        return null;
      }
    },
    ul: ({ children }) => {
      try {
        return children ? (
          <ul className="list-disc pl-6 my-4 text-left w-auto">{children}</ul>
        ) : null;
      } catch (error) {
        console.error("Error in MDX ul component:", error);
        return null;
      }
    },
    ol: ({ children }) => {
      try {
        return children ? (
          <ol className="list-decimal pl-6 my-4 text-left w-auto">{children}</ol>
        ) : null;
      } catch (error) {
        console.error("Error in MDX ol component:", error);
        return null;
      }
    },
    li: ({ children }) => {
      try {
        return children ? <li className="text-left">{children}</li> : null;
      } catch (error) {
        console.error("Error in MDX li component:", error);
        return null;
      }
    },
    code: ({ children }) => {
      try {
        return children ? (
          <code className="rounded bg-muted px-1 py-0.5 text-code text-primary-content">
            {children}
          </code>
        ) : null;
      } catch (error) {
        console.error("Error in MDX code component:", error);
        return null;
      }
    },
    pre: ({ children }) => {
      try {
        return children ? (
          <pre className="my-4 overflow-x-auto rounded bg-muted p-4 text-code text-primary-content">
            {children}
          </pre>
        ) : null;
      } catch (error) {
        console.error("Error in MDX pre component:", error);
        return null;
      }
    },
    blockquote: ({ children }) => {
      try {
        return children ? (
          <blockquote className="my-4 border-l-4 border-border pl-4 italic text-secondary-content">
            {children}
          </blockquote>
        ) : null;
      } catch (error) {
        console.error("Error in MDX blockquote component:", error);
        return null;
      }
    },
    ...components,
  };
}
