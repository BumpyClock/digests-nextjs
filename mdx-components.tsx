import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import Link from 'next/link';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = '#', children, ...props }) => {
      try {
        if (href.startsWith('/')) {
          return (
            <Link className="block text-left" href={href} {...props}>
              {children}
            </Link>
          );
        }
        return <a className="block text-left" href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
      } catch (error) {
        console.error('Error in MDX anchor component:', error);
        return null;
      }
    },
    img: ({ src, alt = '', ...props }) => {
      try {
        if (!src) return null;
        return (
          <Image 
            src={src} 
            alt={alt} 
            width={600} 
            height={400} 
            className="rounded-md my-4"
            style={{ objectFit: 'contain' }}
            {...props} 
          />
        );
      } catch (error) {
        console.error('Error in MDX image component:', error);
        return null;
      }
    },
    h1: ({ children }) => {
      try {
        return children ? <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1> : null;
      } catch (error) {
        console.error('Error in MDX h1 component:', error);
        return null;
      }
    },
    h2: ({ children }) => {
      try {
        return children ? <h2 className="text-2xl font-bold mt-6 mb-3">{children}</h2> : null;
      } catch (error) {
        console.error('Error in MDX h2 component:', error);
        return null;
      }
    },
    h3: ({ children }) => {
      try {
        return children ? <h3 className="text-xl font-bold mt-4 mb-2">{children}</h3> : null;
      } catch (error) {
        console.error('Error in MDX h3 component:', error);
        return null;
      }
    },
    p: ({ children }) => {
      try {
        return children ? <p className="my-4">{children}</p> : null;
      } catch (error) {
        console.error('Error in MDX paragraph component:', error);
        return null;
      }
    },
    ul: ({ children }) => {
      try {
        return children ? <ul className="list-disc pl-6 my-4 text-left w-auto">{children}</ul> : null;
      } catch (error) {
        console.error('Error in MDX ul component:', error);
        return null;
      }
    },
    ol: ({ children }) => {
      try {
        return children ? <ol className="list-decimal pl-6 my-4 text-left w-auto">{children}</ol> : null;
      } catch (error) {
        console.error('Error in MDX ol component:', error);
        return null;
      }
    },
    li: ({ children }) => {
      try {
        return children ? <li className="text-left">{children}</li> : null;
      } catch (error) {
        console.error('Error in MDX li component:', error);
        return null;
      }
    },
    code: ({ children }) => {
      try {
        return children ? <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">{children}</code> : null;
      } catch (error) {
        console.error('Error in MDX code component:', error);
        return null;
      }
    },
    pre: ({ children }) => {
      try {
        return children ? <pre className="bg-gray-100 rounded p-4 overflow-x-auto my-4 font-mono text-sm">{children}</pre> : null;
      } catch (error) {
        console.error('Error in MDX pre component:', error);
        return null;
      }
    },
    blockquote: ({ children }) => {
      try {
        return children ? <blockquote className="border-l-4 border-gray-200 pl-4 italic my-4">{children}</blockquote> : null;
      } catch (error) {
        console.error('Error in MDX blockquote component:', error);
        return null;
      }
    },
    ...components,
  };
}