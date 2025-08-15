// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import "fake-indexeddb/auto";

// Mock fetch for Node.js environment
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as Response),
  );
}

// Import MSW server (comment out if not using MSW yet)
// import './test-utils/msw/server';
import React from "react";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
});

Object.defineProperty(global, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
});

// Mock ResizeObserver
class ResizeObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserver,
});

Object.defineProperty(global, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserver,
});

// Mock next/router
jest.mock("next/router", () => require("next-router-mock"));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "";
  },
  useParams() {
    return {};
  },
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement("img", { src, alt, ...props });
  },
}));

// Suppress console errors during tests (optional - remove if you want to see errors)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock environment variables if needed
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000";

// Mock feature flags globally for all tests
jest.mock("@/config/feature-flags", () => ({
  FEATURES: {
    USE_REACT_QUERY_FEEDS: true,
    USE_REACT_QUERY_AUTH: true,
    ENABLE_OFFLINE_SUPPORT: false,
    ENABLE_BACKGROUND_SYNC: false,
    DEBUG_REACT_QUERY: true,
  },
  isFeatureEnabled: jest.fn((flag) => {
    const flags = {
      USE_REACT_QUERY_FEEDS: true,
      USE_REACT_QUERY_AUTH: true,
      ENABLE_OFFLINE_SUPPORT: false,
      ENABLE_BACKGROUND_SYNC: false,
      DEBUG_REACT_QUERY: true,
    };
    return (flags as any)[flag] ?? false;
  }),
  getEnabledFeatures: jest.fn(() => [
    "USE_REACT_QUERY_FEEDS",
    "USE_REACT_QUERY_AUTH",
    "DEBUG_REACT_QUERY",
  ]),
}));

// Also mock the lib/feature-flags for backward compatibility
jest.mock("@/lib/feature-flags", () => ({
  FEATURES: {
    USE_REACT_QUERY_FEEDS: true,
    USE_REACT_QUERY_AUTH: true,
    ENABLE_OFFLINE_SUPPORT: false,
    ENABLE_BACKGROUND_SYNC: false,
    DEBUG_REACT_QUERY: true,
  },
  isFeatureEnabled: jest.fn((flag) => {
    const flags = {
      USE_REACT_QUERY_FEEDS: true,
      USE_REACT_QUERY_AUTH: true,
      ENABLE_OFFLINE_SUPPORT: false,
      ENABLE_BACKGROUND_SYNC: false,
      DEBUG_REACT_QUERY: true,
    };
    return (flags as any)[flag] ?? false;
  }),
  getEnabledFeatures: jest.fn(() => [
    "USE_REACT_QUERY_FEEDS",
    "USE_REACT_QUERY_AUTH",
    "DEBUG_REACT_QUERY",
  ]),
}));

// Add structuredClone polyfill for Node.js < 17
if (!global.structuredClone) {
  global.structuredClone = (obj: any) => {
    if (typeof obj !== "object" || obj === null) return obj;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  };
}

// Global test timeout
jest.setTimeout(30000);

// Mock react-markdown and related packages to avoid ESM issues
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) =>
    React.createElement("div", { "data-testid": "markdown" }, children),
}));

// Mock masonic library for tests (fixes FeedGrid tests)
jest.mock("masonic", () => ({
  Masonry: ({
    items,
    render,
    itemKey,
  }: {
    items: any[];
    render: (props: { data: any }) => React.ReactNode;
    itemKey?: (item: any, index: number) => string;
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": "masonry",
        role: "main",
        className: "feed-grid",
        style: { display: "grid" },
      },
      items?.map((item, index) =>
        React.createElement(
          "div",
          {
            key: itemKey ? itemKey(item, index) : item.id || index,
            role: "article",
            tabIndex: 0,
            "aria-label": `Article: ${item.title || "Untitled"}`,
          },
          render({ data: item }),
        ),
      ),
    ),
  usePositioner: () => ({
    width: 300,
    columnCount: 3,
  }),
  useContainerPosition: () => ({ width: 900, height: 600 }),
  useScroller: () => ({ scrollTop: 0, isScrolling: false }),
}));
