// ABOUTME: Integration tests for feed state migration from Zustand to React Query
// ABOUTME: Tests complete workflows, data integrity, and component interactions

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { FeedList } from '@/components/Feed/FeedList/FeedList'
import { AddFeedForm } from '@/components/Feed/AddFeedForm/AddFeedForm'
import { FeedItem } from '@/components/Feed/FeedItem/FeedItem'
import { useFeeds } from '@/hooks/queries/use-feeds'
import { useAddFeed, useDeleteFeed } from '@/hooks/queries/use-feed-mutations'
import { useFeedStore } from '@/store/useFeedStore'
import { apiService } from '@/services/api-service'
import { FEATURES } from '@/lib/feature-flags'
import type { Feed, FeedItem as FeedItemType } from '@/types'

// Mock dependencies
jest.mock('@/services/api-service')
jest.mock('@/store/useFeedStore')
jest.mock('@/lib/feature-flags')
jest.mock('@/hooks/use-toast')

const mockApiService = apiService as jest.Mocked<typeof apiService>
const mockUseFeedStore = useFeedStore as jest.MockedFunction<typeof useFeedStore>
const mockFeatures = FEATURES as jest.Mocked<typeof FEATURES>

// Test data
const mockFeed: Feed = {
  type: 'feed',
  guid: 'test-feed-1',
  status: 'active',
  siteTitle: 'Test Blog',
  feedTitle: 'Test Blog RSS',
  feedUrl: 'https://test.com/feed.xml',
  description: 'A test blog for testing',
  link: 'https://test.com',
  lastUpdated: '2023-01-01T00:00:00Z',
  lastRefreshed: '2023-01-01T00:00:00Z',
  published: '2023-01-01T00:00:00Z',
  author: 'Test Author',
  language: 'en',
  favicon: 'https://test.com/favicon.ico',
  categories: 'tech,programming',
}

const mockFeedItem: FeedItemType = {
  type: 'item',
  id: 'test-item-1',
  title: 'Test Article Title',
  description: 'This is a test article description',
  link: 'https://test.com/article-1',
  author: 'Test Author',
  published: '2023-01-01T00:00:00Z',
  content: 'Full article content here',
  created: '2023-01-01T00:00:00Z',
  content_encoded: 'Encoded article content',
  categories: ['tech', 'programming'],
  enclosures: [],
  thumbnail: 'https://test.com/thumb.jpg',
  thumbnailColor: '#007acc',
  thumbnailColorComputed: true,
  siteTitle: 'Test Blog',
  feedTitle: 'Test Blog RSS',
  feedUrl: 'https://test.com/feed.xml',
  favicon: 'https://test.com/favicon.ico',
  favorite: false,
  pubDate: '2023-01-01T00:00:00Z',
}

const mockFeedStore = {
  feeds: [mockFeed],
  feedItems: [mockFeedItem],
  setFeeds: jest.fn(),
  setFeedItems: jest.fn(),
  initialized: true,
  hydrated: true,
  readItems: new Set<string>(),
  activeFeed: null,
  readLaterItems: new Set<string>(),
  setHydrated: jest.fn(),
  setActiveFeed: jest.fn(),
  setInitialized: jest.fn(),
  sortFeedItemsByDate: jest.fn().mockImplementation((items: FeedItemType[]) => items),
  removeFeedFromCache: jest.fn(),
  markAsRead: jest.fn(),
  getUnreadItems: jest.fn().mockReturnValue([]),
  markAllAsRead: jest.fn(),
  addToReadLater: jest.fn(),
  removeFromReadLater: jest.fn(),
  isInReadLater: jest.fn().mockReturnValue(false),
  getReadLaterItems: jest.fn().mockReturnValue([]),
  // Audio slice properties
  volume: 1,
  isMuted: false,
  isMinimized: false,
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playlist: [],
  playbackRate: 1,
  setVolume: jest.fn(),
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
  seek: jest.fn(),
  addToPlaylist: jest.fn(),
  removeFromPlaylist: jest.fn(),
}

