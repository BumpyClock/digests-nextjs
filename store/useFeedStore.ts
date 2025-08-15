/**
 * MIGRATION NOTICE: This Zustand store has been replaced with React Query
 *
 * This is a stub file to maintain compatibility during the migration.
 * All feed state management is now handled by React Query hooks.
 */

import type { Feed, FeedItem } from "@/types";
import type { AudioInfo } from "@/components/AudioPlayer/types";

// Legacy feed store interface with all required properties
interface FeedStore {
  // Core feed data
  feeds: Feed[];
  feedItems: FeedItem[];
  items: FeedItem[]; // Alias for feedItems
  setFeeds: (feeds: Feed[]) => void;
  setFeedItems: (items: FeedItem[]) => void;
  removeFeedFromCache: (feedUrl: string) => void;

  // Store state management
  setState: (partial: Partial<FeedStore>) => void;
  initialized: boolean;
  hydrated: boolean;
  isLoading: boolean;
  error: Error | null;
  setHydrated: (hydrated: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;

  // Feed management
  activeFeed: Feed | null;
  setActiveFeed: (feed: Feed | null) => void;
  sortFeedItemsByDate: (items: FeedItem[]) => FeedItem[];

  // Read status management
  readItems: Set<string>;
  readLaterItems: Set<string>;
  markAsRead: (itemId: string) => void;
  markAllAsRead: (feedUrl?: string) => void;
  getUnreadItems: (feedUrl?: string) => FeedItem[];
  addToReadLater: (itemId: string) => void;
  removeFromReadLater: (itemId: string) => void;
  isInReadLater: (itemId: string) => boolean;
  getReadLaterItems: () => FeedItem[];

  // Audio player state
  currentAudio: AudioInfo | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isMinimized: boolean;
  currentTrack: AudioInfo | null;
  playlist: AudioInfo[];
  playbackRate: number;

  // Audio player actions
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setShowMiniPlayer: (show: boolean) => void;
  setIsMuted: (muted: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setCurrentTrack: (track: AudioInfo | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaylist: (playlist: AudioInfo[]) => void;
  setPlaybackRate: (rate: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  addToPlaylist: (track: AudioInfo) => void;
  removeFromPlaylist: (trackId: string) => void;
}

// Create store data that persists across calls
const storeData: Partial<FeedStore> = {
  feeds: [],
  feedItems: [],
  initialized: true,
  hydrated: true,
  isLoading: false,
  error: null,
  readItems: new Set<string>(),
  activeFeed: null,
  readLaterItems: new Set<string>(),
  // Audio state
  volume: 1,
  isMuted: false,
  isMinimized: false,
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playlist: [],
  playbackRate: 1,
  currentAudio: null,
};

// Simple stub store for backward compatibility
export const useFeedStore = (): FeedStore => {
  const sortFeedItemsByDate = (items: FeedItem[]) => {
    return items.sort((a, b) => {
      const dateA = new Date(a.published || 0).getTime();
      const dateB = new Date(b.published || 0).getTime();
      return dateB - dateA; // Newest first
    });
  };

  return {
    // Core feed data
    feeds: storeData.feeds || [],
    feedItems: storeData.feedItems || [],
    items: storeData.feedItems || [], // Alias for feedItems
    setFeeds: (feeds: Feed[]) => {
      storeData.feeds = feeds;
      console.warn(
        "Legacy Zustand feed store called - migrate to React Query hooks",
      );
    },
    setFeedItems: (items: FeedItem[]) => {
      storeData.feedItems = items;
      console.warn(
        "Legacy Zustand feed store called - migrate to React Query hooks",
      );
    },
    removeFeedFromCache: (feedUrl: string) => {
      storeData.feeds = (storeData.feeds || []).filter(
        (f) => f.feedUrl !== feedUrl,
      );
      storeData.feedItems = (storeData.feedItems || []).filter(
        (i) => i.feedUrl !== feedUrl,
      );
      console.warn(
        "Legacy Zustand feed store called - migrate to React Query hooks",
      );
    },

    // Store state management
    setState: (partial: Partial<FeedStore>) => {
      Object.assign(storeData, partial);
    },
    initialized: storeData.initialized || true,
    hydrated: storeData.hydrated || true,
    isLoading: storeData.isLoading || false,
    error: storeData.error || null,
    setHydrated: (hydrated: boolean) => {
      storeData.hydrated = hydrated;
    },
    setInitialized: (initialized: boolean) => {
      storeData.initialized = initialized;
    },
    setIsLoading: (loading: boolean) => {
      storeData.isLoading = loading;
    },
    setError: (error: Error | null) => {
      storeData.error = error;
    },

    // Feed management
    activeFeed: storeData.activeFeed || null,
    setActiveFeed: (feed: Feed | null) => {
      storeData.activeFeed = feed;
    },
    sortFeedItemsByDate,

    // Read status management
    readItems: storeData.readItems || new Set<string>(),
    readLaterItems: storeData.readLaterItems || new Set<string>(),
    markAsRead: (itemId: string) => {
      if (!storeData.readItems) storeData.readItems = new Set();
      storeData.readItems.add(itemId);
    },
    markAllAsRead: (feedUrl?: string) => {
      if (!storeData.readItems) storeData.readItems = new Set();
      const items = feedUrl
        ? (storeData.feedItems || []).filter((i) => i.feedUrl === feedUrl)
        : storeData.feedItems || [];
      items.forEach((item) => storeData.readItems!.add(item.id));
    },
    getUnreadItems: (feedUrl?: string) => {
      const items = feedUrl
        ? (storeData.feedItems || []).filter((i) => i.feedUrl === feedUrl)
        : storeData.feedItems || [];
      return items.filter((item) => !storeData.readItems?.has(item.id));
    },
    addToReadLater: (itemId: string) => {
      if (!storeData.readLaterItems) storeData.readLaterItems = new Set();
      storeData.readLaterItems.add(itemId);
    },
    removeFromReadLater: (itemId: string) => {
      if (!storeData.readLaterItems) storeData.readLaterItems = new Set();
      storeData.readLaterItems.delete(itemId);
    },
    isInReadLater: (itemId: string) => {
      return storeData.readLaterItems?.has(itemId) || false;
    },
    getReadLaterItems: () => {
      if (!storeData.readLaterItems) return [];
      return (storeData.feedItems || []).filter((item) =>
        storeData.readLaterItems!.has(item.id),
      );
    },

    // Audio player state
    currentAudio: storeData.currentAudio || null,
    isPlaying: storeData.isPlaying || false,
    currentTime: storeData.currentTime || 0,
    duration: storeData.duration || 0,
    volume: storeData.volume || 1,
    isMuted: storeData.isMuted || false,
    isMinimized: storeData.isMinimized || false,
    currentTrack: storeData.currentTrack || null,
    playlist: storeData.playlist || [],
    playbackRate: storeData.playbackRate || 1,

    // Audio player actions
    togglePlayPause: () => {
      storeData.isPlaying = !storeData.isPlaying;
    },
    seek: (time: number) => {
      storeData.currentTime = time;
    },
    setVolume: (volume: number) => {
      storeData.volume = volume;
      storeData.isMuted = volume === 0;
    },
    toggleMute: () => {
      storeData.isMuted = !storeData.isMuted;
    },
    setShowMiniPlayer: (show: boolean) => {
      // This is handled by the audio player hook now
    },
    setIsMuted: (muted: boolean) => {
      storeData.isMuted = muted;
    },
    setIsMinimized: (minimized: boolean) => {
      storeData.isMinimized = minimized;
    },
    setCurrentTrack: (track: AudioInfo | null) => {
      storeData.currentTrack = track;
      storeData.currentAudio = track;
    },
    setIsPlaying: (playing: boolean) => {
      storeData.isPlaying = playing;
    },
    setCurrentTime: (time: number) => {
      storeData.currentTime = time;
    },
    setDuration: (duration: number) => {
      storeData.duration = duration;
    },
    setPlaylist: (playlist: AudioInfo[]) => {
      storeData.playlist = playlist;
    },
    setPlaybackRate: (rate: number) => {
      storeData.playbackRate = rate;
    },
    play: () => {
      storeData.isPlaying = true;
    },
    pause: () => {
      storeData.isPlaying = false;
    },
    stop: () => {
      storeData.isPlaying = false;
      storeData.currentTime = 0;
    },
    next: () => {
      // Implement playlist navigation if needed
    },
    previous: () => {
      // Implement playlist navigation if needed
    },
    addToPlaylist: (track: AudioInfo) => {
      if (!storeData.playlist) storeData.playlist = [];
      storeData.playlist.push(track);
    },
    removeFromPlaylist: (trackId: string) => {
      if (!storeData.playlist) storeData.playlist = [];
      storeData.playlist = storeData.playlist.filter((t) => t.id !== trackId);
    },
  };
};

// Note: getState method removed - use hook directly in components
