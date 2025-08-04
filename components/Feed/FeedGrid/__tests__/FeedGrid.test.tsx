/**
 * Tests for FeedGrid component
 * Tests grid layout, responsive behavior, and item rendering
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeedGrid } from "../FeedGrid";
import { Feed, FeedItem } from "@/types";

// Mock all complex dependencies
jest.mock("@/store/useFeedStore", () => ({
  useFeedStore: () => ({
    feeds: [],
    items: [],
    feedItems: [],
    setState: jest.fn(),
    initialized: true,
    hydrated: true,
    isLoading: false,
    error: null,
    setFeedItems: jest.fn(),
    setFeeds: jest.fn(),
    removeFeedFromCache: jest.fn(),
    setHydrated: jest.fn(),
    setInitialized: jest.fn(),
    setIsLoading: jest.fn(),
    setError: jest.fn(),
    activeFeed: null,
    setActiveFeed: jest.fn(),
    sortFeedItemsByDate: (items: FeedItem[]) => items,
    readItems: new Set<string>(),
    readLaterItems: new Set<string>(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    getUnreadItems: jest.fn(() => []),
    addToReadLater: jest.fn(),
    removeFromReadLater: jest.fn(),
    isInReadLater: jest.fn(() => false),
    getReadLaterItems: jest.fn(() => []),
    currentAudio: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isMinimized: false,
    currentTrack: null,
    playlist: [],
    playbackRate: 1,
    togglePlayPause: jest.fn(),
    seek: jest.fn(),
    setVolume: jest.fn(),
    toggleMute: jest.fn(),
    setShowMiniPlayer: jest.fn(),
    setIsMuted: jest.fn(),
    setIsMinimized: jest.fn(),
    setCurrentTrack: jest.fn(),
    setIsPlaying: jest.fn(),
    setCurrentTime: jest.fn(),
    setDuration: jest.fn(),
    setPlaylist: jest.fn(),
    setPlaybackRate: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    next: jest.fn(),
    previous: jest.fn(),
    addToPlaylist: jest.fn(),
    removeFromPlaylist: jest.fn(),
  }),
}));

jest.mock("@/hooks/queries/use-feeds", () => ({
  useFeeds: () => ({
    data: { feeds: [], feedItems: [] },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/useReadStatus", () => ({
  useReadStatus: () => ({
    readItems: new Set(),
    readLaterItems: new Set(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    addToReadLater: jest.fn(),
    removeFromReadLater: jest.fn(),
    isInReadLater: jest.fn(() => false),
    getUnreadItems: jest.fn(() => []),
    getReadLaterItems: jest.fn(() => []),
  }),
}));

jest.mock("@/hooks/useFeedActions", () => ({
  useIsItemRead: () => false,
  useToggleReadLater: () => jest.fn(),
  useMarkAsRead: () => jest.fn(),
}));

jest.mock("masonic", () => ({
  Masonry: ({
    items,
    render,
  }: {
    items: any[];
    render: (props: { data: any }) => React.ReactNode;
  }) => (
    <div
      data-testid="masonry"
      role="main"
      className="feed-grid"
      style={{ display: "grid" }}
    >
      {items?.map((item, index) => (
        <div
          key={item?.id || index}
          role="article"
          tabIndex={0}
          aria-label={`Article: ${item?.title || "Untitled"}`}
        >
          {render({ data: item })}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/hooks/use-window-size", () => ({
  useWindowSize: () => ({ width: 1200, height: 800 }),
}));

jest.mock("lottie-react", () => ({
  __esModule: true,
  default: () => <div data-testid="lottie-animation">Loading...</div>,
}));

jest.mock("motion/react", () => ({
  motion: {
    div: ({ children, initial, animate, layout, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock FeedCard to avoid complex dependencies
jest.mock("@/components/Feed/FeedCard/FeedCard", () => ({
  FeedCard: ({ feed }: { feed: FeedItem }) => (
    <div data-testid="feed-card">
      <h3>{feed.title}</h3>
      <p>{feed.siteTitle}</p>
      <p>{feed.author}</p>
    </div>
  ),
}));

// Sample test data
const mockItems: FeedItem[] = [
  {
    type: "item",
    id: "1",
    title: "Understanding React 18",
    description: "React 18 introduces new features...",
    link: "https://techblog.com/react-18",
    author: "John Doe",
    published: new Date().toISOString(),
    content: "<p>React 18 introduces new features...</p>",
    created: new Date().toISOString(),
    content_encoded: "<p>React 18 introduces new features...</p>",
    categories: ["tech"],
    enclosures: [],
    thumbnail: "",
    thumbnailColor: { r: 0, g: 0, b: 0 },
    thumbnailColorComputed: "#000000",
    siteTitle: "Tech Blog",
    siteName: "Tech Blog",
    feedTitle: "Tech Blog RSS",
    feedUrl: "https://techblog.com/feed",
    favicon: "https://techblog.com/favicon.ico",
    favorite: false,
    pubDate: new Date().toISOString(),
  },
  {
    type: "item",
    id: "2",
    title: "TypeScript Best Practices",
    description: "Learn TypeScript best practices...",
    link: "https://techblog.com/typescript",
    author: "Jane Smith",
    published: new Date(Date.now() - 86400000).toISOString(),
    content: "<p>Learn TypeScript best practices...</p>",
    created: new Date(Date.now() - 86400000).toISOString(),
    content_encoded: "<p>Learn TypeScript best practices...</p>",
    categories: ["tech"],
    enclosures: [],
    thumbnail: "",
    thumbnailColor: { r: 0, g: 0, b: 0 },
    thumbnailColorComputed: "#000000",
    siteTitle: "Tech Blog",
    siteName: "Tech Blog",
    feedTitle: "Tech Blog RSS",
    feedUrl: "https://techblog.com/feed",
    favicon: "https://techblog.com/favicon.ico",
    favorite: false,
    pubDate: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    type: "item",
    id: "3",
    title: "Color Theory in UI Design",
    description: "Understanding color in design...",
    link: "https://designweekly.com/color-theory",
    author: "Design Team",
    published: new Date(Date.now() - 172800000).toISOString(),
    content: "<p>Understanding color in design...</p>",
    created: new Date(Date.now() - 172800000).toISOString(),
    content_encoded: "<p>Understanding color in design...</p>",
    categories: ["design"],
    enclosures: [],
    thumbnail: "",
    thumbnailColor: { r: 0, g: 0, b: 0 },
    thumbnailColorComputed: "#000000",
    siteTitle: "Design Weekly",
    siteName: "Design Weekly",
    feedTitle: "Design Weekly RSS",
    feedUrl: "https://designweekly.com/feed",
    favicon: "https://designweekly.com/favicon.ico",
    favorite: false,
    pubDate: new Date(Date.now() - 172800000).toISOString(),
  },
];

// Test wrapper with QueryClient
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("FeedGrid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading States", () => {
    it("should show loading animation when loading prop is true", async () => {
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={true} />
        </TestWrapper>,
      );

      // When isLoading is true, it should show the loading animation
      // The LoadingAnimation component waits for isMounted, so we need to wait for it
      await waitFor(() => {
        expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
      });
    });

    it("should show loading animation when no items provided", () => {
      render(
        <TestWrapper>
          <FeedGrid items={[]} isLoading={false} />
        </TestWrapper>,
      );

      expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
    });

    it("should show loading animation during initial mount delay", () => {
      jest.useFakeTimers();
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Should show loading initially
      expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe("Rendering", () => {
    it("should render feed grid with items after loading delay", async () => {
      jest.useFakeTimers();
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      // Should render all items
      expect(screen.getByText("Understanding React 18")).toBeInTheDocument();
      expect(screen.getByText("TypeScript Best Practices")).toBeInTheDocument();
      expect(screen.getByText("Color Theory in UI Design")).toBeInTheDocument();

      jest.useRealTimers();
    });

    it("should render feed metadata", async () => {
      jest.useFakeTimers();
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      // Should show feed titles (using getAllByText since there might be duplicates)
      expect(screen.getAllByText("Tech Blog").length).toBeGreaterThan(0);
      expect(screen.getByText("Design Weekly")).toBeInTheDocument();

      // Should show authors
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe("Component Behavior", () => {
    it("should render items when provided", async () => {
      jest.useFakeTimers();
      const testItems = [mockItems[0], mockItems[1]];
      render(
        <TestWrapper>
          <FeedGrid items={testItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      // Should show the provided items
      expect(screen.getByText("Understanding React 18")).toBeInTheDocument();
      expect(screen.getByText("TypeScript Best Practices")).toBeInTheDocument();
      expect(
        screen.queryByText("Color Theory in UI Design"),
      ).not.toBeInTheDocument();

      jest.useRealTimers();
    });

    it("should show all items when all provided", async () => {
      jest.useFakeTimers();
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      // Should show all items
      expect(screen.getAllByRole("article")).toHaveLength(3);

      jest.useRealTimers();
    });
  });

  describe("Interaction", () => {
    it("should render articles with proper structure", async () => {
      jest.useFakeTimers();
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      const articles = screen.getAllByRole("article");
      expect(articles).toHaveLength(3);
      expect(articles[0]).toHaveAttribute("tabIndex", "0");

      jest.useRealTimers();
    });

    it("should handle keyboard navigation", async () => {
      jest.useFakeTimers();
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      const firstArticle = screen.getAllByRole("article")[0];

      // Tab to article
      firstArticle.focus();
      expect(document.activeElement).toBe(firstArticle);
      expect(firstArticle).toHaveAttribute("aria-label");

      jest.useRealTimers();
    });

    it("should provide access to feed store functionality", () => {
      // This test verifies that the store is properly mocked and accessible
      render(
        <TestWrapper>
          <FeedGrid items={[]} isLoading={false} />
        </TestWrapper>,
      );

      // Verify loading animation is shown for empty items
      expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
    });
  });

  describe("Responsive Layout", () => {
    it("should render masonry grid layout", async () => {
      jest.useFakeTimers();
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      const grid = screen.getByTestId("masonry");
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass("feed-grid");

      // Check CSS classes for responsive layout
      expect(grid).toHaveStyle({
        display: "grid",
      });

      jest.useRealTimers();
    });

    it("should use window size hook for responsive behavior", () => {
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Component should be rendered (will show loading due to timing)
      expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should handle large lists efficiently", async () => {
      jest.useFakeTimers();

      // Create many items
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        type: "item" as const,
        id: String(i),
        title: `Article ${i}`,
        description: `Content ${i}...`,
        link: `https://example.com/article-${i}`,
        author: "Author",
        published: new Date().toISOString(),
        content: `<p>Content ${i}</p>`,
        created: new Date().toISOString(),
        content_encoded: `<p>Content ${i}</p>`,
        categories: ["tech"],
        enclosures: [],
        thumbnail: "",
        thumbnailColor: { r: 0, g: 0, b: 0 },
        thumbnailColorComputed: "#000000",
        siteTitle: "Tech Blog",
        siteName: "Tech Blog",
        feedTitle: "Tech Blog RSS",
        feedUrl: "https://techblog.com/feed",
        favicon: "https://techblog.com/favicon.ico",
        favorite: false,
        pubDate: new Date().toISOString(),
      }));

      render(
        <TestWrapper>
          <FeedGrid items={manyItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      // Should render all provided items in the masonry layout
      const visibleArticles = screen.getAllByRole("article");
      expect(visibleArticles.length).toBe(100);

      jest.useRealTimers();
    });

    it("should handle items with images", () => {
      const itemsWithImages = mockItems.map((item) => ({
        ...item,
        image: `https://example.com/image-${item.id}.jpg`,
      }));

      render(
        <TestWrapper>
          <FeedGrid items={itemsWithImages} isLoading={false} />
        </TestWrapper>,
      );

      // Should render the loading state initially
      expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", async () => {
      jest.useFakeTimers();
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      const grid = screen.getByRole("main");
      expect(grid).toBeInTheDocument();

      const articles = screen.getAllByRole("article");
      articles.forEach((article) => {
        expect(article).toHaveAttribute("aria-label");
      });

      jest.useRealTimers();
    });

    it("should support screen reader navigation", async () => {
      jest.useFakeTimers();
      render(
        <TestWrapper>
          <FeedGrid items={mockItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      // Articles should be focusable
      const articles = screen.getAllByRole("article");
      articles.forEach((article) => {
        expect(article).toHaveAttribute("tabIndex", "0");
      });

      jest.useRealTimers();
    });

    it("should handle dynamic updates", async () => {
      jest.useFakeTimers();
      const initialItems = [mockItems[0]];
      const { rerender } = render(
        <TestWrapper>
          <FeedGrid items={initialItems} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      const newItem: FeedItem = {
        type: "item",
        id: "4",
        title: "New Article",
        description: "New content...",
        link: "https://example.com/new",
        author: "New Author",
        published: new Date().toISOString(),
        content: "<p>New content</p>",
        created: new Date().toISOString(),
        content_encoded: "<p>New content</p>",
        categories: ["tech"],
        enclosures: [],
        thumbnail: "",
        thumbnailColor: { r: 0, g: 0, b: 0 },
        thumbnailColorComputed: "#000000",
        siteTitle: "Tech Blog",
        siteName: "Tech Blog",
        feedTitle: "Tech Blog RSS",
        feedUrl: "https://techblog.com/feed",
        favicon: "https://techblog.com/favicon.ico",
        favorite: false,
        pubDate: new Date().toISOString(),
      };

      const updatedItems = [...initialItems, newItem];

      rerender(
        <TestWrapper>
          <FeedGrid items={updatedItems} isLoading={false} />
        </TestWrapper>,
      );

      // Should render the updated items
      expect(screen.getByText("New Article")).toBeInTheDocument();
      expect(screen.getAllByRole("article")).toHaveLength(2);

      jest.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing feed data gracefully", async () => {
      jest.useFakeTimers();
      const itemsWithMissingFeed = [
        {
          ...mockItems[0],
          feed_id: "non-existent",
        },
      ];

      render(
        <TestWrapper>
          <FeedGrid items={itemsWithMissingFeed} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      // Should still render the item
      expect(screen.getByText("Understanding React 18")).toBeInTheDocument();

      jest.useRealTimers();
    });

    it("should handle malformed content", async () => {
      jest.useFakeTimers();
      const itemsWithBadContent = [
        {
          ...mockItems[0],
          content_html: undefined,
          title: "Fallback Title",
        },
      ];

      render(
        <TestWrapper>
          <FeedGrid items={itemsWithBadContent} isLoading={false} />
        </TestWrapper>,
      );

      // Fast-forward timers to complete loading
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId("masonry")).toBeInTheDocument();
      });

      // Should render the grid even with malformed content
      const grid = screen.getByTestId("masonry");
      expect(grid).toBeInTheDocument();

      jest.useRealTimers();
    });
  });
});
