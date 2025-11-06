"use client";

import React, { memo, useMemo } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import type { Components as MarkdownComponents } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Skeleton } from "@/components/ui/skeleton";
import { sanitizeReaderContent } from "@/utils/htmlSanitizer";

interface ArticleContentProps {
  /** HTML content */
  content: string;
  /** Markdown content (preferred) */
  markdown?: string;
  /** Optional className */
  className?: string;
  /** Loading state */
  loading?: boolean;
}

/**
 * Renders article content with markdown support
 * Handles both HTML content and markdown
 * Extracted from ArticleReader to follow SRP
 */
export const ArticleContent = memo<ArticleContentProps>(
  ({ content, markdown, className, loading = false }) => {
    // Sanitize HTML once per content change to avoid heavy work on re-renders
    const sanitizedHtml = useMemo(() => {
      return sanitizeReaderContent(content);
    }, [content]);

    // Custom components for react-markdown with enhanced styling for reader view
    const components = useMemo<MarkdownComponents>(
      () => ({
        h1: ({ children, ...props }: React.ComponentProps<"h1">) => (
          <h1
            {...props}
            className="text-fluid-3xl font-bold mt-8 mb-6 leading-fluid-tight"
          >
            {children}
          </h1>
        ),
        h2: ({ children, ...props }: React.ComponentProps<"h2">) => (
          <h2
            {...props}
            className="text-fluid-2xl font-semibold mt-8 mb-4 leading-fluid-tight"
          >
            {children}
          </h2>
        ),
        h3: ({ children, ...props }: React.ComponentProps<"h3">) => (
          <h3
            {...props}
            className="text-fluid-xl font-semibold mt-6 mb-3 leading-fluid-tight"
          >
            {children}
          </h3>
        ),
        h4: ({ children, ...props }: React.ComponentProps<"h4">) => (
          <h4
            {...props}
            className="text-fluid-lg font-semibold mt-4 mb-2 leading-fluid-normal"
          >
            {children}
          </h4>
        ),
        p: ({ children, ...props }: React.ComponentProps<"p">) => {
          // Check if children contains images and handle differently
          const hasImages = React.Children.toArray(children).some(
            (child) => React.isValidElement(child) && child.type === "img"
          );

          if (hasImages) {
            return (
              <div {...props} className="my-4 text-foreground/90">
                {children}
              </div>
            );
          }

          return (
            <p {...props} className="my-4 text-foreground/90">
              {children}
            </p>
          );
        },
        img: ({ src, alt = "", ...props }: React.ComponentProps<"img">) => {
          if (!src) return null;
          // Try to parse width/height from props (strings or numbers)
          const parseDim = (v: unknown): number | undefined => {
            if (typeof v === "number") return v;
            if (typeof v === "string") {
              const n = parseInt(v.replace(/px$/, ""), 10);
              return Number.isFinite(n) && n > 0 ? n : undefined;
            }
            return undefined;
          };

          const p = props as Record<string, unknown>;
          const w = parseDim(p.width) ?? 1200;
          const h = parseDim(p.height) ?? Math.round((w * 9) / 16);

          return (
            <Image
              src={src}
              alt={alt}
              width={w}
              height={h}
              className="w-full h-auto object-cover rounded-lg my-8 max-w-full block"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          );
        },
        a: ({ href, children, ...props }: React.ComponentProps<"a">) => {
          const url = href ?? "#";
          const isExternal = /^https?:\/\//i.test(url);
          return (
            <a
              href={url}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="text-primary underline underline-offset-2"
              {...props}
            >
              {children}
            </a>
          );
        },
        blockquote: ({
          children,
          ...props
        }: React.ComponentProps<"blockquote">) => (
          <blockquote
            {...props}
            className="border-l-4 border-primary/30 pl-6 py-2 my-6 italic text-foreground/80 bg-muted/20 rounded-r-lg"
          >
            {children}
          </blockquote>
        ),
        code: ({
          children,
          className,
          ...props
        }: React.ComponentProps<"code">) => {
          const isInline = !className || !className.includes("language-");
          if (isInline) {
            return (
              <code
                {...props}
                className="bg-muted px-2 py-1 rounded text-fluid-sm font-mono text-primary"
              >
                {children}
              </code>
            );
          }
          return (
            <code {...props} className={className}>
              {children}
            </code>
          );
        },
        pre: ({ children, ...props }: React.ComponentProps<"pre">) => (
          <pre
            {...props}
            className="bg-muted p-4 rounded-lg overflow-x-auto my-6 text-sm font-mono border"
          >
            {children}
          </pre>
        ),
        ul: ({ children, ...props }: React.ComponentProps<"ul">) => (
          <ul {...props} className="list-disc pl-6 my-4 space-y-2">
            {children}
          </ul>
        ),
        ol: ({ children, ...props }: React.ComponentProps<"ol">) => (
          <ol {...props} className="list-decimal pl-6 my-4 space-y-2">
            {children}
          </ol>
        ),
        li: ({ children, ...props }: React.ComponentProps<"li">) => (
          <li {...props} className="leading-relaxed">
            {children}
          </li>
        ),
      }),
      []
    );

    if (loading) {
      return (
        <div
          className={`prose prose-amber text-base prose-lg dark:prose-invert reader-view-article mb-24 m-auto bg-background text-foreground px-6 md:px-8 lg:px-12 ${
            className || "w-full md:max-w-4xl"
          }`}
        >
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />

            <div className="my-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mt-2" />
            </div>

            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />

            {/* Simulated image in content */}
            <div className="my-8">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>

            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />

            <div className="my-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-4 w-5/6 mt-2" />
            </div>

            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      );
    }

    // Prefer markdown if available, fallback to HTML content
    const shouldUseMarkdown = markdown && markdown.trim() !== "";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className={`prose prose-amber text-base prose-lg dark:prose-invert reader-view-article mb-24 m-auto bg-background text-foreground px-6 md:px-8 lg:px-12 ${
          className || "w-full md:max-w-4xl"
        }`}
      >
        {shouldUseMarkdown ? (
          <ReactMarkdown
            components={components}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            allowedElements={undefined}
            disallowedElements={[]}
          >
            {markdown}
          </ReactMarkdown>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
        )}
      </motion.div>
    );
  }
);

ArticleContent.displayName = "ArticleContent";
