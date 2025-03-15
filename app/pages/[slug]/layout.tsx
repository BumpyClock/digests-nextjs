import { getMdxMetadata } from '@/utils/mdx-utils';
import { Metadata } from 'next';

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const metadata = getMdxMetadata(params.slug);
  return {
    title: metadata.title,
    description: metadata.description,
  };
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 