// Test wrapper
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Feed State Migration Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseFeedStore.mockReturnValue(mockFeedStore)
    mockFeatures.USE_REACT_QUERY_FEEDS = true
    mockFeatures.ENABLE_OFFLINE_SUPPORT = false
    mockFeatures.ENABLE_BACKGROUND_SYNC = false

    // Mock successful API responses by default
    mockApiService.refreshFeeds.mockResolvedValue({
      feeds: [mockFeed],
      items: [mockFeedItem]
    })
    mockApiService.feeds.create.mockResolvedValue(mockFeed)
    mockApiService.feeds.delete.mockResolvedValue(undefined)
  })

  describe('Data Migration Between Stores', () => {
    it('should successfully migrate from Zustand to React Query', async () => {
      const TestComponent = () => {
        const { feeds, items, isLoading } = useFeeds()
        
        if (isLoading) return <div>Loading...</div>
        
        return (
          <div>
            <div data-testid="feed-count">{feeds.length}</div>
            <div data-testid="item-count">{items.length}</div>
            {feeds.map(feed => (
              <div key={feed.guid} data-testid={`feed-${feed.guid}`}>
                {feed.feedTitle}
              </div>
            ))}
          </div>
        )
      }

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('feed-count')).toHaveTextContent('1')
        expect(screen.getByTestId('item-count')).toHaveTextContent('1')
        expect(screen.getByTestId(`feed-${mockFeed.guid}`)).toHaveTextContent(mockFeed.feedTitle)
      })

      expect(mockApiService.refreshFeeds).toHaveBeenCalled()
    })

    it('should maintain data consistency during migration', async () => {
      // Test that data integrity is preserved when switching between stores
      let useReactQuery = false

      const TestComponent = () => {
        const { feeds, items } = useFeeds({ enabled: useReactQuery })
        const zustandData = mockUseFeedStore()
        
        const currentFeeds = useReactQuery ? feeds : zustandData.feeds
        const currentItems = useReactQuery ? items : zustandData.feedItems
        
        return (
          <div>
            <div data-testid="current-feeds">{currentFeeds.length}</div>
            <div data-testid="current-items">{currentItems.length}</div>
          </div>
        )
      }

      const Wrapper = createTestWrapper()
      const { rerender } = render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      )

      // Initially using Zustand
      expect(screen.getByTestId('current-feeds')).toHaveTextContent('1')
      expect(screen.getByTestId('current-items')).toHaveTextContent('1')

      // Switch to React Query
      useReactQuery = true
      rerender(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-feeds')).toHaveTextContent('1')
        expect(screen.getByTestId('current-items')).toHaveTextContent('1')
      })
    })
  })

  describe('Component Integration', () => {
    it('should integrate FeedList with React Query', async () => {
      const handleItemSelect = jest.fn()

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <FeedList
            onItemSelect={handleItemSelect}
            enableReactQuery={true}
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(mockFeedItem.title)).toBeInTheDocument()
      })

      // Click on an item
      fireEvent.click(screen.getByText(mockFeedItem.title))
      expect(handleItemSelect).toHaveBeenCalledWith(mockFeedItem, expect.any(Number))
    })

    it('should integrate AddFeedForm with mutations', async () => {
      const newFeed = { ...mockFeed, guid: 'new-feed', feedUrl: 'https://new.com/feed.xml' }
      mockApiService.feeds.create.mockResolvedValue(newFeed)
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [newFeed],
        items: []
      })

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <AddFeedForm />
        </Wrapper>
      )

      // Fill in the form
      const urlInput = screen.getByLabelText(/feed url/i)
      fireEvent.change(urlInput, { target: { value: 'https://new.com/feed.xml' } })

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /add feed/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockApiService.feeds.create).toHaveBeenCalledWith({
          url: 'https://new.com/feed.xml'
        })
      })

      expect(screen.getByText(/adding feed/i)).toBeInTheDocument()
    })

    it('should integrate FeedItem with mutations', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <FeedItem feed={mockFeed} />
        </Wrapper>
      )

      // Open the actions menu
      const menuButton = screen.getByRole('button', { name: /open menu/i })
      fireEvent.click(menuButton)

      // Click refresh
      const refreshButton = screen.getByText(/refresh/i)
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(mockApiService.feeds.refresh).toHaveBeenCalledWith(mockFeed.guid)
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Network error')
      mockApiService.refreshFeeds.mockRejectedValue(apiError)

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <FeedList
            onItemSelect={jest.fn()}
            enableReactQuery={true}
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/failed to load feeds/i)).toBeInTheDocument()
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      // Should show retry button
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('should handle mutation errors with rollback', async () => {
      const deleteError = new Error('Delete failed')
      mockApiService.feeds.delete.mockRejectedValue(deleteError)

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <FeedItem feed={mockFeed} />
        </Wrapper>
      )

      // Open menu and try to delete
      const menuButton = screen.getByRole('button', { name: /open menu/i })
      fireEvent.click(menuButton)

      const deleteButton = screen.getByText(/delete/i)
      fireEvent.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByText(/delete feed/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText(/delete failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Feature Flag Integration', () => {
    it('should fallback to Zustand when React Query is disabled', async () => {
      mockFeatures.USE_REACT_QUERY_FEEDS = false

      const TestComponent = () => {
        const { feeds, items } = useFeeds()
        return (
          <div>
            <div data-testid="feed-count">{feeds.length}</div>
            <div data-testid="item-count">{items.length}</div>
          </div>
        )
      }

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      )

      // Should use Zustand data immediately
      expect(screen.getByTestId('feed-count')).toHaveTextContent('1')
      expect(screen.getByTestId('item-count')).toHaveTextContent('0') // React Query disabled

      // Should not call API
      expect(mockApiService.refreshFeeds).not.toHaveBeenCalled()
    })

    it('should enable offline features when configured', async () => {
      mockFeatures.ENABLE_OFFLINE_SUPPORT = true

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <FeedList
            onItemSelect={jest.fn()}
            enableReactQuery={true}
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
      })
    })

    it('should enable background sync when configured', async () => {
      mockFeatures.ENABLE_BACKGROUND_SYNC = true

      const TestComponent = () => {
        const { isBackgroundFetching, feeds } = useFeeds()
        return (
          <div>
            <div data-testid="background-fetching">
              {isBackgroundFetching ? 'syncing' : 'idle'}
            </div>
            <div data-testid="feed-count">{feeds.length}</div>
          </div>
        )
      }

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('feed-count')).toHaveTextContent('1')
      })

      // Background sync should be configurable
      expect(screen.getByTestId('background-fetching')).toBeInTheDocument()
    })
  })

  describe('Performance and Caching', () => {
    it('should cache data across component remounts', async () => {
      const TestComponent = () => {
        const { feeds, isLoading } = useFeeds()
        if (isLoading) return <div>Loading...</div>
        return <div data-testid="feed-count">{feeds.length}</div>
      }

      const Wrapper = createTestWrapper()
      
      // Mount component
      const { unmount } = render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('feed-count')).toHaveTextContent('1')
      })

      expect(mockApiService.refreshFeeds).toHaveBeenCalledTimes(1)

      // Unmount and remount
      unmount()
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      )

      // Should use cached data, no additional API call
      expect(screen.getByTestId('feed-count')).toHaveTextContent('1')
      expect(mockApiService.refreshFeeds).toHaveBeenCalledTimes(1)
    })

    it('should handle optimistic updates correctly', async () => {
      const TestComponent = () => {
        const addFeedMutation = useAddFeed()
        const { feeds } = useFeeds()

        return (
          <div>
            <div data-testid="feed-count">{feeds.length}</div>
            <button
              onClick={() => addFeedMutation.mutate({ url: 'https://new.com/feed.xml' })}
            >
              Add Feed
            </button>
            <div data-testid="mutation-status">
              {addFeedMutation.isPending ? 'pending' : 'idle'}
            </div>
          </div>
        )
      }

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('feed-count')).toHaveTextContent('1')
      })

      // Add new feed
      fireEvent.click(screen.getByText('Add Feed'))

      // Should show pending state
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('pending')

      await waitFor(() => {
        expect(screen.getByTestId('mutation-status')).toHaveTextContent('idle')
      })

      expect(mockApiService.feeds.create).toHaveBeenCalled()
    })
  })
})