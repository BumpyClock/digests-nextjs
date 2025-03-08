import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

export const AppearanceTab = memo(function AppearanceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how Digests looks and feels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="dark-mode">Dark Mode</Label>
            <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
          </div>
          <Switch id="dark-mode" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="compact-view">Compact View</Label>
            <p className="text-sm text-muted-foreground">Display more items in a condensed layout</p>
          </div>
          <Switch id="compact-view" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="font-size">Font Size</Label>
            <p className="text-sm text-muted-foreground">Adjust the text size for better readability</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              A-
            </Button>
            <Button variant="outline" size="sm">
              A+
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}) 