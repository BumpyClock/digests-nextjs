/**
 * YouTube utility functions for detecting YouTube feeds and extracting video information
 */

/**
 * Checks if a feed item is from a YouTube RSS feed
 */
export function isYouTubeFeedItem(feedItem: { feedUrl?: string; link?: string; siteTitle?: string }): boolean {
  if (!feedItem) return false;
  
  // Check if the feed URL is from YouTube
  if (feedItem.feedUrl) {
    const feedUrl = feedItem.feedUrl.toLowerCase();
    if (feedUrl.includes('youtube.com/feeds/videos.xml') || 
        feedUrl.includes('www.youtube.com/feeds/videos.xml')) {
      return true;
    }
  }
  
  // Check if the item link is from YouTube
  if (feedItem.link) {
    const link = feedItem.link.toLowerCase();
    if (link.includes('youtube.com/watch') || 
        link.includes('youtu.be/')) {
      return true;
    }
  }
  
  // Check if the site title indicates YouTube
  if (feedItem.siteTitle) {
    const siteTitle = feedItem.siteTitle.toLowerCase();
    if (siteTitle.includes('youtube')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extracts the YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Handle youtube.com/watch?v=VIDEO_ID format
    if ((urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') && urlObj.pathname === '/watch') {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return videoId;
      }
    }
    
    // Handle youtube.com/embed/VIDEO_ID format
    if ((urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') && urlObj.pathname.startsWith('/embed/')) {
      const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) {
        return embedMatch[1];
      }
    }
    
    // Handle youtu.be/VIDEO_ID format
    if (urlObj.hostname === 'youtu.be') {
      const shortMatch = urlObj.pathname.match(/^\/([a-zA-Z0-9_-]+)/);
      if (shortMatch) {
        return shortMatch[1];
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves a YouTube channel URL to get the RSS feed URL
 * Uses server-side API to avoid CORS issues
 */
export async function resolveYouTubeChannelToRSS(channelUrl: string): Promise<string | null> {
  if (!channelUrl) return null;
  
  try {
    const response = await fetch('/api/youtube-channel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to resolve YouTube channel');
    }

    const data = await response.json();
    return data.rssUrl;
  } catch (error) {
    console.error('Error resolving YouTube channel to RSS:', error);
    return null;
  }
}

/**
 * Converts a YouTube channel URL to its RSS feed URL
 */
export function getYouTubeRSSFeedUrl(channelUrl: string): string | null {
  if (!channelUrl) return null;
  
  try {
    const url = new URL(channelUrl);
    
    // Handle youtube.com/channel/CHANNEL_ID format (direct channel ID)
    if ((url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com')) {
      const channelMatch = url.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)/);
      if (channelMatch) {
        const channelId = channelMatch[1];
        return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      }
      
      // For other formats, we need to resolve the channel ID first
      // Return a special format that indicates resolution is needed
      const handleMatch = url.pathname.match(/^\/(@[a-zA-Z0-9_.-]+)/);
      if (handleMatch) {
        return `youtube-resolve:${channelUrl}`;
      }
      
      const customMatch = url.pathname.match(/^\/c\/([a-zA-Z0-9_-]+)/);
      if (customMatch) {
        return `youtube-resolve:${channelUrl}`;
      }
      
      const userMatch = url.pathname.match(/^\/user\/([a-zA-Z0-9_-]+)/);
      if (userMatch) {
        return `youtube-resolve:${channelUrl}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if a URL is a YouTube channel URL
 */
export function isYouTubeChannelUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      // Check for various YouTube channel URL formats
      return /^\/(channel\/|c\/|user\/|@)/.test(urlObj.pathname);
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Creates an embed URL for a YouTube video
 */
export function createYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Creates a thumbnail URL for a YouTube video
 */
export function createYouTubeThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}