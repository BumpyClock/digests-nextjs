import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Plus } from "lucide-react"
import { useFeedForm } from "@/app/web/settings/hooks/use-feed-form"

export const AddFeedForm = memo(function AddFeedForm() {
  const { handleSubmit, formRef, loading } = useFeedForm()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Feed</CardTitle>
        <CardDescription>
          Enter the URL of an RSS feed or podcast to add it to your subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="feed-url">Feed URL</Label>
            <Input
              id="feed-url"
              name="feed-url"
              placeholder="https://example.com/feed.xml"
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Feed
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
})