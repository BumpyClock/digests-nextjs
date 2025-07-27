import React from 'react';
import { render, screen, waitFor } from '@/test-utils/render';
import { createUser, createMockResponse } from '@/test-utils/helpers';
import { toast } from 'sonner';

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

// Component that demonstrates API error handling
const ApiErrorDemo = () => {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/feeds');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        switch (response.status) {
          case 401:
            throw new Error('You need to log in to access this content');
          case 403:
            throw new Error('You do not have permission to access this resource');
          case 404:
            throw new Error('The requested resource was not found');
          case 429:
            throw new Error('Too many requests. Please try again later');
          case 500:
            throw new Error(errorData.message || 'Server error. Please try again later');
          default:
            throw new Error(`Request failed: ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      setData(result);
      toast.success('Data loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    fetchData();
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div role="status">Loading...</div>;
  }

  if (error) {
    return (
      <div role="alert" className="error-container">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <button onClick={retry}>Retry</button>
      </div>
    );
  }

  if (data) {
    return (
      <div>
        <h2>Data Loaded</h2>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  }

  return null;
};

describe('API Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles 401 unauthorized errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid token' }),
      }))
    );

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('You need to log in to access this content');
    });

    expect(toast.error).toHaveBeenCalledWith('You need to log in to access this content');
  });

  it('handles 403 forbidden errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({}),
      }))
    );

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission to access this resource');
    });
  });

  it('handles 404 not found errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      }))
    );

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('The requested resource was not found');
    });
  });

  it('handles 429 rate limit errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({}),
      }))
    );

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Too many requests. Please try again later');
    });
  });

  it('handles 500 server errors with custom message', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Database connection failed' }),
      }))
    );

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Database connection failed');
    });
  });

  it('handles 500 server errors with default message', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Invalid JSON'); },
      }))
    );

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error. Please try again later');
    });
  });

  it('handles network errors', async () => {
    global.fetch = jest.fn(() => 
      Promise.reject(new Error('Network request failed'))
    );

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network request failed');
    });

    expect(toast.error).toHaveBeenCalledWith('Network request failed');
  });

  it('handles JSON parsing errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Invalid JSON'); },
      }))
    );

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid JSON');
    });
  });

  it('provides retry functionality', async () => {
    const user = createUser();
    let callCount = 0;
    
    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('First attempt failed'));
      }
      return Promise.resolve(createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ feeds: [] }),
      }));
    });

    render(<ApiErrorDemo />);

    // Wait for initial error
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('First attempt failed');
    });

    // Click retry button
    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    // Should show loading state
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');

    // Should eventually show success
    await waitFor(() => {
      expect(screen.getByText('Data Loaded')).toBeInTheDocument();
    });

    expect(toast.success).toHaveBeenCalledWith('Data loaded successfully');
  });

  it('handles timeout errors', async () => {
    const controller = new AbortController();
    
    global.fetch = jest.fn(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout'));
        }, 100);
      });
    });

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Request timeout');
    });
  });

  it('handles unexpected error formats', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockResponse({
        ok: false,
        status: 418,
        statusText: "I'm a teapot",
        json: async () => ({}),
      }))
    );

    render(<ApiErrorDemo />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("Request failed: I'm a teapot");
    });
  });

  it('cleans up pending requests on unmount', async () => {
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    
    global.fetch = jest.fn(() => fetchPromise as Promise<Response>);

    const { unmount } = render(<ApiErrorDemo />);

    // Unmount before fetch completes
    unmount();

    // Resolve the fetch after unmount
    resolveFetch!(createMockResponse({
      ok: true,
      status: 200,
      json: async () => ({ feeds: [] }),
    }));

    // Should not throw errors or update state
    await waitFor(() => {
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});