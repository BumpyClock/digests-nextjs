import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { FeedList } from '../FeedList';
import { createMockFeedItems } from '@/test-utils/factories';
import { createUser } from '@/test-utils/helpers';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Mock the hooks
jest.mock('@/hooks/useFeedSelectors', () => ({
  useIsItemRead: jest.fn(() => false),
}));

// Mock the ScrollArea component from Radix UI
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: any) => (
    <div data-testid="scroll-area" {...props}>{children}</div>
  ),
}));

describe('FeedList', () => {
  const defaultProps = {
    items: [],
    isLoading: false,
    onItemSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no items are provided', () => {
    render(<FeedList {...defaultProps} />);
    
    const emptyState = screen.getByText(/No articles found/i);
    expect(emptyState).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<FeedList {...defaultProps} isLoading={true} />);
    
    // Should show multiple skeleton items
    const skeletons = screen.getAllByTestId(/skeleton/i);
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders feed items correctly', () => {
    const mockItems = createMockFeedItems(3);
    render(<FeedList {...defaultProps} items={mockItems} />);
    
    // Check that all items are rendered
    mockItems.forEach(item => {
      expect(screen.getByText(item.title)).toBeInTheDocument();
      if (item.description) {
        expect(screen.getByText(item.description)).toBeInTheDocument();
      }
    });
  });

  it('displays relative time for published date', () => {
    const mockItems = createMockFeedItems(1, 'feed-1', {
      published: new Date().toISOString(),
    });
    
    render(<FeedList {...defaultProps} items={mockItems} />);
    
    // Should show "a few seconds ago" or similar
    const dateElement = screen.getByText(/ago|now/i);
    expect(dateElement).toBeInTheDocument();
  });

  it('handles item selection correctly', async () => {
    const user = createUser();
    const mockItems = createMockFeedItems(3);
    const onItemSelect = jest.fn();
    
    render(
      <FeedList 
        {...defaultProps} 
        items={mockItems} 
        onItemSelect={onItemSelect}
      />
    );
    
    // Click on the first item
    const firstItem = screen.getByText(mockItems[0].title);
    await user.click(firstItem);
    
    expect(onItemSelect).toHaveBeenCalledWith(mockItems[0], expect.any(Number));
  });

  it('highlights selected item', () => {
    const mockItems = createMockFeedItems(3);
    const selectedItem = mockItems[1];
    
    render(
      <FeedList 
        {...defaultProps} 
        items={mockItems}
        selectedItem={selectedItem}
      />
    );
    
    // Check that the selected item has the selected styling
    const selectedElement = screen.getByText(selectedItem.title).closest('div');
    expect(selectedElement).toHaveClass('bg-primary/10');
    expect(selectedElement).toHaveClass('border-l-primary');
  });

  it('displays thumbnail images when available', () => {
    const mockItems = createMockFeedItems(1, 'feed-1', {
      thumbnail: 'https://example.com/image.jpg',
    });
    
    render(<FeedList {...defaultProps} items={mockItems} />);
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', expect.stringContaining('example.com'));
  });

  it('handles items without thumbnails gracefully', () => {
    const mockItems = createMockFeedItems(1, 'feed-1', {
      thumbnail: undefined,
    });
    
    render(<FeedList {...defaultProps} items={mockItems} />);
    
    // Should not render any images
    const images = screen.queryAllByRole('img');
    expect(images).toHaveLength(0);
  });

  it('preserves scroll position when savedScrollPosition is provided', async () => {
    const mockItems = createMockFeedItems(10);
    const savedScrollPosition = 500;
    
    const { rerender } = render(
      <FeedList 
        {...defaultProps} 
        items={mockItems}
        savedScrollPosition={savedScrollPosition}
      />
    );
    
    // Wait for effect to run
    await waitFor(() => {
      const scrollArea = screen.getByTestId('scroll-area');
      expect(scrollArea.scrollTop).toBe(savedScrollPosition);
    });
  });

  it('displays starred items with heart icon', () => {
    const mockItems = createMockFeedItems(1, 'feed-1', {
      favorite: true,
    });
    
    render(<FeedList {...defaultProps} items={mockItems} />);
    
    // Look for the heart icon
    const heartIcon = screen.getByTestId('heart-icon');
    expect(heartIcon).toBeInTheDocument();
  });

  it('shows unread indicator for unread items', () => {
    const { useIsItemRead } = require('@/hooks/useFeedSelectors');
    useIsItemRead.mockReturnValue(false);
    
    const mockItems = createMockFeedItems(1);
    
    render(<FeedList {...defaultProps} items={mockItems} />);
    
    // Check for unread styling
    const itemElement = screen.getByText(mockItems[0].title).closest('div');
    expect(itemElement).toHaveClass('font-semibold');
  });

  it('does not show unread indicator for read items', () => {
    const { useIsItemRead } = require('@/hooks/useFeedSelectors');
    useIsItemRead.mockReturnValue(true);
    
    const mockItems = createMockFeedItems(1);
    
    render(<FeedList {...defaultProps} items={mockItems} />);
    
    // Check that item doesn't have unread styling
    const itemElement = screen.getByText(mockItems[0].title).closest('div');
    expect(itemElement).not.toHaveClass('font-semibold');
  });

  it('handles invalid image URLs gracefully', () => {
    const mockItems = createMockFeedItems(1, 'feed-1', {
      thumbnail: 'not-a-valid-url',
    });
    
    render(<FeedList {...defaultProps} items={mockItems} />);
    
    // Should not render the image
    const images = screen.queryAllByRole('img');
    expect(images).toHaveLength(0);
  });

  it('truncates long descriptions', () => {
    const longDescription = 'A'.repeat(200);
    const mockItems = createMockFeedItems(1, 'feed-1', {
      description: longDescription,
    });
    
    render(<FeedList {...defaultProps} items={mockItems} />);
    
    const description = screen.getByText(/A+/);
    expect(description).toHaveClass('line-clamp-2');
  });
});