import { Button } from "@/components/ui/button"

export function EmptyState() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold mb-2">No feeds yet</h2>
      <p className="text-muted-foreground mb-6">Add some RSS feeds in the settings to get started.</p>
      <Button onClick={() => (window.location.href = "/app/settings")}>Go to Settings</Button>
    </div>
  )
} 