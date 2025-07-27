/**
 * Tests for useFeedStore
 * Tests Zustand store state management and actions
 */

import { act, renderHook } from '@testing-library/react';
import { useFeedStore } from '../useFeedStore';
import { Feed, FeedItem } from '@/types';

// Mock data
const mockFeeds: Feed[] = [
  {
    id: '1',
    title: 'Tech Blog',
    url: 'https://techblog.com/feed',
    site_url: 'https://techblog.com',
    description: 'Tech news',
    last_fetched: new Date().toISOString(),
    category: 'tech',
    added_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Design Blog',
    url: 'https://designblog.com/feed',
    site_url: 'https://designblog.com',
    description: 'Design tips',
    last_fetched: new Date().toISOString(),
    category: 'design',
    added_at: new Date().toISOString()
  }
];

const mockItems: FeedItem[] = [
  {
    id: '1',
    feed_id: '1',
    title: 'React Best Practices',
    url: 'https://techblog.com/react',
    content_html: '<p>React tips</p>',
    published_at: new Date().toISOString(),
    author: 'Tech Author'
  },
  {
    id: '2',
    feed_id: '2',
    title: 'Color Theory',
    url: 'https://designblog.com/colors',
    content_html: '<p>Color guide</p>',
    published_at: new Date().toISOString(),
    author: 'Design Author'
  }
];

