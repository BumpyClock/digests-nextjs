/**
 * Tests for React Query hooks: useFeedsQuery, useAddFeedMutation, useRemoveFeedMutation, etc.
 * Tests feed fetching, caching, state management, and optimistic updates
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useFeedsQuery, 
  useAddFeedMutation,
  useRemoveFeedMutation,
  useRefreshFeedsMutation,
  useBatchAddFeedsMutation,
  feedsKeys
} from '../queries/use-feeds-query';
import { apiService } from '@/services/api-service';
import { useFeedStore } from '@/store/useFeedStore';
import React from 'react';
import type { Feed, FeedItem } from '@/types';

// Mock dependencies
jest.mock('@/services/api-service');
jest.mock('@/store/useFeedStore');

// Create wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useFeedsQuery', () => {
  const mockFeeds: Feed[] = [
    {
      id: '1',
      feedTitle: 'Tech Blog',
      feedUrl: 'https://techblog.com/feed',
      siteUrl: 'https://techblog.com',
      feedDescription: 'Tech news',
      addedOn: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categories: 'tech',
      items: []
    }
  ];

  const mockItems: FeedItem[] = [
    {
      id: '1',
      feedId: '1',
      feedUrl: 'https://techblog.com/feed',
      title: 'Test Article',
      link: 'https://techblog.com/article',
      content: '<p>Content</p>',
      contentSnippet: 'Content',
      published: new Date().toISOString(),
      pubDate: new Date().toISOString(),
      author: 'Test Author',
      categories: ['tech']
    }
  ];

  const mockSetFeeds = jest.fn();
  const mockSetFeedItems = jest.fn();
  const mockGetState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock store instance methods
    mockGetState.mockReturnValue({
      feeds: mockFeeds,
      feedItems: mockItems,
      setFeeds: mockSetFeeds,
      setFeedItems: mockSetFeedItems
    });
    
    // Mock static getState
    (useFeedStore as any).getState = mockGetState;
    
    // Mock hook return value
    (useFeedStore as unknown as jest.Mock).mockReturnValue({
      feeds: mockFeeds
    });

    (apiService.refreshFeeds as jest.Mock).mockResolvedValue({
      feeds: mockFeeds,
      items: mockItems
    });
    
    (apiService.fetchFeeds as jest.Mock).mockResolvedValue({
      feeds: mockFeeds,
      items: mockItems
    });
  });

  describe('Basic Functionality', () => {
    it('should fetch feeds when feeds exist in store', async () => {
      const { result } = renderHook(
        () => useFeedsQuery(),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiService.refreshFeeds).toHaveBeenCalledWith(['https://techblog.com/feed']);
      expect(result.current.data).toEqual({ 
        feeds: mockFeeds, 
        items: mockItems // Items should be sorted by date
      });
    });

    it('should sync data back to Zustand store on successful fetch', async () => {
      const { result } = renderHook(
        () => useFeedsQuery(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should sync after successful fetch
      await waitFor(() => {
        expect(mockSetFeeds).toHaveBeenCalledWith(mockFeeds);
        expect(mockSetFeedItems).toHaveBeenCalledWith(mockItems);
      });
    });

    it('should not fetch when no feeds exist in store', () => {
      // Mock empty store
      (useFeedStore as unknown as jest.Mock).mockReturnValue({
        feeds: []
      });
      
      mockGetState.mockReturnValue({
        feeds: [],
        feedItems: [],
        setFeeds: mockSetFeeds,
        setFeedItems: mockSetFeedItems
      });

      const { result } = renderHook(
        () => useFeedsQuery(),
        { wrapper: createWrapper() }
      );

      // Query should not be enabled
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(apiService.refreshFeeds).not.toHaveBeenCalled();
    });
    
    it('should sort items by date (newest first)', async () => {
      const unsortedItems: FeedItem[] = [
        { ...mockItems[0], id: '1', published: '2024-01-01', pubDate: '2024-01-01' },
        { ...mockItems[0], id: '2', published: '2024-01-03', pubDate: '2024-01-03' },
        { ...mockItems[0], id: '3', published: '2024-01-02', pubDate: '2024-01-02' }
      ];
      
      (apiService.refreshFeeds as jest.Mock).mockResolvedValue({
        feeds: mockFeeds,
        items: unsortedItems
      });

      const { result } = renderHook(
        () => useFeedsQuery(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Items should be sorted newest first
      expect(result.current.data?.items[0].id).toBe('2');
      expect(result.current.data?.items[1].id).toBe('3');
      expect(result.current.data?.items[2].id).toBe('1');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const error = new Error('Network error');
      (apiService.refreshFeeds as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(
        () => useFeedsQuery(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('Query Configuration', () => {
    it('should respect stale time configuration', async () => {
      const { result } = renderHook(
        () => useFeedsQuery(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Default stale time is 5 minutes
      // Data should be fresh immediately after fetch
      expect(result.current.isStale).toBe(false);
    });

    it('should enable background refetch', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(
        () => useFeedsQuery(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Initial fetch
      expect(apiService.refreshFeeds).toHaveBeenCalledTimes(1);

      // Fast-forward 30 minutes (refetch interval)
      act(() => {
        jest.advanceTimersByTime(30 * 60 * 1000);
      });

      // Should trigger background refetch
      await waitFor(() => {
        expect(apiService.refreshFeeds).toHaveBeenCalledTimes(2);
      });
      
      jest.useRealTimers();
    });
  });

});

describe('useAddFeedMutation', () => {
  const mockQueryClient = {
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useQueryClient
    jest.spyOn(require('@tanstack/react-query'), 'useQueryClient').mockReturnValue(mockQueryClient);
  });

  it('should add a feed optimistically', async () => {
    const newFeed: Feed = {
      id: '2',
      feedTitle: 'New Blog',
      feedUrl: 'https://newblog.com/feed',
      siteUrl: 'https://newblog.com',
      feedDescription: 'New blog',
      addedOn: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categories: 'news',
      items: []
    };
    
    (apiService.fetchFeeds as jest.Mock).mockResolvedValue({
      feeds: [newFeed],
      items: []
    });
    
    // Mock existing query data
    mockQueryClient.setQueryData.mockImplementation((key, updater) => {
      const oldData = { feeds: mockFeeds, items: mockItems };
      return typeof updater === 'function' ? updater(oldData) : updater;
    });

    const { result } = renderHook(
      () => useAddFeedMutation(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync('https://newblog.com/feed');
    });

    expect(apiService.fetchFeeds).toHaveBeenCalledWith(['https://newblog.com/feed']);
    expect(mockQueryClient.setQueryData).toHaveBeenCalled();
    expect(mockSetFeeds).toHaveBeenCalled();
    expect(mockSetFeedItems).toHaveBeenCalled();
  });

  it('should handle errors when adding feed', async () => {
    const error = new Error('Failed to fetch feed');
    (apiService.fetchFeeds as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => useAddFeedMutation(),
      { wrapper: createWrapper() }
    );

    await expect(
      result.current.mutateAsync('https://invalid.com/feed')
    ).rejects.toThrow('Failed to fetch feed');
  });
});

describe('useRemoveFeedMutation', () => {
  const mockQueryClient = {
    cancelQueries: jest.fn(),
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(require('@tanstack/react-query'), 'useQueryClient').mockReturnValue(mockQueryClient);
  });

  it('should remove feed optimistically', async () => {
    const feedUrlToRemove = 'https://techblog.com/feed';
    
    // Mock existing data
    mockQueryClient.getQueryData.mockReturnValue({
      feeds: mockFeeds,
      items: mockItems
    });
    
    mockQueryClient.setQueryData.mockImplementation((key, updater) => {
      const oldData = { feeds: mockFeeds, items: mockItems };
      return typeof updater === 'function' ? updater(oldData) : updater;
    });

    const { result } = renderHook(
      () => useRemoveFeedMutation(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync(feedUrlToRemove);
    });

    expect(mockQueryClient.cancelQueries).toHaveBeenCalled();
    expect(mockQueryClient.setQueryData).toHaveBeenCalled();
    expect(mockSetFeeds).toHaveBeenCalled();
    expect(mockSetFeedItems).toHaveBeenCalled();
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
  });

  it('should rollback on error', async () => {
    const feedUrlToRemove = 'https://techblog.com/feed';
    const previousData = { feeds: mockFeeds, items: mockItems };
    
    mockQueryClient.getQueryData.mockReturnValue(previousData);
    
    const { result } = renderHook(
      () => useRemoveFeedMutation(),
      { wrapper: createWrapper() }
    );

    // Simulate error scenario
    result.current.onError(new Error('Failed'), feedUrlToRemove, { previousFeeds: previousData });

    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      feedsKeys.lists(),
      previousData
    );
  });
});

describe('useRefreshFeedsMutation', () => {
  const mockQueryClient = {
    setQueryData: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(require('@tanstack/react-query'), 'useQueryClient').mockReturnValue(mockQueryClient);
  });

  it('should manually refresh all feeds', async () => {
    (apiService.refreshFeeds as jest.Mock).mockResolvedValue({
      feeds: mockFeeds,
      items: mockItems
    });

    const { result } = renderHook(
      () => useRefreshFeedsMutation(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(apiService.refreshFeeds).toHaveBeenCalledWith(['https://techblog.com/feed']);
    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      feedsKeys.lists(),
      { feeds: mockFeeds, items: mockItems }
    );
    expect(mockSetFeeds).toHaveBeenCalledWith(mockFeeds);
    expect(mockSetFeedItems).toHaveBeenCalledWith(mockItems);
  });

  it('should handle empty feeds gracefully', async () => {
    mockGetState.mockReturnValue({
      feeds: [],
      feedItems: [],
      setFeeds: mockSetFeeds,
      setFeedItems: mockSetFeedItems
    });

    const { result } = renderHook(
      () => useRefreshFeedsMutation(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      const data = await result.current.mutateAsync();
      expect(data).toEqual({ feeds: [], items: [] });
    });

    expect(apiService.refreshFeeds).not.toHaveBeenCalled();
  });
});

describe('useBatchAddFeedsMutation', () => {
  const mockQueryClient = {
    setQueryData: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(require('@tanstack/react-query'), 'useQueryClient').mockReturnValue(mockQueryClient);
  });

  it('should add multiple feeds sequentially', async () => {
    const feedUrls = [
      'https://blog1.com/feed',
      'https://blog2.com/feed',
      'https://blog3.com/feed'
    ];
    
    (apiService.fetchFeeds as jest.Mock).mockResolvedValue({
      feeds: [mockFeeds[0]],
      items: [mockItems[0]]
    });
    
    mockQueryClient.setQueryData.mockImplementation((key, updater) => {
      const oldData = { feeds: [], items: [] };
      return typeof updater === 'function' ? updater(oldData) : updater;
    });

    const { result } = renderHook(
      () => useBatchAddFeedsMutation(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      const response = await result.current.mutateAsync(feedUrls);
      
      expect(response.successfulCount).toBe(3);
      expect(response.failedCount).toBe(0);
      expect(response.failedUrls).toEqual([]);
    });

    // Should call fetchFeeds for each URL sequentially
    expect(apiService.fetchFeeds).toHaveBeenCalledTimes(3);
    expect(apiService.fetchFeeds).toHaveBeenNthCalledWith(1, ['https://blog1.com/feed']);
    expect(apiService.fetchFeeds).toHaveBeenNthCalledWith(2, ['https://blog2.com/feed']);
    expect(apiService.fetchFeeds).toHaveBeenNthCalledWith(3, ['https://blog3.com/feed']);
  });

  it('should handle partial failures', async () => {
    const feedUrls = [
      'https://blog1.com/feed',
      'https://invalid.com/feed',
      'https://blog3.com/feed'
    ];
    
    (apiService.fetchFeeds as jest.Mock)
      .mockResolvedValueOnce({ feeds: [mockFeeds[0]], items: [] })
      .mockRejectedValueOnce(new Error('Invalid feed'))
      .mockResolvedValueOnce({ feeds: [mockFeeds[0]], items: [] });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(
      () => useBatchAddFeedsMutation(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      const response = await result.current.mutateAsync(feedUrls);
      
      expect(response.successfulCount).toBe(2);
      expect(response.failedCount).toBe(1);
      expect(response.failedUrls).toEqual(['https://invalid.com/feed']);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to fetch feed https://invalid.com/feed:',
      expect.any(Error)
    );
    
    consoleSpy.mockRestore();
  });
});