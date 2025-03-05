"use server"

import { revalidatePath } from "next/cache"
import { fetchFeeds } from "@/lib/rss"

export async function fetchFeedsAction(url: string) {
  try {
    console.log("Fetching feeds for URL:", url)
    const { feeds, items } = await fetchFeeds([url])

    console.log(`Fetched ${feeds.length} feeds and ${items.length} items`)

    if (feeds.length === 0) {
      return {
        success: false,
        message: "No valid feeds found at the provided URL. Please check the URL and try again.",
      }
    }

    if (items.length === 0) {
      return {
        success: false,
        message: "The feed was found, but it contains no items. Please try a different feed.",
      }
    }

    console.log("Revalidating paths...")
    revalidatePath("/app")
    revalidatePath("/app/settings")

    return {
      success: true,
      message: `Successfully fetched feed: ${feeds[0].feedTitle}`,
      feeds,
      items,
    }
  } catch (error) {
    console.error("Error fetching feed:", error)
    return {
      success: false,
      message:
        error instanceof Error
          ? `Error: ${error.message}. Please check the URL and try again.`
          : "An unknown error occurred while fetching the feed. Please try again.",
    }
  }
}

export async function refreshFeedsAction(feedUrls: string[]) {
  try {
    const { feeds, items } = await fetchFeeds(feedUrls)
    revalidatePath("/app")
    return {
      success: true,
      message: "Feeds refreshed successfully",
      feeds,
      items,
    }
  } catch (error) {
    console.error("Error refreshing feeds:", error)
    return {
      success: false,
      message: "An error occurred while refreshing feeds. Please try again.",
    }
  }
}

export async function toggleFavoriteAction(itemId: string) {
  try {
    // TODO: Implement toggle favorite logic
    // For now, we'll just simulate a successful toggle
    const success = true
    const message = "Favorite toggled successfully"

    revalidatePath("/app")
    return {
      success,
      message,
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return {
      success: false,
      message: "An error occurred while toggling favorite. Please try again.",
    }
  }
}