describe('useFeedStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useFeedStore.setState({
      feeds: [],
      items: [],
      selectedFeedId: null,
      isLoading: false,
      error: null
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useFeedStore());

      expect(result.current.feeds).toEqual([]);
      expect(result.current.items).toEqual([]);
      expect(result.current.selectedFeedId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Feed Management', () => {
    it('should set feeds', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setFeeds(mockFeeds);
      });

      expect(result.current.feeds).toEqual(mockFeeds);
    });

    it('should add a feed', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setFeeds([mockFeeds[0]]);
        result.current.addFeed(mockFeeds[1]);
      });

      expect(result.current.feeds).toHaveLength(2);
      expect(result.current.feeds[1]).toEqual(mockFeeds[1]);
    });

    it('should remove a feed', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setFeeds(mockFeeds);
        result.current.removeFeed('1');
      });

      expect(result.current.feeds).toHaveLength(1);
      expect(result.current.feeds[0].id).toBe('2');
    });

    it('should remove associated items when removing feed', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setFeeds(mockFeeds);
        result.current.setItems(mockItems);
        result.current.removeFeed('1');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].feed_id).toBe('2');
    });

    it('should update a feed', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setFeeds(mockFeeds);
        result.current.updateFeed('1', { title: 'Updated Tech Blog' });
      });

      expect(result.current.feeds[0].title).toBe('Updated Tech Blog');
      expect(result.current.feeds[0].id).toBe('1');
    });
  });

  describe('Item Management', () => {
    it('should set items', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setItems(mockItems);
      });

      expect(result.current.items).toEqual(mockItems);
    });

    it('should add items', () => {
      const { result } = renderHook(() => useFeedStore());

      const newItem: FeedItem = {
        id: '3',
        feed_id: '1',
        title: 'New Article',
        url: 'https://techblog.com/new',
        content_html: '<p>New content</p>',
        published_at: new Date().toISOString()
      };

      act(() => {
        result.current.setItems(mockItems);
        result.current.addItems([newItem]);
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[2]).toEqual(newItem);
    });

    it('should prevent duplicate items', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setItems(mockItems);
        result.current.addItems([mockItems[0]]);
      });

      expect(result.current.items).toHaveLength(2);
    });

    it('should mark item as read', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setItems(mockItems);
        result.current.markAsRead('1');
      });

      expect(result.current.items[0].read).toBe(true);
      expect(result.current.items[1].read).toBeUndefined();
    });

    it('should mark all items as read', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setItems(mockItems);
        result.current.markAllAsRead();
      });

      result.current.items.forEach(item => {
        expect(item.read).toBe(true);
      });
    });

    it('should mark feed items as read', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setItems(mockItems);
        result.current.markFeedAsRead('1');
      });

      expect(result.current.items[0].read).toBe(true);
      expect(result.current.items[1].read).toBeUndefined();
    });
  });

  describe('Selection', () => {
    it('should set selected feed', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setSelectedFeedId('1');
      });

      expect(result.current.selectedFeedId).toBe('1');
    });

    it('should clear selected feed', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setSelectedFeedId('1');
        result.current.setSelectedFeedId(null);
      });

      expect(result.current.selectedFeedId).toBeNull();
    });

    it('should clear selection when feed is removed', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setFeeds(mockFeeds);
        result.current.setSelectedFeedId('1');
        result.current.removeFeed('1');
      });

      expect(result.current.selectedFeedId).toBeNull();
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setError('Network error');
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setError('Error');
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Computed Values', () => {
    it('should compute unread count', () => {
      const { result } = renderHook(() => useFeedStore());

      const itemsWithReadStatus = [
        { ...mockItems[0], read: true },
        { ...mockItems[1], read: false }
      ];

      act(() => {
        result.current.setItems(itemsWithReadStatus);
      });

      expect(result.current.getUnreadCount()).toBe(1);
    });

    it('should compute unread count by feed', () => {
      const { result } = renderHook(() => useFeedStore());

      const items = [
        { ...mockItems[0], read: false },
        { ...mockItems[1], read: false },
        { 
          id: '3',
          feed_id: '1',
          title: 'Another Tech Article',
          url: 'https://techblog.com/another',
          content_html: '<p>Content</p>',
          published_at: new Date().toISOString(),
          read: true
        }
      ];

      act(() => {
        result.current.setItems(items);
      });

      expect(result.current.getUnreadCountByFeed('1')).toBe(1);
      expect(result.current.getUnreadCountByFeed('2')).toBe(1);
    });

    it('should get filtered items', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setItems(mockItems);
        result.current.setSelectedFeedId('1');
      });

      const filteredItems = result.current.getFilteredItems();
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].feed_id).toBe('1');
    });

    it('should return all items when no feed selected', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setItems(mockItems);
      });

      const filteredItems = result.current.getFilteredItems();
      expect(filteredItems).toHaveLength(2);
    });
  });

  describe('Persistence', () => {
    it('should persist state across renders', () => {
      const { result, rerender } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setFeeds(mockFeeds);
        result.current.setItems(mockItems);
      });

      rerender();

      expect(result.current.feeds).toEqual(mockFeeds);
      expect(result.current.items).toEqual(mockItems);
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch updates efficiently', () => {
      const { result } = renderHook(() => useFeedStore());

      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        feed_id: '1',
        title: `Article ${i}`,
        url: `https://example.com/article-${i}`,
        content_html: `<p>Content ${i}</p>`,
        published_at: new Date().toISOString()
      }));

      act(() => {
        result.current.setItems(manyItems);
        result.current.markAllAsRead();
      });

      result.current.items.forEach(item => {
        expect(item.read).toBe(true);
      });
    });
  });

  describe('Search and Filter', () => {
    it('should search items by title', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setItems(mockItems);
      });

      const searchResults = result.current.searchItems('React');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('React Best Practices');
    });

    it('should search case-insensitively', () => {
      const { result } = renderHook(() => useFeedStore());

      act(() => {
        result.current.setItems(mockItems);
      });

      const searchResults = result.current.searchItems('REACT');
      expect(searchResults).toHaveLength(1);
    });

    it('should filter by date range', () => {
      const { result } = renderHook(() => useFeedStore());

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const itemsWithDates = [
        { ...mockItems[0], published_at: new Date().toISOString() },
        { ...mockItems[1], published_at: yesterday.toISOString() }
      ];

      act(() => {
        result.current.setItems(itemsWithDates);
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayItems = result.current.getItemsByDateRange(today, new Date());
      expect(todayItems).toHaveLength(1);
    });
  });
});