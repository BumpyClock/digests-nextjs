import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface ContentNotFoundProps {
  /** The type of content (e.g., "Article", "Podcast") */
  contentType: string
}

/**
 * Renders a not-found state for a given content type.
 *
 * @param contentType - Label of the missing content (e.g., "Article", "Podcast"); used in the heading and message
 * @returns The JSX element for the not-found UI
 */
export function ContentNotFound({ contentType }: ContentNotFoundProps) {
  const router = useRouter()

  return (
    <div className="container max-w-3xl py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-2">{contentType} not found</h2>
        <p className="text-muted-foreground mb-6">
          The {contentType.toLowerCase()} you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => router.push("/app")}>Return to feeds</Button>
      </div>
    </div>
  )
}