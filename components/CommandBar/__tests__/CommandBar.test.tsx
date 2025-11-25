// ABOUTME: Unit tests for the CommandBar component with React Query integration
// ABOUTME: Tests prop vs store fallback behavior and component functionality
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { CommandBar } from '../CommandBar';
import { useFeeds, useReadActions } from '@/hooks/useFeedSelectors';
import { useFeedStore } from '@/store/useFeedStore';
import { useCommandBarShortcuts } from '@/hooks/use-command-bar-shortcuts';
import { useCommandBarSearch } from '@/hooks/use-command-bar-search';
import { FeedItem, Feed } from '@/types';

// Helper factories to create fully-typed Feed / FeedItem objects with sensible defaults
function createFeed(partial: Partial<Feed>): Feed {
  return {
    type: 'rss',
    guid: partial.guid ?? `guid-${Math.random().toString(36).slice(2)}`,
    status: partial.status ?? 'active',
    siteTitle: partial.siteTitle ?? partial.feedTitle ?? 'Site Title',
    feedTitle: partial.feedTitle ?? 'Feed Title',
    feedUrl: partial.feedUrl ?? 'https://example.com/feed.xml',
    description: partial.description ?? 'Description',
    link: partial.link ?? 'https://example.com',
    lastUpdated: partial.lastUpdated ?? new Date().toISOString(),
    lastRefreshed: partial.lastRefreshed ?? new Date().toISOString(),
    published: partial.published ?? new Date().toISOString(),
    author: partial.author ?? 'Author',
    language: partial.language ?? 'en',
    favicon: partial.favicon ?? 'https://example.com/favicon.ico',
    categories: partial.categories ?? 'general',
    items: partial.items,
  };
}

function createFeedItem(partial: Partial<FeedItem>): FeedItem {
  return {
    type: partial.type ?? 'article',
    id: partial.id ?? `id-${Math.random().toString(36).slice(2)}`,
    title: partial.title ?? 'Untitled',
    description: partial.description ?? 'Desc',
    link: partial.link ?? 'https://example.com/item',
    author: partial.author ?? 'Author',
    published: partial.published ?? new Date().toISOString(),
    content: partial.content ?? 'Content',
    created: partial.created ?? new Date().toISOString(),
    content_encoded: partial.content_encoded ?? 'Encoded',
    categories: partial.categories ?? 'general',
    enclosures: partial.enclosures ?? null,
    thumbnail: partial.thumbnail ?? '',
    thumbnailColor: partial.thumbnailColor ?? { r: 0, g: 0, b: 0 },
    thumbnailColorComputed: partial.thumbnailColorComputed ?? '#000000',
    siteTitle: partial.siteTitle ?? partial.feedTitle ?? 'Site Title',
    feedTitle: partial.feedTitle ?? 'Feed Title',
    feedUrl: partial.feedUrl ?? 'https://example.com/feed.xml',
    favicon: partial.favicon ?? 'https://example.com/favicon.ico',
    favorite: partial.favorite,
    duration: partial.duration,
    itunesEpisode: partial.itunesEpisode,
    itunesSeason: partial.itunesSeason,
    feedImage: partial.feedImage,
  };
}

// Mock all dependencies
jest.mock('next/navigation');
jest.mock('next-themes');
jest.mock('@/hooks/useFeedSelectors');
jest.mock('@/store/useFeedStore');
jest.mock('@/hooks/use-command-bar-shortcuts');
jest.mock('@/hooks/use-command-bar-search');
jest.mock('@/components/reader-view-modal', () => {
  type ReaderViewModalProps = {
    isOpen: boolean;
    onClose: () => void;
    feedItem?: { title?: string } | null;
  };

  return {
    ReaderViewModal: ({ isOpen, onClose, feedItem }: ReaderViewModalProps) =>
      isOpen ? (
        <div data-testid="reader-modal">
          <button type="button" onClick={onClose}>Close</button>
          <div>{feedItem?.title}</div>
        </div>
      ) : null,
  };
});

const mockRouter = {
  push: jest.fn(),
};

const mockTheme = {
  setTheme: jest.fn(),
};

const mockFeeds: Feed[] = [
  createFeed({
    feedUrl: 'https://example.com/feed1.xml',
    feedTitle: 'Test Feed 1',
    siteTitle: 'Test Site 1',
    description: 'Test Description',
    favicon: 'https://example.com/favicon.ico',
    language: 'en',
    author: 'Test Author',
    categories: 'tech',
  }),
];

