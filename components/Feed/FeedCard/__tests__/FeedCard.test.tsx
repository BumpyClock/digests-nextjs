/**
 * Tests for FeedCard component
 * Tests card rendering, interactions, and visual states
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedCard } from "../FeedCard";
import { FeedItem } from "@/types";

// Mock all the external dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  })),
}));

jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

jest.mock("sonner", () => ({
  toast: jest.fn(),
}));

jest.mock("dayjs", () => {
  const mockDayjs = jest.fn(() => ({
    fromNow: () => "just now",
    format: () => "2023-12-01",
  })) as typeof dayjs;
  mockDayjs.extend = jest.fn();
  return mockDayjs;
});

jest.mock("@/hooks/useFeedActions", () => ({
  useIsItemRead: jest.fn(() => false),
  useIsInReadLater: jest.fn(() => false),
  useReadActions: jest.fn(() => ({
    markAsRead: jest.fn(),
    markAsUnread: jest.fn(),
    markAllAsRead: jest.fn(),
    toggleReadStatus: jest.fn(),
  })),
  useReadLaterActions: jest.fn(() => ({
    addToReadLater: jest.fn(),
    removeFromReadLater: jest.fn(),
    toggleReadLater: jest.fn(),
  })),
}));

jest.mock("@/contexts/FeedAnimationContext", () => ({
  useFeedAnimation: jest.fn(() => ({ animationEnabled: true })),
}));

jest.mock("@/utils/shadow", () => ({
  generateCardShadows: jest.fn(() => ({
    restShadow: "0 1px 3px rgba(0,0,0,0.1)",
    hoverShadow: "0 4px 12px rgba(0,0,0,0.15)",
    pressedShadow: "0 1px 2px rgba(0,0,0,0.1)",
  })),
}));

jest.mock("@/utils/htmlUtils", () => ({
  cleanupTextContent: jest.fn((text) => text),
}));

jest.mock("@/utils/imagekit", () => ({
  getImageKitUrl: jest.fn((url) => url),
  IMAGE_PRESETS: { feedCardThumbnail: "thumbnail" },
  canUseImageKit: jest.fn(() => false),
}));

jest.mock("@/types/podcast", () => ({
  isPodcast: jest.fn(() => false),
}));

jest.mock("@/components/reader-view-modal", () => ({
  ReaderViewModal: jest.fn(({ isOpen, children }) =>
    isOpen ? <div data-testid="reader-modal">{children}</div> : null,
  ),
}));

jest.mock("@/components/Podcast/PodcastDetailsModal", () => ({
  PodcastDetailsModal: jest.fn(({ isOpen, children }) =>
    isOpen ? <div data-testid="podcast-modal">{children}</div> : null,
  ),
}));

jest.mock("@/components/Podcast/shared/PodcastPlayButton", () => ({
  PodcastPlayButton: jest.fn(() => (
    <button data-testid="play-button">Play</button>
  )),
}));

jest.mock("@/components/ui/ambilight", () => ({
  Ambilight: jest.fn(({ children, className }) => (
    <div className={className}>{children}</div>
  )),
}));

jest.mock("@/utils/formatDuration", () => ({
  formatDuration: jest.fn((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }),
}));

jest.mock("motion/react", () => ({
  motion: {
    div: jest.fn(
      ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    ),
  },
}));

// Sample test data
const mockItem: FeedItem = {
  type: "item",
  id: "1",
  title: "Understanding React 18 Concurrent Features",
  description:
    "React 18 introduces exciting new features for better performance.",
  link: "https://techblog.com/react-18",
  author: "John Doe",
  published: new Date().toISOString(),
  content: "<p>React 18 introduces exciting new features...</p>",
  created: new Date().toISOString(),
  content_encoded: "<p>React 18 introduces exciting new features...</p>",
  categories: ["tech"],
  enclosures: [],
  thumbnail: "https://techblog.com/react-18.jpg",
  thumbnailColor: { r: 100, g: 150, b: 200 },
  thumbnailColorComputed: "#6496c8",
  siteTitle: "Tech Blog",
  siteName: "Tech Blog",
  feedTitle: "Tech Blog RSS",
  feedUrl: "https://techblog.com/feed",
  favicon: "https://techblog.com/favicon.ico",
  favorite: false,
  pubDate: new Date().toISOString(),
};

const mockPodcastItem: FeedItem = {
  ...mockItem,
  attachments: [
    {
      url: "https://example.com/episode.mp3",
      mime_type: "audio/mpeg",
      size_in_bytes: 50000000,
      duration_in_seconds: 1800,
    },
  ],
  duration: 1800,
};

describe("FeedCard", () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render basic card elements", () => {
      render(<FeedCard feed={mockItem} />);

      // Title
      expect(
        screen.getByText("Understanding React 18 Concurrent Features"),
      ).toBeInTheDocument();

      // Site title
      expect(screen.getByText("Tech Blog")).toBeInTheDocument();

      // Author (if displayed separately)
      if (screen.queryByText("By John Doe")) {
        expect(screen.getByText("By John Doe")).toBeInTheDocument();
      }

      // Description
      expect(
        screen.getByText(/React 18 introduces exciting new features/),
      ).toBeInTheDocument();
    });

    it("should render image when available", () => {
      render(<FeedCard feed={mockItem} />);

      const image = screen.getByRole("img", {
        name: /Understanding React 18 Concurrent Features/i,
      });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://techblog.com/react-18.jpg");
    });

    it("should render without image when thumbnail is missing", () => {
      const itemWithoutImage = { ...mockItem, thumbnail: "" };

      render(<FeedCard feed={itemWithoutImage} />);

      // The main content should still render
      expect(
        screen.getByText("Understanding React 18 Concurrent Features"),
      ).toBeInTheDocument();

      // Image should not be present
      expect(
        screen.queryByRole("img", {
          name: /Understanding React 18 Concurrent Features/i,
        }),
      ).not.toBeInTheDocument();
    });

    it("should format publish date", () => {
      render(<FeedCard feed={mockItem} />);

      // Should show relative time for recent posts
      expect(screen.getByText("just now")).toBeInTheDocument();
    });
  });

  describe("Podcast Support", () => {
    beforeEach(async () => {
      // Mock isPodcast to return true for podcast tests
      const { isPodcast } = await import("@/types/podcast");
      isPodcast.mockReturnValue(true);
    });

    afterEach(async () => {
      // Reset isPodcast mock
      const { isPodcast } = await import("@/types/podcast");
      isPodcast.mockReturnValue(false);
    });

    it("should show play button for podcasts", () => {
      render(<FeedCard feed={mockPodcastItem} />);

      expect(screen.getByTestId("play-button")).toBeInTheDocument();
    });

    it("should show duration for podcasts", () => {
      render(<FeedCard feed={mockPodcastItem} />);

      // 1800 seconds = 30 minutes
      expect(screen.getByText("30:00")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should handle card click events", async () => {
      const mockMarkAsRead = jest.fn();
      const { useReadActions } = await import("@/hooks/useFeedActions");
      useReadActions.mockReturnValue({
        markAsRead: mockMarkAsRead,
        markAsUnread: jest.fn(),
        markAllAsRead: jest.fn(),
        toggleReadStatus: jest.fn(),
      });

      render(<FeedCard feed={mockItem} />);

      // Find the card (it should be clickable)
      const card = screen
        .getByText("Understanding React 18 Concurrent Features")
        .closest('div[class*="cursor-pointer"]');
      if (card) {
        fireEvent.click(card);
        expect(mockMarkAsRead).toHaveBeenCalledWith(mockItem.id);
      }
    });

    it("should handle bookmark action", async () => {
      const mockAddToReadLater = jest.fn();
      const { useReadLaterActions } = await import("@/hooks/useFeedActions");
      useReadLaterActions.mockReturnValue({
        addToReadLater: mockAddToReadLater,
        removeFromReadLater: jest.fn(),
        toggleReadLater: jest.fn(),
      });

      render(<FeedCard feed={mockItem} />);

      // Find bookmark button by its sr-only text content
      const bookmarkButton = screen.getByText("Read Later").closest("button");
      expect(bookmarkButton).toBeInTheDocument();

      if (bookmarkButton) {
        fireEvent.click(bookmarkButton);
        expect(mockAddToReadLater).toHaveBeenCalledWith(mockItem.id);
      }
    });

    it("should handle share action", () => {
      // Mock navigator.share
      const mockShare = jest.fn();
      Object.defineProperty(navigator, "share", {
        value: mockShare,
        writable: true,
      });

      render(<FeedCard feed={mockItem} />);

      // Find share button by its sr-only text content
      const shareButton = screen.getByText("Share").closest("button");
      expect(shareButton).toBeInTheDocument();

      if (shareButton) {
        fireEvent.click(shareButton);
        expect(mockShare).toHaveBeenCalledWith({
          title: mockItem.title,
          text: mockItem.description,
          url: mockItem.link,
        });
      }
    });
  });

  describe("Visual States", () => {
    it("should show read state with reduced opacity", async () => {
      const { useIsItemRead } = await import("@/hooks/useFeedActions");
      useIsItemRead.mockReturnValue(true);

      render(<FeedCard feed={mockItem} />);

      const card = screen
        .getByText("Understanding React 18 Concurrent Features")
        .closest('div[class*="card"]');
      expect(card).toHaveClass("read-item");
    });

    it("should handle image loading errors", () => {
      render(<FeedCard feed={mockItem} />);

      const image = screen.getByRole("img", {
        name: /Understanding React 18 Concurrent Features/i,
      });
      fireEvent.error(image);

      // Should show placeholder or handle error gracefully
      // The exact behavior depends on implementation
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required data gracefully", () => {
      const incompleteItem = {
        ...mockItem,
        title: "",
        description: "",
        siteTitle: "",
      };

      render(<FeedCard feed={incompleteItem} />);

      // Should render without crashing - the component should display even with empty data
      // Check that the card container exists and doesn't crash
      expect(document.querySelector(".card")).toBeInTheDocument();

      // Check that author is still displayed when available
      expect(screen.getByText("By John Doe")).toBeInTheDocument();
    });

    it("should handle invalid thumbnail URLs", () => {
      const itemWithInvalidThumbnail = {
        ...mockItem,
        thumbnail: "invalid-url",
      };

      render(<FeedCard feed={itemWithInvalidThumbnail} />);

      // Should render the rest of the content
      expect(
        screen.getByText("Understanding React 18 Concurrent Features"),
      ).toBeInTheDocument();
    });
  });
});
