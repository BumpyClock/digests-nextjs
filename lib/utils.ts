import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getFeedItems, saveFeedItems } from "./clientStorage"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toggleFavoriteAction(itemId: string) {
  try {
    const items = getFeedItems()
    const itemIndex = items.findIndex((item) => item.id === itemId)

    if (itemIndex === -1) {
      return {
        success: false,
        message: "Item not found",
      }
    }

    items[itemIndex].favorite = !items[itemIndex].favorite
    saveFeedItems(items)

    return {
      success: true,
      message: items[itemIndex].favorite ? "Added to favorites" : "Removed from favorites",
      item: items[itemIndex],
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return {
      success: false,
      message: "An error occurred. Please try again.",
    }
  }
}

