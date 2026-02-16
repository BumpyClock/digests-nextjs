import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="text-center py-12">
      <h2 className="mb-2 text-title-large text-primary-content">No feeds yet</h2>
      <p className="mb-6 text-body text-secondary-content">
        Add some RSS feeds in the settings to get started.
      </p>
      <Button asChild className="w-full max-w-fit">
        <Link href="/web/settings">Go to Settings</Link>
      </Button>
    </div>
  );
}
