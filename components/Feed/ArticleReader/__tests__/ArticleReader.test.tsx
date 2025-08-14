import React from "react";
import { render, screen, waitFor } from "@/test-utils/render";
import { ArticleReader } from "../ArticleReaderWrapper";
import { createMockFeedItem, createMockArticle } from "@/test-utils/factories";
import { createUser, mockFetch } from "@/test-utils/helpers";
import { useFeedStore } from "@/store/useFeedStore";

// Mock the store
jest.mock("@/store/useFeedStore");

// Mock the toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the use-media-query hook
jest.mock("@/hooks/use-media-query", () => ({
  useIsMobile: jest.fn(() => false),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

describe("ArticleReader", () => {
  const mockToggleStarred = jest.fn();
  const mockMarkAsRead = jest.fn();

  const defaultProps = {
    item: createMockFeedItem(),
    initialContent: null,
    onFetchComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useFeedStore as unknown as jest.Mock).mockReturnValue({
      toggleStarred: mockToggleStarred,
      markAsRead: mockMarkAsRead,
    });
  });

  it("renders loading state initially when no initial content", () => {
    render(<ArticleReader {...defaultProps} />);

    expect(screen.getByTestId("article-skeleton")).toBeInTheDocument();
  });

  it("renders article content when initial content is provided", () => {
    const mockArticle = createMockArticle();
    const initialContent = {
      title: mockArticle.title,
      content: mockArticle.content,
      author: "",
      date: defaultProps.item.published,
      url: mockArticle.url,
    };

    render(
      <ArticleReader
        {...defaultProps}
        item={createMockFeedItem()}
        initialContent={initialContent}
      />,
    );

    expect(screen.getByText(mockArticle.title)).toBeInTheDocument();
    // Author is extracted from content, so we skip this check
  });

  it("fetches reader view content when not provided", async () => {
    const mockReaderContent = {
      title: "Fetched Article Title",
      content: "<p>Fetched article content</p>",
      author: "Fetched Author",
      date: new Date().toISOString(),
      url: "https://example.com/article",
    };

    mockFetch(mockReaderContent);

    render(<ArticleReader {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Fetched Article Title")).toBeInTheDocument();
      expect(screen.getByText("Fetched article content")).toBeInTheDocument();
    });
  });

  it("handles fetch errors gracefully", async () => {
    mockFetch({}, { ok: false, status: 500 });

    render(<ArticleReader {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to fetch article content/i),
      ).toBeInTheDocument();
    });
  });

  it("marks article as read on mount", async () => {
    const mockItem = createMockFeedItem();

    render(
      <ArticleReader
        {...defaultProps}
        item={mockItem}
        initialContent={{
          title: "Test",
          content: "Test content",
          url: "https://example.com",
        }}
      />,
    );

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith(mockItem.id);
    });
  });

  it("handles bookmark toggle correctly", async () => {
    const user = createUser();
    const mockItem = createMockFeedItem({ favorite: false });

    render(
      <ArticleReader
        {...defaultProps}
        item={mockItem}
        initialContent={{
          title: "Test",
          content: "Test content",
          url: "https://example.com",
        }}
      />,
    );

    const bookmarkButton = screen.getByRole("button", { name: /bookmark/i });
    await user.click(bookmarkButton);

    expect(mockToggleStarred).toHaveBeenCalledWith(mockItem.id);
  });

  it("handles share functionality", async () => {
    const user = createUser();
    const mockShare = jest.fn();
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
    });

    render(
      <ArticleReader
        {...defaultProps}
        initialContent={{
          title: "Test Article",
          content: "Test content",
          url: "https://example.com/article",
        }}
      />,
    );

    const shareButton = screen.getByRole("button", { name: /share/i });
    await user.click(shareButton);

    expect(mockShare).toHaveBeenCalledWith({
      title: "Test Article",
      url: "https://example.com/article",
    });
  });

  it("falls back to clipboard when native share is not available", async () => {
    const user = createUser();
    delete (navigator as { share?: unknown }).share;

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      writable: true,
    });

    render(
      <ArticleReader
        {...defaultProps}
        initialContent={{
          title: "Test Article",
          content: "Test content",
          url: "https://example.com/article",
        }}
      />,
    );

    const shareButton = screen.getByRole("button", { name: /share/i });
    await user.click(shareButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://example.com/article",
    );
  });

  it("opens original article in new tab", async () => {
    const user = createUser();
    const mockOpen = jest.fn();
    window.open = mockOpen;

    render(
      <ArticleReader
        {...defaultProps}
        initialContent={{
          title: "Test Article",
          content: "Test content",
          url: "https://example.com/article",
        }}
      />,
    );

    const openButton = screen.getByRole("button", { name: /open original/i });
    await user.click(openButton);

    expect(mockOpen).toHaveBeenCalledWith(
      "https://example.com/article",
      "_blank",
    );
  });

  it("renders article header image when available", () => {
    const mockItem = createMockFeedItem({
      thumbnail: "https://example.com/image.jpg",
    });

    render(
      <ArticleReader
        {...defaultProps}
        item={mockItem}
        initialContent={{
          title: "Test",
          content: "Test content",
          url: "https://example.com",
        }}
      />,
    );

    const headerImage = screen.getByRole("img", { name: mockItem.title });
    expect(headerImage).toHaveAttribute(
      "src",
      expect.stringContaining("example.com/image.jpg"),
    );
  });

  it("sanitizes HTML content properly", async () => {
    const dangerousContent = {
      title: "Test Article",
      content:
        '<p>Safe content</p><script>alert("XSS")</script><img src="x" onerror="alert(\'XSS\')">',
      url: "https://example.com",
    };

    render(
      <ArticleReader {...defaultProps} initialContent={dangerousContent} />,
    );

    // Should render safe content
    expect(screen.getByText("Safe content")).toBeInTheDocument();

    // Should not render script tags
    expect(screen.queryByText('alert("XSS")')).not.toBeInTheDocument();

    // Should strip dangerous attributes
    const images = screen.queryAllByRole("img");
    images.forEach((img) => {
      expect(img).not.toHaveAttribute("onerror");
    });
  });

  it("handles reading time calculation", () => {
    const longContent = "word ".repeat(1000); // 1000 words ≈ 5 minutes reading time

    render(
      <ArticleReader
        {...defaultProps}
        initialContent={{
          title: "Long Article",
          content: `<p>${longContent}</p>`,
          url: "https://example.com",
        }}
      />,
    );

    // Should show estimated reading time
    expect(screen.getByText(/min read/i)).toBeInTheDocument();
  });

  it("renders markdown content correctly", () => {
    const markdownContent = {
      title: "Markdown Article",
      content:
        "# Heading\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2",
      url: "https://example.com",
    };

    render(
      <ArticleReader {...defaultProps} initialContent={markdownContent} />,
    );

    // Check markdown is rendered as HTML
    expect(
      screen.getByRole("heading", { level: 1, name: "Heading" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bold text")).toBeInTheDocument();
    expect(screen.getByText("italic text")).toBeInTheDocument();
  });
});
