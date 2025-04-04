"use client";

import { useState, useCallback } from "react";
import { FeedList } from "@/components/Feed/FeedList/FeedList";
import { ReaderViewPane } from "@/components/Feed/ReaderViewPane/ReaderViewPane";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FeedItem } from "@/types";

interface FeedMasterDetailProps {
  items: FeedItem[];
  isLoading: boolean;
}

export function FeedMasterDetail({ items, isLoading }: FeedMasterDetailProps) {
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  
  const handleItemSelect = useCallback((item: FeedItem) => {
    setSelectedItem(item);
  }, []);

  return (
    <div className="h-[calc(100vh-11rem)]" id="feed-master-detail">
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-full rounded-lg border"
      >
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <FeedList
            items={items}
            isLoading={isLoading}
            selectedItem={selectedItem}
            onItemSelect={handleItemSelect}
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={70}>
          <ReaderViewPane feedItem={selectedItem} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 