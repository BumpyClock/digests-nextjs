import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import Link from 'next/link';

// Define your custom MDX components
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Use Next.js Link component for all MDX links
    a: ({ href, children, ...props }) => {
      if (href && href.startsWith('/')) {
        return (
          <Link className="block text-left" href={href} {...props}>
            {children}
          </Link>
        );
      }
      return <a className="block text-left" href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },
    // Use Next.js Image component for all MDX images
    img: ({ src, alt, ...props }) => {
      if (src) {
        return (
          <Image 
            src={src} 
            alt={alt || ''} 
            width={600} 
            height={400} 
            className="rounded-md my-4"
            style={{ objectFit: 'contain' }}
            {...props} 
          />
        );
      }
      return null;
    },
    // Override any default components or add new custom components
    h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4 ">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-bold mt-6 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xl font-bold mt-4 mb-2">{children}</h3>,
    p: ({ children }) => <p className="my-4">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-6 my-4 text-left w-auto">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-6 my-4 text-left w-auto">{children}</ol>,
    li: ({ children }) => <li className="text-left">{children}</li>,
    code: ({ children }) => <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">{children}</code>,
    pre: ({ children }) => <pre className="bg-gray-100 rounded p-4 overflow-x-auto my-4 font-mono text-sm">{children}</pre>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-200 pl-4 italic my-4">{children}</blockquote>,
    // Add any other components or overrides
    ...components,
  };
}