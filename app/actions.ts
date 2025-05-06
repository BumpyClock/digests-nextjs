"use server"

import { revalidatePath } from "next/cache"
import { fetchFeeds } from "@/lib/rss"
import type { Feed, FeedItem } from "@/types"

interface FeedActionResult {
  success: boolean
  message: string
  feeds?: Feed[]
  items?: FeedItem[]
}

export async function fetchFeedsAction(url: string): Promise<FeedActionResult> {
  try {
    const { feeds, items } = await fetchFeeds([url])

    if (feeds.length === 0) {
      return {
        success: false,
        message: "No valid feeds found at the provided URL.",
      }
    }

    if (items.length === 0) {
      return {
        success: false,
        message: "Feed found but contains no items.",
      }
    }

    revalidatePath("/web")
    
    return {
      success: true,
      message: `Added: ${feeds[0].feedTitle}`,
      feeds,
      items,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch feed",
    }
  }
}

export async function refreshFeedsAction(feedUrls: string[]): Promise<FeedActionResult> {
  if (!feedUrls.length) {
    return {
      success: true,
      message: "No feeds to refresh",
      feeds: [],
      items: [],
    }
  }

  try {
    const { feeds, items } = await fetchFeeds(feedUrls)
    revalidatePath("/web")
    
    return {
      success: true,
      message: `Refreshed ${feeds.length} feeds`,
      feeds,
      items,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to refresh feeds",
    }
  }
}

export async function toggleFavoriteAction(itemId: string) {
  try {
    revalidatePath("/web")
    return {
      success: true,
      message: `Favorite toggled for item ${itemId}. This is placeholder and not implemented yet.`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to toggle favorite",
    }
  }
}

export async function getFeedItemsAction(): Promise<FeedActionResult> {
  try {
    // This is just a placeholder function to make the build pass
    // In a real app, this would fetch items from a database or API
    return {
      success: true,
      message: "Items retrieved successfully",
      items: []
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to get feed items"
    }
  }
}

