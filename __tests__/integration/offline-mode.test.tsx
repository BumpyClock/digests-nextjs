import React from 'react';
import { render, screen, waitFor } from '@/test-utils/render';
import { createMockFeeds, createMockFeedItems } from '@/test-utils/factories';
import { mockLocalStorage, createMockResponse } from '@/test-utils/helpers';

// Mock components to test offline behavior
const OfflineFeedList = () => {
  const [feeds, setFeeds] = React.useState<any[]>([]);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    const loadFeeds = async () => {
      try {
        if (isOffline) {
          // Try to load from localStorage
          const cachedFeeds = localStorage.getItem('feeds');
          if (cachedFeeds) {
            setFeeds(JSON.parse(cachedFeeds));
          } else {
            setError('No cached data available');
          }
        } else {
          // Simulate API call
          const response = await fetch('/api/feeds');
          if (!response.ok) throw new Error('Failed to fetch');
          const data = await response.json();
          setFeeds(data.feeds);
          // Cache the data
          localStorage.setItem('feeds', JSON.stringify(data.feeds));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    loadFeeds();
  }, [isOffline]);

  if (error) {
    return <div role="alert">{error}</div>;
  }

  return (
    <div>
      {isOffline && (
        <div role="status" aria-live="polite">
          You are offline. Showing cached content.
        </div>
      )}
      <ul>
        {feeds.map((feed) => (
          <li key={feed.id}>{feed.title}</li>
        ))}
      </ul>
    </div>
  );
};

describe('Offline Mode', () => {
  let localStorageMock: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    localStorageMock = mockLocalStorage();
    // Reset online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows offline indicator when offline', async () => {
    // Set offline status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<OfflineFeedList />);

    expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
  });

  it('loads cached data when offline', async () => {
    const mockFeeds = createMockFeeds(3);
    
    // Pre-populate cache
    localStorageMock.store['feeds'] = JSON.stringify(mockFeeds);
    
    // Set offline status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<OfflineFeedList />);

    await waitFor(() => {
      mockFeeds.forEach(feed => {
        expect(screen.getByText(feed.feedTitle)).toBeInTheDocument();
      });
    });
  });

  it('shows error when offline and no cached data', async () => {
    // Set offline status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<OfflineFeedList />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('No cached data available');
    });
  });

  it('fetches fresh data when online', async () => {
    const mockFeeds = createMockFeeds(3);
    
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ feeds: mockFeeds }),
      }))
    );

    render(<OfflineFeedList />);

    await waitFor(() => {
      mockFeeds.forEach(feed => {
        expect(screen.getByText(feed.feedTitle)).toBeInTheDocument();
      });
    });

    // Check that data was cached
    expect(localStorageMock.mock.setItem).toHaveBeenCalledWith(
      'feeds',
      JSON.stringify(mockFeeds)
    );
  });

  it('transitions from online to offline', async () => {
    const mockFeeds = createMockFeeds(3);
    
    // Start online
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ feeds: mockFeeds }),
      }))
    );

    render(<OfflineFeedList />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText(/You are offline/i)).not.toBeInTheDocument();
    });

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    
    window.dispatchEvent(new Event('offline'));

    await waitFor(() => {
      expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
    });

    // Should still show cached data
    mockFeeds.forEach(feed => {
      expect(screen.getByText(feed.feedTitle)).toBeInTheDocument();
    });
  });

  it('transitions from offline to online', async () => {
    const cachedFeeds = createMockFeeds(2);
    const freshFeeds = createMockFeeds(3);
    
    // Start offline with cached data
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    
    localStorageMock.store['feeds'] = JSON.stringify(cachedFeeds);

    render(<OfflineFeedList />);

    await waitFor(() => {
      expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
    });

    // Mock fetch for when we go online
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ feeds: freshFeeds }),
      }))
    );

    // Simulate going online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    
    window.dispatchEvent(new Event('online'));

    await waitFor(() => {
      expect(screen.queryByText(/You are offline/i)).not.toBeInTheDocument();
    });

    // Should show fresh data
    await waitFor(() => {
      freshFeeds.forEach(feed => {
        expect(screen.getByText(feed.feedTitle)).toBeInTheDocument();
      });
    });
  });

  it('handles network errors gracefully when online', async () => {
    // Mock fetch to fail
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

    render(<OfflineFeedList />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  it('persists data across page reloads when offline', async () => {
    const mockFeeds = createMockFeeds(3);
    
    // Simulate previous session that cached data
    localStorageMock.store['feeds'] = JSON.stringify(mockFeeds);
    
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    // First render
    const { unmount } = render(<OfflineFeedList />);

    await waitFor(() => {
      mockFeeds.forEach(feed => {
        expect(screen.getByText(feed.feedTitle)).toBeInTheDocument();
      });
    });

    // Unmount (simulate page reload)
    unmount();

    // Re-render (simulate new page load)
    render(<OfflineFeedList />);

    // Should still show cached data
    await waitFor(() => {
      mockFeeds.forEach(feed => {
        expect(screen.getByText(feed.feedTitle)).toBeInTheDocument();
      });
    });
  });
});