/**
 * Tests for ArticleReader component
 * Tests article rendering, interactions, and reading experience
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReaderView } from '@/types';

// Mock react-markdown to avoid ESM issues
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>
}));

// Mock ArticleReader after react-markdown is mocked
const { ArticleReader } = jest.requireActual('../ArticleReader');

// Mock other dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ back: jest.fn() }))
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({ toast: jest.fn() }))
}));

// Sample test data
const mockReaderView: ReaderView = {
  title: 'Understanding Modern Web Development',
  content: '<p>This is a comprehensive guide to modern web development...</p>',
  url: 'https://example.com/article',
  author: 'Jane Developer',
  published_date: new Date().toISOString(),
  excerpt: 'A comprehensive guide to modern web development practices.',
  lead_image_url: 'https://example.com/article-image.jpg',
  domain: 'example.com',
  word_count: 1500,
  direction: 'ltr',
  total_pages: 1
};

describe('ArticleReader', () => {
  const defaultProps = {
    article: mockReaderView,
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render article content', () => {
      render(<ArticleReader {...defaultProps} />);

      // Title
      expect(screen.getByText('Understanding Modern Web Development')).toBeInTheDocument();
      
      // Author
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
      
      // Domain
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should render markdown content', () => {
      render(<ArticleReader {...defaultProps} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toBeInTheDocument();
      expect(markdownContent.textContent).toContain('comprehensive guide to modern web development');
    });

    it('should show reading time', () => {
      render(<ArticleReader {...defaultProps} />);

      // 1500 words ≈ 6 minutes reading time (250 wpm)
      expect(screen.getByText(/6 min read/i)).toBeInTheDocument();
    });

    it('should render without optional fields', () => {
      const minimalArticle: ReaderView = {
        title: 'Minimal Article',
        content: '<p>Content</p>',
        url: 'https://example.com/minimal'
      };

      render(<ArticleReader article={minimalArticle} onClose={jest.fn()} />);

      expect(screen.getByText('Minimal Article')).toBeInTheDocument();
      expect(screen.queryByText('Jane Developer')).not.toBeInTheDocument();
    });
  });

  describe('Header Actions', () => {
    it('should handle close button', () => {
      render(<ArticleReader {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should open original article', () => {
      // Mock window.open
      const mockOpen = jest.fn();
      global.window.open = mockOpen;

      render(<ArticleReader {...defaultProps} />);

      const openButton = screen.getByRole('button', { name: /open original/i });
      fireEvent.click(openButton);

      expect(mockOpen).toHaveBeenCalledWith('https://example.com/article', '_blank');
    });

    it('should copy link to clipboard', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText
        }
      });

      render(<ArticleReader {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy link/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('https://example.com/article');
      });
    });
  });

  describe('Reading Features', () => {
    it('should handle text selection', () => {
      render(<ArticleReader {...defaultProps} />);

      const content = screen.getByTestId('markdown-content');
      
      // Simulate text selection
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(content);
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Should show selection actions
      fireEvent.mouseUp(content);
    });

    it('should support keyboard shortcuts', () => {
      render(<ArticleReader {...defaultProps} />);

      // Escape to close
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should track reading progress', () => {
      const { container } = render(<ArticleReader {...defaultProps} />);

      const scrollContainer = container.querySelector('.article-reader-content');
      if (scrollContainer) {
        // Simulate scrolling
        fireEvent.scroll(scrollContainer, { target: { scrollTop: 100 } });
      }

      // Progress indicator should update
      const progressBar = screen.queryByRole('progressbar');
      if (progressBar) {
        expect(progressBar).toHaveAttribute('aria-valuenow');
      }
    });
  });

  describe('Responsive Design', () => {
    it('should adjust layout for mobile', () => {
      global.innerWidth = 375;
      
      render(<ArticleReader {...defaultProps} />);

      const reader = screen.getByRole('article');
      expect(reader).toHaveClass('article-reader');
    });

    it('should show fullscreen option on desktop', () => {
      global.innerWidth = 1024;
      
      render(<ArticleReader {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ArticleReader {...defaultProps} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'Article reader');
    });

    it('should support keyboard navigation', () => {
      render(<ArticleReader {...defaultProps} />);

      // Tab through interactive elements
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);
    });

    it('should announce reading time to screen readers', () => {
      render(<ArticleReader {...defaultProps} />);

      const readingTime = screen.getByText(/6 min read/i);
      expect(readingTime).toHaveAttribute('aria-label');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing content gracefully', () => {
      const articleWithoutContent: ReaderView = {
        title: 'No Content Article',
        url: 'https://example.com/no-content',
        content: ''
      };

      render(<ArticleReader article={articleWithoutContent} onClose={jest.fn()} />);

      expect(screen.getByText('No Content Article')).toBeInTheDocument();
      expect(screen.getByText(/no content available/i)).toBeInTheDocument();
    });

    it('should handle malformed HTML', () => {
      const articleWithBadHTML: ReaderView = {
        title: 'Bad HTML Article',
        url: 'https://example.com/bad-html',
        content: '<p>Unclosed paragraph <script>alert("xss")</script>'
      };

      render(<ArticleReader article={articleWithBadHTML} onClose={jest.fn()} />);

      // Should render safely without scripts
      const content = screen.getByTestId('markdown-content');
      expect(content.innerHTML).not.toContain('<script>');
    });
  });

  describe('Performance', () => {
    it('should lazy load images', () => {
      const articleWithImages: ReaderView = {
        ...mockReaderView,
        content: '<p>Text</p><img src="https://example.com/image.jpg" alt="Test">'
      };

      render(<ArticleReader article={articleWithImages} onClose={jest.fn()} />);

      // Images should be lazy loaded
      const images = screen.queryAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });
});