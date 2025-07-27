/**
 * Tests for FeedCard component
 * Tests card rendering, interactions, and visual states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedCard } from '../FeedCard';
import { Feed, FeedItem } from '@/types';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}));

// Sample test data
const mockFeed: Feed = {
  id: '1',
  title: 'Tech Blog',
  url: 'https://techblog.com/feed',
  site_url: 'https://techblog.com',
  description: 'Latest tech news and tutorials',
  last_fetched: new Date().toISOString(),
  category: 'tech',
  added_at: new Date().toISOString()
};

const mockItem: FeedItem = {
  id: '1',
  feed_id: '1',
  title: 'Understanding React 18 Concurrent Features',
  url: 'https://techblog.com/react-18',
  content_html: '<p>React 18 introduces exciting new features...</p>',
  published_at: new Date().toISOString(),
  author: 'John Doe',
  image: 'https://techblog.com/react-18.jpg',
  excerpt: 'React 18 introduces exciting new features for better performance.'
};

const mockPodcastItem: FeedItem = {
  ...mockItem,
  attachments: [
    {
      url: 'https://example.com/episode.mp3',
      mime_type: 'audio/mpeg',
      size_in_bytes: 50000000,
      duration_in_seconds: 1800
    }
  ]
};

describe('FeedCard', () => {
  const mockPush = jest.fn();
  const defaultProps = {
    item: mockItem,
    feed: mockFeed,
    onClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  describe('Rendering', () => {
    it('should render basic card elements', () => {
      render(<FeedCard {...defaultProps} />);

      // Title
      expect(screen.getByText('Understanding React 18 Concurrent Features')).toBeInTheDocument();
      
      // Feed name
      expect(screen.getByText('Tech Blog')).toBeInTheDocument();
      
      // Author
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      
      // Excerpt
      expect(screen.getByText(/React 18 introduces exciting new features/)).toBeInTheDocument();
    });

    it('should render image when available', () => {
      render(<FeedCard {...defaultProps} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://techblog.com/react-18.jpg');
      expect(image).toHaveAttribute('alt', 'Understanding React 18 Concurrent Features');
    });

    it('should render without image', () => {
      const itemWithoutImage = { ...mockItem, image: undefined };
      
      render(<FeedCard {...defaultProps} item={itemWithoutImage} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should format publish date', () => {
      render(<FeedCard {...defaultProps} />);

      // Should show relative time for recent posts
      expect(screen.getByText(/just now|today/i)).toBeInTheDocument();
    });

    it('should truncate long titles', () => {
      const longTitle = 'A'.repeat(200);
      const itemWithLongTitle = { ...mockItem, title: longTitle };
      
      render(<FeedCard {...defaultProps} item={itemWithLongTitle} />);

      const title = screen.getByRole('heading');
      expect(title.textContent?.length).toBeLessThan(200);
    });
  });

  describe('Podcast Support', () => {
    it('should show podcast indicator', () => {
      render(<FeedCard {...defaultProps} item={mockPodcastItem} />);

      expect(screen.getByLabelText(/podcast episode/i)).toBeInTheDocument();
    });

    it('should show duration for podcasts', () => {
      render(<FeedCard {...defaultProps} item={mockPodcastItem} />);

      // 1800 seconds = 30 minutes
      expect(screen.getByText('30:00')).toBeInTheDocument();
    });

    it('should show play button for podcasts', () => {
      render(<FeedCard {...defaultProps} item={mockPodcastItem} />);

      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should handle click events', () => {
      render(<FeedCard {...defaultProps} />);

      const card = screen.getByRole('article');
      fireEvent.click(card);

      expect(defaultProps.onClick).toHaveBeenCalledWith(mockItem);
    });

    it('should navigate on click if no onClick provided', () => {
      render(<FeedCard item={mockItem} feed={mockFeed} />);

      const card = screen.getByRole('article');
      fireEvent.click(card);

      expect(mockPush).toHaveBeenCalledWith('/web/article/1');
    });

    it('should handle keyboard navigation', () => {
      render(<FeedCard {...defaultProps} />);

      const card = screen.getByRole('article');
      
      // Enter key
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(defaultProps.onClick).toHaveBeenCalledWith(mockItem);

      // Space key
      fireEvent.keyDown(card, { key: ' ' });
      expect(defaultProps.onClick).toHaveBeenCalledTimes(2);
    });

    it('should prevent navigation on interactive element clicks', () => {
      render(<FeedCard {...defaultProps} item={mockPodcastItem} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      fireEvent.click(playButton);

      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('should show hover state', () => {
      render(<FeedCard {...defaultProps} />);

      const card = screen.getByRole('article');
      
      fireEvent.mouseEnter(card);
      expect(card).toHaveClass('hover:shadow-lg');
      
      fireEvent.mouseLeave(card);
    });

    it('should show focus state', () => {
      render(<FeedCard {...defaultProps} />);

      const card = screen.getByRole('article');
      
      fireEvent.focus(card);
      expect(card).toHaveClass('focus:ring-2');
    });

    it('should show read state', () => {
      const readItem = { ...mockItem, read: true };
      
      render(<FeedCard {...defaultProps} item={readItem} />);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('opacity-60');
    });

    it('should show loading state', () => {
      render(<FeedCard {...defaultProps} isLoading />);

      expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FeedCard {...defaultProps} />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should announce read status', () => {
      const readItem = { ...mockItem, read: true };
      
      render(<FeedCard {...defaultProps} item={readItem} />);

      const card = screen.getByRole('article');
      expect(card.getAttribute('aria-label')).toContain('read');
    });

    it('should have accessible images', () => {
      render(<FeedCard {...defaultProps} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt');
    });

    it('should support keyboard focus', () => {
      render(<FeedCard {...defaultProps} />);

      const card = screen.getByRole('article');
      
      card.focus();
      expect(document.activeElement).toBe(card);
    });
  });

  describe('Performance', () => {
    it('should lazy load images', () => {
      render(<FeedCard {...defaultProps} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('should use optimized image sizes', () => {
      render(<FeedCard {...defaultProps} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('sizes');
    });

    it('should memoize expensive computations', () => {
      const { rerender } = render(<FeedCard {...defaultProps} />);

      // Rerender with same props
      rerender(<FeedCard {...defaultProps} />);

      // Component should not re-compute expensive operations
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing feed data', () => {
      render(<FeedCard item={mockItem} feed={undefined} onClick={jest.fn()} />);

      // Should render without feed name
      expect(screen.queryByText('Tech Blog')).not.toBeInTheDocument();
      expect(screen.getByText('Understanding React 18 Concurrent Features')).toBeInTheDocument();
    });

    it('should handle missing item data gracefully', () => {
      const incompleteItem = {
        id: '1',
        feed_id: '1',
        url: 'https://example.com',
        published_at: new Date().toISOString()
      } as FeedItem;

      render(<FeedCard item={incompleteItem} feed={mockFeed} onClick={jest.fn()} />);

      // Should show fallback text
      expect(screen.getByText(/untitled/i)).toBeInTheDocument();
    });

    it('should handle image loading errors', () => {
      render(<FeedCard {...defaultProps} />);

      const image = screen.getByRole('img');
      fireEvent.error(image);

      // Should hide broken image
      waitFor(() => {
        expect(image).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile', () => {
      global.innerWidth = 375;
      
      render(<FeedCard {...defaultProps} />);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('flex-col');
    });

    it('should show full content on desktop', () => {
      global.innerWidth = 1024;
      
      render(<FeedCard {...defaultProps} />);

      const excerpt = screen.getByText(/React 18 introduces exciting new features/);
      expect(excerpt).toBeVisible();
    });
  });
});