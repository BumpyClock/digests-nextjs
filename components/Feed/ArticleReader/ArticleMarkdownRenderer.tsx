"use client";

import Image from "next/image";
import React from "react";
import type { Components as MarkdownComponents } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

export const MARKDOWN_COMPONENTS: MarkdownComponents = {
  h1: ({ children, ...props }: React.ComponentProps<"h1">) => (
    <h1 {...props} className="text-fluid-3xl font-bold mt-8 mb-6 leading-fluid-tight">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.ComponentProps<"h2">) => (
    <h2 {...props} className="text-fluid-2xl font-semibold mt-8 mb-4 leading-fluid-tight">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.ComponentProps<"h3">) => (
    <h3 {...props} className="text-fluid-xl font-semibold mt-6 mb-3 leading-fluid-tight">
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: React.ComponentProps<"h4">) => (
    <h4 {...props} className="text-fluid-lg font-semibold mt-4 mb-2 leading-fluid-normal">
      {children}
    </h4>
  ),
  p: ({ children, ...props }: React.ComponentProps<"p">) => {
    const hasImages = React.Children.toArray(children).some((child) => {
      if (!React.isValidElement(child)) return false;
      return child.type === "img" || (child.props && "src" in child.props);
    });

    if (hasImages) {
      return (
        <div {...props} className="my-4 text-primary-content opacity-90">
          {children}
        </div>
      );
    }

    return (
      <p {...props} className="my-4 text-primary-content opacity-90">
        {children}
      </p>
    );
  },
  img: ({ src, alt = "", ...props }: React.ComponentProps<"img">) => {
    if (!src || typeof src !== "string") return null;
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
        className="text-link-content underline underline-offset-2"
        {...props}
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children, ...props }: React.ComponentProps<"blockquote">) => (
    <blockquote
      {...props}
      className="border-l-4 border-primary/30 pl-6 py-2 my-6 italic text-primary-content opacity-80 bg-muted/20 rounded-r-lg"
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }: React.ComponentProps<"code">) => {
    const isInline = !className || !className.includes("language-");
    if (isInline) {
      return (
        <code
          {...props}
          className="bg-muted px-2 py-1 rounded text-fluid-sm text-code text-link-content"
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
    <pre {...props} className="bg-muted p-4 rounded-lg overflow-x-auto my-6 text-code border">
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
};

interface ArticleMarkdownRendererProps {
  content: string;
  className?: string;
}

export default function ArticleMarkdownRenderer({
  content,
  className,
}: ArticleMarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={MARKDOWN_COMPONENTS}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        allowedElements={undefined}
        disallowedElements={[]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
