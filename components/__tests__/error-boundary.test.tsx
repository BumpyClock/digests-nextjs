/**
 * Tests for ErrorBoundary component
 * Tests error handling and fallback UI
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Logger } from '@/utils/logger';

// Mock the logger
jest.mock('@/utils/logger', () => ({
  Logger: {
    error: jest.fn()
  }
}));

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Component that throws during render
const ThrowOnRender: React.FC = () => {
  throw new Error('Render error');
};

// Component that throws async error
const ThrowAsyncError: React.FC = () => {
  React.useEffect(() => {
    throw new Error('Async error');
  }, []);
  return <div>Loading...</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('Error Handling', () => {
    it('should catch and display errors', () => {
      render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>
      );

      // Should show error UI
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/render error/i)).toBeInTheDocument();
    });

    it('should log errors', () => {
      render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>
      );

      // Should log the error
      expect(Logger.error).toHaveBeenCalledWith(
        '[ErrorBoundary] Error caught:',
        expect.objectContaining({
          message: 'Render error'
        })
      );
    });

    it('should handle errors with custom fallback', () => {
      const CustomFallback = ({ error }: { error: Error }) => (
        <div data-testid="custom-fallback">
          Custom error: {error.message}
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowOnRender />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error: Render error')).toBeInTheDocument();
    });

    it('should reset error state', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Click reset button
      const resetButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(resetButton);

      // Rerender with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should show normal content
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Error Types', () => {
    it('should handle synchronous errors', () => {
      render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should not catch async errors in useEffect', () => {
      // Note: Error boundaries don't catch errors in event handlers,
      // async code, or during SSR
      render(
        <ErrorBoundary>
          <ThrowAsyncError />
        </ErrorBoundary>
      );

      // Component should render initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      // Error boundary won't catch the async error
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should handle errors in child components', () => {
      const Parent = () => (
        <div>
          <h1>Parent Component</h1>
          <ThrowOnRender />
        </div>
      );

      render(
        <ErrorBoundary>
          <Parent />
        </ErrorBoundary>
      );

      // Should show error UI instead of parent
      expect(screen.queryByText('Parent Component')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Production vs Development', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show detailed error in development', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>
      );

      // Should show error message and stack trace
      expect(screen.getByText(/render error/i)).toBeInTheDocument();
      const errorDetails = screen.getByRole('alert');
      expect(errorDetails.textContent).toContain('Error details');
    });

    it('should show generic error in production', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>
      );

      // Should show generic message without details
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.queryByText(/render error/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry with onReset callback', () => {
      const onReset = jest.fn();
      let shouldThrow = true;

      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Recoverable error');
        }
        return <div>Success!</div>;
      };

      render(
        <ErrorBoundary onReset={onReset}>
          <TestComponent />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click reset
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Callback should be called
      expect(onReset).toHaveBeenCalled();
    });

    it('should clear error info on successful reset', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(Logger.error).toHaveBeenCalledTimes(1);

      // Reset
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Rerender without error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should clear error state
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Nested Error Boundaries', () => {
    it('should handle errors at the nearest boundary', () => {
      const InnerBoundary = ({ children }: { children: React.ReactNode }) => (
        <ErrorBoundary fallback={({ error }) => <div>Inner error: {error.message}</div>}>
          {children}
        </ErrorBoundary>
      );

      render(
        <ErrorBoundary fallback={({ error }) => <div>Outer error: {error.message}</div>}>
          <div>
            <h1>App Header</h1>
            <InnerBoundary>
              <ThrowOnRender />
            </InnerBoundary>
          </div>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText('Inner error: Render error')).toBeInTheDocument();
      expect(screen.queryByText(/outer error/i)).not.toBeInTheDocument();
      // App header should still be visible
      expect(screen.getByText('App Header')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have accessible reset button', () => {
      render(
        <ErrorBoundary>
          <ThrowOnRender />
        </ErrorBoundary>
      );

      const resetButton = screen.getByRole('button', { name: /try again/i });
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).toHaveAttribute('type', 'button');
    });
  });
});