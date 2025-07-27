/**
 * Full user flow integration tests
 * Tests complete user journeys through the application
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFeedStore } from '@/store/useFeedStore';
import { apiService } from '@/services/api-service';

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn()
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}));

// Mock API service
jest.mock('@/services/api-service');

// Create test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store
    useFeedStore.setState({
      feeds: [],
      items: [],
      selectedFeedId: null,
      isLoading: false,
      error: null
    });
  });

  describe('New User Onboarding Flow', () => {
    it('should guide new user through adding their first feed', async () => {
      const user = userEvent.setup();
      
      // Mock empty state
      (apiService.fetchFeeds as jest.Mock).mockResolvedValue({
        feeds: [],
        items: []
      });

      // Render main page
      const MainPage = (await import('@/app/web/page')).default;
      render(<MainPage />, { wrapper: createWrapper() });

      // Should show empty state
      await waitFor(() => {
        expect(screen.getByText(/no feeds yet/i)).toBeInTheDocument();
      });

      // Click "Add Feed" button
      const addFeedButton = screen.getByRole('button', { name: /add.*feed/i });
      await user.click(addFeedButton);

      // Should navigate to settings
      expect(mockPush).toHaveBeenCalledWith('/web/settings');

      // Mock settings page
      const SettingsPage = (await import('@/app/web/settings/page')).default;
      render(<SettingsPage />, { wrapper: createWrapper() });

      // Find feed URL input
      const feedInput = screen.getByPlaceholderText(/enter.*feed.*url/i);
      await user.type(feedInput, 'https://blog.example.com/rss');

      // Mock successful feed addition
      (apiService.fetchFeeds as jest.Mock).mockResolvedValueOnce({
        feeds: [{
          id: '1',
          title: 'Example Blog',
          url: 'https://blog.example.com/rss',
          site_url: 'https://blog.example.com',
          description: 'An example blog',
          last_fetched: new Date().toISOString(),
          category: 'blog',
          added_at: new Date().toISOString()
        }],
        items: [{
          id: '1',
          feed_id: '1',
          title: 'First Post',
          url: 'https://blog.example.com/first-post',
          content_html: '<p>Welcome!</p>',
          published_at: new Date().toISOString()
        }]
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add/i });
      await user.click(submitButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/feed added successfully/i)).toBeInTheDocument();
      });

      // Should update store
      expect(useFeedStore.getState().feeds).toHaveLength(1);
    });
  });

  describe('Article Reading Flow', () => {
    it('should allow user to browse and read articles', async () => {
      const user = userEvent.setup();
      
      // Mock feeds and items
      const mockFeeds = [{
        id: '1',
        title: 'Tech News',
        url: 'https://technews.com/rss',
        site_url: 'https://technews.com',
        description: 'Latest tech news',
        last_fetched: new Date().toISOString(),
        category: 'tech',
        added_at: new Date().toISOString()
      }];

      const mockItems = [
        {
          id: '1',
          feed_id: '1',
          title: 'AI Breakthrough Announced',
          url: 'https://technews.com/ai-breakthrough',
          content_html: '<p>Scientists announce new AI breakthrough...</p>',
          published_at: new Date().toISOString(),
          author: 'Tech Reporter',
          excerpt: 'Scientists announce new AI breakthrough that could revolutionize computing.'
        },
        {
          id: '2',
          feed_id: '1',
          title: 'New JavaScript Framework Released',
          url: 'https://technews.com/new-js-framework',
          content_html: '<p>Another JavaScript framework...</p>',
          published_at: new Date(Date.now() - 86400000).toISOString(),
          author: 'JS Developer'
        }
      ];

      (apiService.fetchFeeds as jest.Mock).mockResolvedValue({
        feeds: mockFeeds,
        items: mockItems
      });

      // Update store
      useFeedStore.setState({ feeds: mockFeeds, items: mockItems });

      // Render main page
      const MainPage = (await import('@/app/web/page')).default;
      render(<MainPage />, { wrapper: createWrapper() });

      // Should show feed items
      await waitFor(() => {
        expect(screen.getByText('AI Breakthrough Announced')).toBeInTheDocument();
        expect(screen.getByText('New JavaScript Framework Released')).toBeInTheDocument();
      });

      // Click on first article
      const firstArticle = screen.getByText('AI Breakthrough Announced');
      await user.click(firstArticle);

      // Should navigate to article page
      expect(mockPush).toHaveBeenCalledWith('/web/article/1');

      // Mock article page with reader view
      (apiService.fetchReaderView as jest.Mock).mockResolvedValueOnce({
        title: 'AI Breakthrough Announced',
        content: '<p>Full article content about the AI breakthrough...</p>',
        url: 'https://technews.com/ai-breakthrough',
        author: 'Tech Reporter',
        published_date: new Date().toISOString(),
        excerpt: 'Scientists announce new AI breakthrough that could revolutionize computing.',
        lead_image_url: 'https://technews.com/ai-image.jpg',
        domain: 'technews.com',
        word_count: 500
      });

      const ArticlePage = (await import('@/app/web/article/[id]/page')).default;
      render(
        <ArticlePage params={{ id: '1' }} />,
        { wrapper: createWrapper() }
      );

      // Should show article content
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'AI Breakthrough Announced' })).toBeInTheDocument();
        expect(screen.getByText('Tech Reporter')).toBeInTheDocument();
      });

      // Mark as read
      expect(useFeedStore.getState().items[0].read).toBeTruthy();
    });
  });

  describe('Podcast Listening Flow', () => {
    it('should allow user to browse and play podcasts', async () => {
      const user = userEvent.setup();
      
      // Mock podcast feed
      const mockPodcastFeed = {
        id: '2',
        title: 'Tech Podcast',
        url: 'https://techpodcast.com/rss',
        site_url: 'https://techpodcast.com',
        description: 'Weekly tech podcast',
        last_fetched: new Date().toISOString(),
        category: 'podcast',
        added_at: new Date().toISOString()
      };

      const mockPodcastItems = [{
        id: '3',
        feed_id: '2',
        title: 'Episode 42: The Future of AI',
        url: 'https://techpodcast.com/episode-42',
        content_html: '<p>In this episode we discuss AI...</p>',
        published_at: new Date().toISOString(),
        author: 'Tech Podcast Host',
        attachments: [{
          url: 'https://techpodcast.com/episode-42.mp3',
          mime_type: 'audio/mpeg',
          size_in_bytes: 50000000,
          duration_in_seconds: 1800
        }]
      }];

      (apiService.fetchFeeds as jest.Mock).mockResolvedValue({
        feeds: [mockPodcastFeed],
        items: mockPodcastItems
      });

      useFeedStore.setState({ 
        feeds: [mockPodcastFeed], 
        items: mockPodcastItems 
      });

      // Render main page
      const MainPage = (await import('@/app/web/page')).default;
      render(<MainPage />, { wrapper: createWrapper() });

      // Should show podcast episode
      await waitFor(() => {
        expect(screen.getByText('Episode 42: The Future of AI')).toBeInTheDocument();
      });

      // Should show podcast indicator
      expect(screen.getByLabelText(/podcast/i)).toBeInTheDocument();

      // Click play button
      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);

      // Should start playing
      const audioStore = (await import('@/store/slices/audioSlice')).useAudioStore;
      expect(audioStore.getState().isPlaying).toBe(true);
      expect(audioStore.getState().currentItem?.id).toBe('3');
    });
  });

  describe('Feed Management Flow', () => {
    it('should allow user to manage feeds', async () => {
      const user = userEvent.setup();
      
      // Mock multiple feeds
      const mockFeeds = [
        {
          id: '1',
          title: 'Tech Blog',
          url: 'https://techblog.com/rss',
          site_url: 'https://techblog.com',
          description: 'Tech news',
          last_fetched: new Date().toISOString(),
          category: 'tech',
          added_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Design Blog',
          url: 'https://designblog.com/rss',
          site_url: 'https://designblog.com',
          description: 'Design inspiration',
          last_fetched: new Date().toISOString(),
          category: 'design',
          added_at: new Date().toISOString()
        }
      ];

      (apiService.fetchFeeds as jest.Mock).mockResolvedValue({
        feeds: mockFeeds,
        items: []
      });

      useFeedStore.setState({ feeds: mockFeeds, items: [] });

      // Navigate to settings
      const SettingsPage = (await import('@/app/web/settings/page')).default;
      render(<SettingsPage />, { wrapper: createWrapper() });

      // Go to feeds tab
      const feedsTab = screen.getByRole('tab', { name: /feeds/i });
      await user.click(feedsTab);

      // Should show all feeds
      await waitFor(() => {
        expect(screen.getByText('Tech Blog')).toBeInTheDocument();
        expect(screen.getByText('Design Blog')).toBeInTheDocument();
      });

      // Delete a feed
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Feed should be removed
      await waitFor(() => {
        expect(screen.queryByText('Tech Blog')).not.toBeInTheDocument();
        expect(useFeedStore.getState().feeds).toHaveLength(1);
      });
    });

    it('should allow bulk import via OPML', async () => {
      const user = userEvent.setup();
      
      // Navigate to settings
      const SettingsPage = (await import('@/app/web/settings/page')).default;
      render(<SettingsPage />, { wrapper: createWrapper() });

      // Go to feeds tab
      const feedsTab = screen.getByRole('tab', { name: /feeds/i });
      await user.click(feedsTab);

      // Click import button
      const importButton = screen.getByRole('button', { name: /import.*opml/i });
      await user.click(importButton);

      // Mock file input
      const fileInput = screen.getByLabelText(/choose.*file/i);
      const opmlFile = new File(
        [`<?xml version="1.0" encoding="UTF-8"?>
          <opml version="2.0">
            <body>
              <outline text="Tech" title="Tech">
                <outline text="Hacker News" xmlUrl="https://news.ycombinator.com/rss" />
                <outline text="TechCrunch" xmlUrl="https://techcrunch.com/feed/" />
              </outline>
            </body>
          </opml>`],
        'feeds.opml',
        { type: 'text/xml' }
      );

      await user.upload(fileInput, opmlFile);

      // Mock successful import
      (apiService.fetchFeeds as jest.Mock).mockResolvedValueOnce({
        feeds: [
          {
            id: '3',
            title: 'Hacker News',
            url: 'https://news.ycombinator.com/rss',
            site_url: 'https://news.ycombinator.com',
            description: 'Hacker News RSS',
            last_fetched: new Date().toISOString(),
            category: 'tech',
            added_at: new Date().toISOString()
          },
          {
            id: '4',
            title: 'TechCrunch',
            url: 'https://techcrunch.com/feed/',
            site_url: 'https://techcrunch.com',
            description: 'TechCrunch RSS',
            last_fetched: new Date().toISOString(),
            category: 'tech',
            added_at: new Date().toISOString()
          }
        ],
        items: []
      });

      // Confirm import
      const confirmImportButton = screen.getByRole('button', { name: /import/i });
      await user.click(confirmImportButton);

      // Should show success
      await waitFor(() => {
        expect(screen.getByText(/imported 2 feeds/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter Flow', () => {
    it('should allow user to search and filter content', async () => {
      const user = userEvent.setup();
      
      // Mock feeds and items with searchable content
      const mockItems = [
        {
          id: '1',
          feed_id: '1',
          title: 'React 18 Released',
          url: 'https://example.com/react-18',
          content_html: '<p>React 18 is now available...</p>',
          published_at: new Date().toISOString()
        },
        {
          id: '2',
          feed_id: '1',
          title: 'Vue 3 Updates',
          url: 'https://example.com/vue-3',
          content_html: '<p>Vue 3 gets new features...</p>',
          published_at: new Date().toISOString()
        },
        {
          id: '3',
          feed_id: '2',
          title: 'CSS Grid Tutorial',
          url: 'https://example.com/css-grid',
          content_html: '<p>Learn CSS Grid...</p>',
          published_at: new Date().toISOString()
        }
      ];

      useFeedStore.setState({ 
        feeds: [
          { id: '1', title: 'Dev Blog', category: 'tech' },
          { id: '2', title: 'Design Blog', category: 'design' }
        ] as any,
        items: mockItems 
      });

      // Render main page
      const MainPage = (await import('@/app/web/page')).default;
      render(<MainPage />, { wrapper: createWrapper() });

      // Use command bar for search
      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      // Search input should appear
      const searchInput = await screen.findByPlaceholderText(/search/i);
      await user.type(searchInput, 'React');

      // Should filter to React items
      await waitFor(() => {
        expect(screen.getByText('React 18 Released')).toBeInTheDocument();
        expect(screen.queryByText('Vue 3 Updates')).not.toBeInTheDocument();
        expect(screen.queryByText('CSS Grid Tutorial')).not.toBeInTheDocument();
      });

      // Clear search
      await user.clear(searchInput);
      await user.keyboard('{Escape}');

      // Filter by feed
      const feedFilter = screen.getByRole('combobox', { name: /filter.*feed/i });
      await user.click(feedFilter);
      await user.click(screen.getByText('Design Blog'));

      // Should only show design blog items
      await waitFor(() => {
        expect(screen.queryByText('React 18 Released')).not.toBeInTheDocument();
        expect(screen.queryByText('Vue 3 Updates')).not.toBeInTheDocument();
        expect(screen.getByText('CSS Grid Tutorial')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle and recover from errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      (apiService.fetchFeeds as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      // Render main page
      const MainPage = (await import('@/app/web/page')).default;
      render(<MainPage />, { wrapper: createWrapper() });

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/unable to load feeds/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Mock successful retry
      (apiService.fetchFeeds as jest.Mock).mockResolvedValueOnce({
        feeds: [{
          id: '1',
          title: 'Recovered Feed',
          url: 'https://example.com/feed',
          site_url: 'https://example.com',
          description: 'Feed loaded after retry',
          last_fetched: new Date().toISOString(),
          category: 'general',
          added_at: new Date().toISOString()
        }],
        items: []
      });

      // Click retry
      await user.click(retryButton);

      // Should recover and show content
      await waitFor(() => {
        expect(screen.queryByText(/unable to load feeds/i)).not.toBeInTheDocument();
        expect(screen.getByText('Recovered Feed')).toBeInTheDocument();
      });
    });
  });
});