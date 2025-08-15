/**
 * Tests for ErrorBoundary component
 * Tests error handling and fallback UI
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "@/components/error-boundary";
import { Logger } from "@/utils/logger";

// Mock the logger
jest.mock("@/utils/logger", () => ({
  Logger: {
    error: jest.fn(),
  },
}));

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

// Component that throws on render
const ThrowOnRender: React.FC = () => {
  throw new Error("Render error");
};

// Component that throws async error - currently unused but kept for future tests
// const ThrowAsyncError: React.FC<{ error: Error }> = ({ error }) => {
//   React.useEffect(() => {
//     throw error;
//   }, [error]);
//   return <div>Component rendered</div>;
// };

describe("ErrorBoundary", () => {
  const mockLogger = Logger as jest.Mocked<typeof Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("should render error UI when child component throws", () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("should log error when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender />
      </ErrorBoundary>,
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "[ErrorBoundary] Error caught:",
      expect.any(Error),
      expect.any(Object),
    );
  });

  it("should show retry button", () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("should reset error state when retry button is clicked", () => {
    const TestComponent: React.FC<{ shouldThrow: boolean }> = ({
      shouldThrow,
    }) => {
      return <ThrowError shouldThrow={shouldThrow} />;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Error UI should be shown
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <TestComponent shouldThrow={false} />
      </ErrorBoundary>,
    );

    // Should show normal content
    expect(screen.getByText("No error")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should render custom fallback when provided", () => {
    // Define custom fallback component

    const CustomFallback = () => <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowOnRender />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
  });

  it("should call onError callback when provided", () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowOnRender />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });

  it("should not catch errors during event handlers", () => {
    const ThrowInHandler: React.FC = () => {
      const handleClick = () => {
        throw new Error("Event handler error");
      };

      return <button onClick={handleClick}>Click me</button>;
    };

    render(
      <ErrorBoundary>
        <ThrowInHandler />
      </ErrorBoundary>,
    );

    // Component should render normally
    expect(
      screen.getByRole("button", { name: /click me/i }),
    ).toBeInTheDocument();

    // Click should throw but not be caught by boundary
    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: /click me/i }));
    }).toThrow("Event handler error");
  });

  describe("Environment-specific behavior", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    });

    it("should show detailed error in development", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>,
      );

      // Should show error message and stack trace
      expect(screen.getByText(/render error/i)).toBeInTheDocument();
      const errorDetails = screen.getByRole("alert");
      expect(errorDetails.textContent).toContain("Error details");
    });

    it("should show generic error in production", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>,
      );

      // Should show generic error message
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      // Should not show stack trace details
      expect(screen.queryByText(/render error/i)).not.toBeInTheDocument();
    });
  });

  describe("Error reporting", () => {
    it("should include component stack in error info", () => {
      render(
        <ErrorBoundary>
          <div>
            <span>
              <ThrowOnRender />
            </span>
          </div>
        </ErrorBoundary>,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "[ErrorBoundary] Error caught:",
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });

    it("should handle different error types", () => {
      const CustomError = class extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      };

      const ThrowCustomError: React.FC = () => {
        throw new CustomError("Custom error message");
      };

      render(
        <ErrorBoundary>
          <ThrowCustomError />
        </ErrorBoundary>,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "[ErrorBoundary] Error caught:",
        expect.objectContaining({
          name: "CustomError",
          message: "Custom error message",
        }),
        expect.any(Object),
      );
    });

    it("should handle error in custom onError callback", () => {
      const badOnError = jest.fn(() => {
        throw new Error("OnError callback failed");
      });

      // Should not crash when onError throws
      expect(() => {
        render(
          <ErrorBoundary onError={badOnError}>
            <ThrowOnRender />
          </ErrorBoundary>,
        );
      }).not.toThrow();

      expect(badOnError).toHaveBeenCalled();
    });

    it("should preserve error context for debugging", () => {
      const contextError = ({ error }: { error: Error }) => {
        throw error;
      };

      const TestWithContext: React.FC = () => {
        const error = new Error("Context error");
        error.stack = "Custom stack trace";
        return React.createElement(contextError, { error });
      };

      render(
        <ErrorBoundary>
          <TestWithContext />
        </ErrorBoundary>,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "[ErrorBoundary] Error caught:",
        expect.objectContaining({
          message: "Context error",
          stack: "Custom stack trace",
        }),
        expect.any(Object),
      );
    });
  });

  describe("Recovery and reset behavior", () => {
    it("should maintain error state across re-renders with same error", () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();

      // Re-render with same error
      rerender(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>,
      );

      // Should still show error state
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should reset when key prop changes", () => {
      const { rerender } = render(
        <ErrorBoundary key="error-1">
          <ThrowOnRender />
        </ErrorBoundary>,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();

      // Re-render with different key
      rerender(
        <ErrorBoundary key="error-2">
          <div>Normal content</div>
        </ErrorBoundary>,
      );

      // Should show normal content
      expect(screen.getByText("Normal content")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
