import { Button } from "@/components/ui/button";
import Link from "next/link";

export function EmptyState() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold mb-2">No feeds yet</h2>
      <p className="text-secondary-content mb-6">
        Add some RSS feeds in the settings to get started.
      </p>
      <Button asChild className="w-full max-w-fit">
        <Link href="/web/settings">Go to Settings</Link>
      </Button>
    </div>
  );
}