const mockFeedItems: FeedItem[] = [
  createFeedItem({
    id: 'item1',
    title: 'Test Article 1',
    description: 'Test Description 1',
    published: '2024-01-01T10:00:00Z',
    feedUrl: 'https://example.com/feed1.xml',
    feedTitle: 'Test Feed 1',
    type: 'article',
  }),
  createFeedItem({
    id: 'item2',
    title: 'Test Article 2',
    description: 'Test Description 2',
    published: '2024-01-01T09:00:00Z',
    feedUrl: 'https://example.com/feed1.xml',
    feedTitle: 'Test Feed 1',
    type: 'podcast',
  }),
];

const mockDefaultProps = {
  value: '',
  onChange: jest.fn(),
  onApplySearch: jest.fn(),
  onSeeAllMatches: jest.fn(),
  handleRefresh: jest.fn(),
  onFeedSelect: jest.fn(),
};

describe('CommandBar', () => {
  beforeEach(() => {
    // Setup default mocks
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useTheme as jest.Mock).mockReturnValue(mockTheme);
    (useFeeds as jest.Mock).mockReturnValue(mockFeeds);
    (useReadActions as jest.Mock).mockReturnValue({
      markAllAsRead: jest.fn(),
    });
  (useFeedStore as unknown as jest.Mock).mockReturnValue(mockFeedItems); // Store feedItems
    (useCommandBarShortcuts as jest.Mock).mockReturnValue({
      open: false,
      setOpen: jest.fn(),
      handleKeyDown: jest.fn(),
      handleClose: jest.fn(),
    });
    (useCommandBarSearch as jest.Mock).mockReturnValue({
      filteredSources: [],
      filteredItems: [],
      handleSeeAllMatches: jest.fn(),
    });

    jest.clearAllMocks();
  });

  describe('prop vs store fallback behavior', () => {
    it('should prefer items prop over store when provided', () => {
      const propItems: FeedItem[] = [
        createFeedItem({
          id: 'prop-item',
          title: 'Prop Item',
          description: 'From prop',
          published: '2024-01-01T10:00:00Z',
          feedUrl: 'https://example.com/prop.xml',
          feedTitle: 'Prop Feed',
          type: 'article',
        }),
      ];

      render(
        <CommandBar
          {...mockDefaultProps}
          items={propItems}
        />
      );

      // useCommandBarSearch should be called with prop items, not store items
      expect(useCommandBarSearch).toHaveBeenCalledWith(
        mockDefaultProps.value,
        propItems, // Should use prop items
        mockFeeds,
        mockDefaultProps.onSeeAllMatches,
        expect.any(Function),
        mockDefaultProps.onChange
      );
    });

    it('should fallback to store items when no prop provided', () => {
      render(
        <CommandBar
          {...mockDefaultProps}
        />
      );

      // useCommandBarSearch should be called with store items
      expect(useCommandBarSearch).toHaveBeenCalledWith(
        mockDefaultProps.value,
        mockFeedItems, // Should use store items
        mockFeeds,
        mockDefaultProps.onSeeAllMatches,
        expect.any(Function),
        mockDefaultProps.onChange
      );
    });

    it('should use empty array when both prop and store are empty', () => {
  (useFeedStore as unknown as jest.Mock).mockReturnValue([]); // Empty store

      render(
        <CommandBar
          {...mockDefaultProps}
          items={[]} // Empty prop
        />
      );

      expect(useCommandBarSearch).toHaveBeenCalledWith(
        mockDefaultProps.value,
        [], // Should use empty array from prop
        mockFeeds,
        mockDefaultProps.onSeeAllMatches,
        expect.any(Function),
        mockDefaultProps.onChange
      );
    });

    it('should handle undefined prop and fallback to store', () => {
      render(
        <CommandBar
          {...mockDefaultProps}
          items={undefined}
        />
      );

      expect(useCommandBarSearch).toHaveBeenCalledWith(
        mockDefaultProps.value,
        mockFeedItems, // Should fallback to store
        mockFeeds,
        mockDefaultProps.onSeeAllMatches,
        expect.any(Function),
        mockDefaultProps.onChange
      );
    });
  });

  describe('rendering', () => {
    it('should render search trigger button', () => {
      render(<CommandBar {...mockDefaultProps} />);

      const searchButton = screen.getByRole('button', { name: /search feeds and articles/i });
      expect(searchButton).toBeInTheDocument();
    });

    it('should display current search value in trigger button', () => {
      const searchValue = 'test search query';

      render(<CommandBar {...mockDefaultProps} value={searchValue} />);

      expect(screen.getByText(searchValue)).toBeInTheDocument();
    });

    it('should open command dialog when trigger clicked', async () => {
      const mockSetOpen = jest.fn();
      (useCommandBarShortcuts as jest.Mock).mockReturnValue({
        open: false,
        setOpen: mockSetOpen,
        handleKeyDown: jest.fn(),
        handleClose: jest.fn(),
      });

      render(<CommandBar {...mockDefaultProps} />);

      const searchButton = screen.getByRole('button', { name: /search feeds and articles/i });
      fireEvent.click(searchButton);

      expect(mockSetOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('command dialog content', () => {
    beforeEach(() => {
      // Setup dialog as open for content tests
      (useCommandBarShortcuts as jest.Mock).mockReturnValue({
        open: true,
        setOpen: jest.fn(),
        handleKeyDown: jest.fn(),
        handleClose: jest.fn(),
      });
    });

    it('should render filtered articles when search results exist', () => {
      const filteredArticles = mockFeedItems.filter(item => item.type === 'article');

      (useCommandBarSearch as jest.Mock).mockReturnValue({
        filteredSources: [],
        filteredItems: filteredArticles,
        handleSeeAllMatches: jest.fn(),
      });

      render(<CommandBar {...mockDefaultProps} />);

      expect(screen.getByText('ARTICLES (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    it('should render filtered podcasts when search results exist', () => {
      const filteredPodcasts = mockFeedItems.filter(item => item.type === 'podcast');

      (useCommandBarSearch as jest.Mock).mockReturnValue({
        filteredSources: [],
        filteredItems: filteredPodcasts,
        handleSeeAllMatches: jest.fn(),
      });

      render(<CommandBar {...mockDefaultProps} />);

      expect(screen.getByText('PODCASTS (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Article 2')).toBeInTheDocument();
    });

    it('should render feed sources when available', () => {
      (useCommandBarSearch as jest.Mock).mockReturnValue({
        filteredSources: mockFeeds,
        filteredItems: [],
        handleSeeAllMatches: jest.fn(),
      });

      render(<CommandBar {...mockDefaultProps} />);

      expect(screen.getByText('Feeds (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Feed 1')).toBeInTheDocument();
    });

    it('should show "No results found" when no matches', () => {
      (useCommandBarSearch as jest.Mock).mockReturnValue({
        filteredSources: [],
        filteredItems: [],
        handleSeeAllMatches: jest.fn(),
      });

      render(<CommandBar {...mockDefaultProps} />);

      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  describe('article selection and modal', () => {
    beforeEach(() => {
      (useCommandBarShortcuts as jest.Mock).mockReturnValue({
        open: true,
        setOpen: jest.fn(),
        handleKeyDown: jest.fn(),
        handleClose: jest.fn(),
      });

      (useCommandBarSearch as jest.Mock).mockReturnValue({
        filteredSources: [],
        filteredItems: mockFeedItems,
        handleSeeAllMatches: jest.fn(),
      });
    });

    it('should open reader modal when article is selected', async () => {
      render(<CommandBar {...mockDefaultProps} />);

      const articleElement = screen.getByText('Test Article 1');
      fireEvent.click(articleElement);

      await waitFor(() => {
        expect(screen.getByTestId('reader-modal')).toBeInTheDocument();
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      });
    });

    it('should close reader modal when close button clicked', async () => {
      render(<CommandBar {...mockDefaultProps} />);

      // Open modal
      const articleElement = screen.getByText('Test Article 1');
      fireEvent.click(articleElement);

      await waitFor(() => {
        expect(screen.getByTestId('reader-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('reader-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('suggestions section', () => {
    beforeEach(() => {
      (useCommandBarShortcuts as jest.Mock).mockReturnValue({
        open: true,
        setOpen: jest.fn(),
        handleKeyDown: jest.fn(),
        handleClose: jest.fn(),
      });
    });

    it('should show suggestions when no search results', () => {
      (useCommandBarSearch as jest.Mock).mockReturnValue({
        filteredSources: [],
        filteredItems: [],
        handleSeeAllMatches: jest.fn(),
      });

      render(<CommandBar {...mockDefaultProps} />);

      expect(screen.getByText('Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('RSS Feeds')).toBeInTheDocument();
      expect(screen.getByText('Podcasts')).toBeInTheDocument();
    });

    it('should call appropriate handlers for suggestion actions', () => {
      const mockSetOpen = jest.fn();
      (useCommandBarShortcuts as jest.Mock).mockReturnValue({
        open: true,
        setOpen: mockSetOpen,
        handleKeyDown: jest.fn(),
        handleClose: jest.fn(),
      });

      (useCommandBarSearch as jest.Mock).mockReturnValue({
        filteredSources: [],
        filteredItems: [],
        handleSeeAllMatches: jest.fn(),
      });

      render(<CommandBar {...mockDefaultProps} />);

      // Test settings navigation
      const settingsItem = screen.getByText('Settings');
      fireEvent.click(settingsItem);

      expect(mockRouter.push).toHaveBeenCalledWith('/web/settings');
      expect(mockSetOpen).toHaveBeenCalledWith(false);
    });
  });
});
