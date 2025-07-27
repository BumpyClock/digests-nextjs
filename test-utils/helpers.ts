import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Helper to wait for loading states to complete
export const waitForLoadingToFinish = async () => {
  await waitFor(() => {
    const loadingElements = screen.queryAllByText(/loading/i);
    const spinners = screen.queryAllByRole('progressbar');
    const skeletons = screen.queryAllByTestId(/skeleton/i);
    
    expect(loadingElements).toHaveLength(0);
    expect(spinners).toHaveLength(0);
    expect(skeletons).toHaveLength(0);
  });
};

// Helper to wait for an element to be removed
export const waitForElementToBeRemoved = async (element: HTMLElement | null) => {
  if (element) {
    await waitFor(() => {
      expect(element).not.toBeInTheDocument();
    });
  }
};

// Helper to simulate network delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to create a user event instance with proper setup
export const createUser = () => userEvent.setup();

// Helper to check if an element is visible in the viewport
export const isElementVisible = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

// Helper to mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  const localStorageMock = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    length: 0,
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
  
  Object.defineProperty(localStorageMock, 'length', {
    get: () => Object.keys(store).length,
  });
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
  
  return { store, mock: localStorageMock };
};

// Helper to mock fetch responses
export const mockFetch = (response: any, options?: { status?: number; ok?: boolean }) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: options?.ok ?? true,
      status: options?.status ?? 200,
      json: async () => response,
      text: async () => JSON.stringify(response),
      headers: new Headers(),
    } as Response)
  );
  
  return global.fetch as jest.MockedFunction<typeof fetch>;
};

// Helper to reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
};

// Helper to get all text content from an element
export const getTextContent = (element: HTMLElement): string => {
  return element.textContent?.trim() || '';
};

// Helper to check accessibility
export const checkAccessibility = async (container: HTMLElement) => {
  // Basic accessibility checks
  const images = container.querySelectorAll('img');
  images.forEach(img => {
    expect(img).toHaveAttribute('alt');
  });
  
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    expect(button).toHaveAccessibleName();
  });
  
  const links = container.querySelectorAll('a');
  links.forEach(link => {
    expect(link).toHaveAccessibleName();
  });
};

// Helper to mock API calls with MSW-like interface (for when MSW is not available)
export const mockApiCall = (url: string, response: any, options?: { method?: string; status?: number; delay?: number }) => {
  const mockFn = jest.fn(async () => {
    if (options?.delay) {
      await delay(options.delay);
    }
    return response;
  });
  
  return mockFn;
};

// Helper for debugging tests
export const debugScreen = () => {
  console.log('Current DOM:');
  screen.debug(undefined, 10000);
};

// Create mock Response object
export function createMockResponse(init: {
  ok: boolean;
  status: number;
  statusText?: string;
  json?: () => Promise<any>;
  text?: () => Promise<string>;
  headers?: Record<string, string>;
}): Response {
  const headers = new Headers(init.headers || {});
  
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.statusText || '',
    headers,
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob([]),
    formData: async () => new FormData(),
    json: init.json || (async () => ({})),
    text: init.text || (async () => ''),
    clone: function() { return this; },
  } as Response;
}