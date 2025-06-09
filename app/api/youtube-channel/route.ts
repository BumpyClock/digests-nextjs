import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to resolve YouTube channel URLs to RSS feed URLs
 * This runs server-side to avoid CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    const { channelUrl } = await request.json();
    
    if (!channelUrl) {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      );
    }

    // Validate that it's a YouTube URL
    try {
      const url = new URL(channelUrl);
      if (url.hostname !== 'www.youtube.com' && url.hostname !== 'youtube.com') {
        return NextResponse.json(
          { error: 'Invalid YouTube URL' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // For direct channel ID URLs, extract immediately
    const url = new URL(channelUrl);
    const channelMatch = url.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelMatch) {
      const channelId = channelMatch[1];
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      return NextResponse.json({ channelId, rssUrl });
    }

    // For other formats (@username, /c/, /user/), fetch the page to get channel ID
    console.log('Fetching YouTube page:', channelUrl);
    const response = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch YouTube page:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch YouTube channel page' },
        { status: 500 }
      );
    }

    const html = await response.text();
    
    // Look for channel ID in various places in the HTML
    const patterns = [
      // Most common pattern - canonical URL
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/([a-zA-Z0-9_-]+)"/,
      // Meta property
      /<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/([a-zA-Z0-9_-]+)"/,
      // JSON data - channelId
      /"channelId":"([a-zA-Z0-9_-]+)"/,
      // Browse endpoint
      /"browseEndpoint":{"browseId":"([a-zA-Z0-9_-]+)"/,
      // External ID
      /"externalId":"([a-zA-Z0-9_-]+)"/,
      // Another common pattern
      /\/channel\/([a-zA-Z0-9_-]+)/,
      // ytInitialData pattern
      /"webCommandMetadata":{"url":"\/channel\/([a-zA-Z0-9_-]+)"/
    ];

    let channelId = null;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Verify it looks like a valid channel ID (starts with UC and is the right length)
        const potentialId = match[1];
        if (potentialId.startsWith('UC') && potentialId.length === 24) {
          channelId = potentialId;
          break;
        } else if (potentialId.length >= 20) {
          // Some channel IDs might not start with UC
          channelId = potentialId;
          break;
        }
      }
    }

    if (!channelId) {
      console.error('Could not find channel ID in HTML');
      return NextResponse.json(
        { error: 'Could not resolve channel ID from the provided URL' },
        { status: 404 }
      );
    }

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    console.log('Successfully resolved:', channelUrl, '->', channelId);
    return NextResponse.json({ channelId, rssUrl });

  } catch (error) {
    console.error('Error resolving YouTube channel:', error);
    return NextResponse.json(
      { error: 'Internal server error while resolving channel' },
      { status: 500 }
    );
  }
}