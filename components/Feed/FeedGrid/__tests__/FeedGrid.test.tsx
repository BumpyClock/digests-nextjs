/**
 * Tests for FeedGrid component
 * Tests grid layout, responsive behavior, and item rendering
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedGrid } from '../FeedGrid';
import { Feed, FeedItem } from '@/types';
import { useFeedStore } from '@/store/useFeedStore';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/store/useFeedStore');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Sample test data
const mockFeeds: Feed[] = [
  {
    id: '1',
    title: 'Tech Blog',
    url: 'https://techblog.com/feed',
    site_url: 'https://techblog.com',
    description: 'Latest tech news',
    last_fetched: new Date().toISOString(),
    category: 'tech',
    added_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Design Weekly',
    url: 'https://designweekly.com/feed',
    site_url: 'https://designweekly.com',
    description: 'Design inspiration',
    last_fetched: new Date().toISOString(),
    category: 'design',
    added_at: new Date().toISOString()
  }
];

const mockItems: FeedItem[] = [
  {
    id: '1',
    feed_id: '1',
    title: 'Understanding React 18',
    url: 'https://techblog.com/react-18',
    content_html: '<p>React 18 introduces new features...</p>',
    published_at: new Date().toISOString(),
    author: 'John Doe'
  },
  {
    id: '2',
    feed_id: '1',
    title: 'TypeScript Best Practices',
    url: 'https://techblog.com/typescript',
    content_html: '<p>Learn TypeScript best practices...</p>',
    published_at: new Date(Date.now() - 86400000).toISOString(),
    author: 'Jane Smith'
  },
  {
    id: '3',
    feed_id: '2',
    title: 'Color Theory in UI Design',
    url: 'https://designweekly.com/color-theory',
    content_html: '<p>Understanding color in design...</p>',
    published_at: new Date(Date.now() - 172800000).toISOString(),
    author: 'Design Team'
  }
];

describe('FeedGrid', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useFeedStore as jest.Mock).mockReturnValue({
      feeds: mockFeeds,
      items: mockItems,
      selectedFeedId: null,
      setSelectedFeedId: jest.fn()
    });
  });

  describe('Rendering', () => {
    it('should render feed grid with items', () => {
      render(<FeedGrid />);

      // Should render all items
      expect(screen.getByText('Understanding React 18')).toBeInTheDocument();
      expect(screen.getByText('TypeScript Best Practices')).toBeInTheDocument();
      expect(screen.getByText('Color Theory in UI Design')).toBeInTheDocument();
    });

    it('should show empty state when no items', () => {
      (useFeedStore as jest.Mock).mockReturnValue({
        feeds: [],
        items: [],
        selectedFeedId: null,
        setSelectedFeedId: jest.fn()
      });

      render(<FeedGrid />);

      expect(screen.getByText(/no feeds/i)).toBeInTheDocument();
    });

    it('should render feed metadata', () => {
      render(<FeedGrid />);

      // Should show feed titles
      expect(screen.getByText('Tech Blog')).toBeInTheDocument();
      expect(screen.getByText('Design Weekly')).toBeInTheDocument();

      // Should show authors
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(<FeedGrid />);

      // Recent items should show relative time
      expect(screen.getByText(/today/i)).toBeInTheDocument();
      expect(screen.getByText(/yesterday/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter items by selected feed', () => {
      (useFeedStore as jest.Mock).mockReturnValue({
        feeds: mockFeeds,
        items: mockItems,
        selectedFeedId: '1',
        setSelectedFeedId: jest.fn()
      });

      render(<FeedGrid />);

      // Should only show items from feed 1
      expect(screen.getByText('Understanding React 18')).toBeInTheDocument();
      expect(screen.getByText('TypeScript Best Practices')).toBeInTheDocument();
      expect(screen.queryByText('Color Theory in UI Design')).not.toBeInTheDocument();
    });

    it('should show all items when no feed selected', () => {
      render(<FeedGrid />);

      // Should show all items
      expect(screen.getAllByRole('article')).toHaveLength(3);
    });
  });

  describe('Interaction', () => {
    it('should navigate to article on click', () => {
      render(<FeedGrid />);

      const article = screen.getByText('Understanding React 18');
      fireEvent.click(article);

      expect(mockPush).toHaveBeenCalledWith('/web/article/1');
    });

    it('should handle keyboard navigation', () => {
      render(<FeedGrid />);

      const firstArticle = screen.getAllByRole('article')[0];
      
      // Tab to article
      firstArticle.focus();
      expect(document.activeElement).toBe(firstArticle);

      // Enter key should navigate
      fireEvent.keyDown(firstArticle, { key: 'Enter' });
      expect(mockPush).toHaveBeenCalled();
    });

    it('should mark items as read on interaction', async () => {
      const markAsRead = jest.fn();
      (useFeedStore as jest.Mock).mockReturnValue({
        feeds: mockFeeds,
        items: mockItems,
        selectedFeedId: null,
        setSelectedFeedId: jest.fn(),
        markAsRead
      });

      render(<FeedGrid />);

      const article = screen.getByText('Understanding React 18');
      fireEvent.click(article);

      await waitFor(() => {
        expect(markAsRead).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('Responsive Layout', () => {
    it('should adjust grid columns based on container size', () => {
      render(<FeedGrid />);

      const grid = screen.getByRole('main');
      expect(grid).toHaveClass('feed-grid');
      
      // Check CSS classes for responsive layout
      expect(grid).toHaveStyle({
        display: 'grid'
      });
    });

    it('should handle window resize', () => {
      const { container } = render(<FeedGrid />);

      // Trigger resize
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      // Grid should adjust for mobile
      const grid = container.querySelector('.feed-grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should use virtualization for large lists', () => {
      // Create many items
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        feed_id: '1',
        title: `Article ${i}`,
        url: `https://example.com/article-${i}`,
        content_html: `<p>Content ${i}</p>`,
        published_at: new Date().toISOString(),
        author: 'Author'
      }));

      (useFeedStore as jest.Mock).mockReturnValue({
        feeds: mockFeeds,
        items: manyItems,
        selectedFeedId: null,
        setSelectedFeedId: jest.fn()
      });

      render(<FeedGrid />);

      // Should not render all 100 items at once
      const visibleArticles = screen.getAllByRole('article');
      expect(visibleArticles.length).toBeLessThan(100);
    });

    it('should lazy load images', () => {
      const itemsWithImages = mockItems.map(item => ({
        ...item,
        image: `https://example.com/image-${item.id}.jpg`
      }));

      (useFeedStore as jest.Mock).mockReturnValue({
        feeds: mockFeeds,
        items: itemsWithImages,
        selectedFeedId: null,
        setSelectedFeedId: jest.fn()
      });

      render(<FeedGrid />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<FeedGrid />);

      const grid = screen.getByRole('main');
      expect(grid).toHaveAttribute('aria-label', 'Feed items grid');

      const articles = screen.getAllByRole('article');
      articles.forEach(article => {
        expect(article).toHaveAttribute('aria-label');
      });
    });

    it('should support screen reader navigation', () => {
      render(<FeedGrid />);

      // Articles should be focusable
      const articles = screen.getAllByRole('article');
      articles.forEach(article => {
        expect(article).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should announce updates', async () => {
      const { rerender } = render(<FeedGrid />);

      // Add new item
      const newItem: FeedItem = {
        id: '4',
        feed_id: '1',
        title: 'New Article',
        url: 'https://example.com/new',
        content_html: '<p>New content</p>',
        published_at: new Date().toISOString(),
        author: 'New Author'
      };

      (useFeedStore as jest.Mock).mockReturnValue({
        feeds: mockFeeds,
        items: [...mockItems, newItem],
        selectedFeedId: null,
        setSelectedFeedId: jest.fn()
      });

      rerender(<FeedGrid />);

      // Should have live region for updates
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing feed data gracefully', () => {
      const itemsWithMissingFeed = [
        {
          ...mockItems[0],
          feed_id: 'non-existent'
        }
      ];

      (useFeedStore as jest.Mock).mockReturnValue({
        feeds: mockFeeds,
        items: itemsWithMissingFeed,
        selectedFeedId: null,
        setSelectedFeedId: jest.fn()
      });

      render(<FeedGrid />);

      // Should still render the item
      expect(screen.getByText('Understanding React 18')).toBeInTheDocument();
    });

    it('should handle malformed content', () => {
      const itemsWithBadContent = [
        {
          ...mockItems[0],
          content_html: null,
          title: null
        }
      ];

      (useFeedStore as jest.Mock).mockReturnValue({
        feeds: mockFeeds,
        items: itemsWithBadContent,
        selectedFeedId: null,
        setSelectedFeedId: jest.fn()
      });

      render(<FeedGrid />);

      // Should render with fallback text
      expect(screen.getByText(/untitled/i)).toBeInTheDocument();
    });
  });
});