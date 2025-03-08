"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FeedsTab } from "./components/tabs/feeds-tab"
import { AppearanceTab } from "./components/tabs/appearance-tab"
import { AccountTab } from "./components/tabs/account-tab"

export default function SettingsPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <div className="container py-6 max-w-7xl h-full">
        <div className="flex flex-col space-y-6 h-full">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your feeds and application preferences</p>
          </div>

          <Tabs defaultValue="feeds" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="feeds">Feeds</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <div className="flex-1">
              <TabsContent value="feeds" className="h-full">
                <FeedsTab />
              </TabsContent>
              
              <TabsContent value="appearance">
                <AppearanceTab />
              </TabsContent>
              
              <TabsContent value="account">
                <AccountTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

