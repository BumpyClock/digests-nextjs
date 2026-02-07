import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface ContentNotFoundProps {
  /** The type of content (e.g., "Article", "Podcast") */
  contentType: string;
}

/**
 * Shared "not found" state for article and podcast detail pages
 */
export function ContentNotFound({ contentType }: ContentNotFoundProps) {
  const router = useRouter();

  return (
    <div className="container max-w-3xl py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="mb-2 text-title-large text-primary-content">{contentType} not found</h2>
        <p className="mb-6 text-body text-secondary-content">
          The {contentType.toLowerCase()} you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button onClick={() => router.push("/app")}>Return to feeds</Button>
      </div>
    </div>
  );
}
