// ABOUTME: End-to-end tests for complete feed management workflows
// ABOUTME: Tests user scenarios from adding feeds to reading articles with real interactions

import { test, expect } from '@playwright/test'

test.describe('Feed Management Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/parse', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feeds: [{
            type: 'feed',
            guid: 'test-feed-1',
            status: 'active',
            siteTitle: 'Test Tech Blog',
            feedTitle: 'Test Tech Blog RSS',
            feedUrl: 'https://techblog.example.com/feed.xml',
            description: 'Latest tech articles and tutorials',
            link: 'https://techblog.example.com',
            lastUpdated: new Date().toISOString(),
            lastRefreshed: new Date().toISOString(),
            published: new Date().toISOString(),
            author: 'Tech Team',
            language: 'en',
            favicon: 'https://techblog.example.com/favicon.ico',
            categories: 'technology,programming',
          }],
          items: [{
            type: 'item',
            id: 'article-1',
            title: 'Getting Started with React Query',
            description: 'Learn how to manage server state effectively with React Query',
            link: 'https://techblog.example.com/react-query-guide',
            author: 'Jane Developer',
            published: new Date().toISOString(),
            content: 'React Query is a powerful library...',
            created: new Date().toISOString(),
            content_encoded: '<p>React Query is a powerful library...</p>',
            categories: ['react', 'javascript'],
            enclosures: [],
            thumbnail: 'https://techblog.example.com/images/react-query.jpg',
            thumbnailColor: '#61dafb',
            thumbnailColorComputed: true,
            siteTitle: 'Test Tech Blog',
            feedTitle: 'Test Tech Blog RSS',
            feedUrl: 'https://techblog.example.com/feed.xml',
            favicon: 'https://techblog.example.com/favicon.ico',
            favorite: false,
            pubDate: new Date().toISOString(),
          }]
        })
      })
    })

    // Navigate to the feeds page
    await page.goto('/feeds')
    
    // Enable React Query features
    await page.evaluate(() => {
      localStorage.setItem('NEXT_PUBLIC_RQ_FEEDS', 'true')
      localStorage.setItem('NEXT_PUBLIC_OFFLINE_SUPPORT', 'true')
    })
  })

  test('complete feed management lifecycle', async ({ page }) => {
    // Step 1: Add a new feed
    await test.step('Add new feed', async () => {
      // Find and click the add feed button
      await page.click('[data-testid="add-feed-button"]')
      
      // Fill in the feed URL
      await page.fill('input[name="url"]', 'https://techblog.example.com/feed.xml')
      
      // Submit the form
      await page.click('button[type="submit"]')
      
      // Wait for success message
      await expect(page.locator('text=Feed added successfully')).toBeVisible()
      
      // Verify feed appears in the list
      await expect(page.locator('[data-testid="feed-test-feed-1"]')).toBeVisible()
      await expect(page.locator('text=Test Tech Blog RSS')).toBeVisible()
    })

    // Step 2: View feed items
    await test.step('View feed items', async () => {
      // Click on the feed to view its items
      await page.click('[data-testid="feed-test-feed-1"]')
      
      // Verify items are displayed
      await expect(page.locator('text=Getting Started with React Query')).toBeVisible()
      await expect(page.locator('text=Jane Developer')).toBeVisible()
      
      // Check that article thumbnail is displayed
      await expect(page.locator('img[alt*="Getting Started with React Query"]')).toBeVisible()
    })

    // Step 3: Read an article
    await test.step('Read article', async () => {
      // Click on the article to read it
      await page.click('text=Getting Started with React Query')
      
      // Verify reader view opens
      await expect(page.locator('[data-testid="article-reader"]')).toBeVisible()
      await expect(page.locator('text=React Query is a powerful library')).toBeVisible()
      
      // Verify article is marked as read
      await expect(page.locator('[data-testid="article-1"][data-read="true"]')).toBeVisible()
    })

    // Step 4: Refresh feed
    await test.step('Refresh feed', async () => {
      // Navigate back to feed list
      await page.click('[data-testid="back-to-feeds"]')
      
      // Open feed actions menu
      await page.click('[data-testid="feed-test-feed-1"] button[aria-label="Open menu"]')
      
      // Click refresh
      await page.click('text=Refresh')
      
      // Verify refresh indicator appears
      await expect(page.locator('text=Refreshing')).toBeVisible()
      
      // Wait for refresh to complete
      await expect(page.locator('text=Refreshing')).not.toBeVisible()
    })

    // Step 5: Test offline functionality
    await test.step('Test offline functionality', async () => {
      // Simulate going offline
      await page.context().setOffline(true)
      
      // Try to add another feed
      await page.click('[data-testid="add-feed-button"]')
      await page.fill('input[name="url"]', 'https://another-blog.com/feed.xml')
      await page.click('button[type="submit"]')
      
      // Verify offline message appears
      await expect(page.locator('text=Changes will be synced when connection is restored')).toBeVisible()
      
      // Go back online
      await page.context().setOffline(false)
      
      // Verify sync occurs
      await expect(page.locator('text=Syncing...')).toBeVisible()
      await expect(page.locator('text=Up to date')).toBeVisible()
    })

    // Step 6: Delete feed
    await test.step('Delete feed', async () => {
      // Open feed actions menu
      await page.click('[data-testid="feed-test-feed-1"] button[aria-label="Open menu"]')
      
      // Click delete
      await page.click('text=Delete')
      
      // Confirm deletion in dialog
      await page.click('[data-testid="confirm-delete-button"]')
      
      // Verify feed is removed
      await expect(page.locator('[data-testid="feed-test-feed-1"]')).not.toBeVisible()
      await expect(page.locator('text=Feed removed')).toBeVisible()
    })
  })

  test('batch feed import workflow', async ({ page }) => {
    await test.step('Import multiple feeds', async () => {
      // Click add feed button
      await page.click('[data-testid="add-feed-button"]')
      
      // Switch to batch mode
      await page.click('button:text("Batch Import")')
      
      // Fill in multiple URLs
      const feedUrls = [
        'https://techblog.example.com/feed.xml',
        'https://devblog.example.com/rss.xml',
        'https://newsblog.example.com/feed.xml'
      ].join('\n')
      
      await page.fill('textarea[name="urls"]', feedUrls)
      
      // Submit batch import
      await page.click('button:text("Import Feeds")')
      
      // Verify import progress
      await expect(page.locator('text=Importing Feeds...')).toBeVisible()
      
      // Wait for completion
      await expect(page.locator('text=Successfully imported')).toBeVisible()
      
      // Verify feeds appear in list
      await expect(page.locator('[data-testid="feed-list"]')).toContainText('Test Tech Blog RSS')
    })
  })

  test('error handling workflow', async ({ page }) => {
    await test.step('Handle invalid feed URL', async () => {
      // Mock API error
      await page.route('**/api/parse', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid feed URL' })
        })
      })
      
      // Try to add invalid feed
      await page.click('[data-testid="add-feed-button"]')
      await page.fill('input[name="url"]', 'https://invalid-feed-url.com/not-a-feed')
      await page.click('button[type="submit"]')
      
      // Verify error message appears
      await expect(page.locator('text=Failed to add feed')).toBeVisible()
      await expect(page.locator('text=Invalid feed URL')).toBeVisible()
    })

    await test.step('Handle network error', async () => {
      // Mock network error
      await page.route('**/api/parse', async route => {
        await route.abort('failed')
      })
      
      // Try to refresh feeds
      await page.click('[data-testid="refresh-all-button"]')
      
      // Verify error handling
      await expect(page.locator('text=Failed to load feeds')).toBeVisible()
      await expect(page.locator('button:text("Try Again")')).toBeVisible()
    })
  })

  test('search and filter workflow', async ({ page }) => {
    // Add some feeds first
    await page.click('[data-testid="add-feed-button"]')
    await page.fill('input[name="url"]', 'https://techblog.example.com/feed.xml')
    await page.click('button[type="submit"]')
    
    await test.step('Search articles', async () => {
      // Use search functionality
      await page.fill('[data-testid="article-search"]', 'React Query')
      
      // Verify filtered results
      await expect(page.locator('text=Getting Started with React Query')).toBeVisible()
      
      // Clear search
      await page.fill('[data-testid="article-search"]', '')
      
      // Verify all articles are shown again
      await expect(page.locator('[data-testid="article-list"]')).toBeVisible()
    })

    await test.step('Filter by feed', async () => {
      // Apply feed filter
      await page.selectOption('[data-testid="feed-filter"]', 'test-feed-1')
      
      // Verify only items from selected feed are shown
      await expect(page.locator('[data-testid="article-list"] [data-feed-id="test-feed-1"]')).toBeVisible()
      
      // Reset filter
      await page.selectOption('[data-testid="feed-filter"]', 'all')
    })
  })

  test('reading preferences workflow', async ({ page }) => {
    // Add feed and navigate to article
    await page.click('[data-testid="add-feed-button"]')
    await page.fill('input[name="url"]', 'https://techblog.example.com/feed.xml')
    await page.click('button[type="submit"]')
    
    await test.step('Mark articles as read/unread', async () => {
      // Mark article as read
      await page.click('[data-testid="article-1"] [data-testid="mark-read-button"]')
      
      // Verify read status
      await expect(page.locator('[data-testid="article-1"][data-read="true"]')).toBeVisible()
      
      // Mark as unread
      await page.click('[data-testid="article-1"] [data-testid="mark-unread-button"]')
      
      // Verify unread status
      await expect(page.locator('[data-testid="article-1"][data-read="false"]')).toBeVisible()
    })

    await test.step('Add to read later', async () => {
      // Add to read later
      await page.click('[data-testid="article-1"] [data-testid="read-later-button"]')
      
      // Verify in read later list
      await page.click('[data-testid="read-later-tab"]')
      await expect(page.locator('text=Getting Started with React Query')).toBeVisible()
      
      // Remove from read later
      await page.click('[data-testid="article-1"] [data-testid="remove-read-later-button"]')
      
      // Verify removed from list
      await expect(page.locator('text=No items in read later')).toBeVisible()
    })

    await test.step('Mark all as read', async () => {
      // Go back to main feed
      await page.click('[data-testid="all-articles-tab"]')
      
      // Mark all as read
      await page.click('[data-testid="mark-all-read-button"]')
      
      // Verify all articles are marked as read
      await expect(page.locator('[data-testid="article-list"] [data-read="false"]')).toHaveCount(0)
    })
  })

  test('responsive design workflow', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await test.step('Mobile navigation', async () => {
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
      
      // Test hamburger menu
      await page.click('[data-testid="hamburger-menu"]')
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
      
      // Navigate to add feed
      await page.click('[data-testid="mobile-add-feed"]')
      await expect(page.locator('[data-testid="add-feed-form"]')).toBeVisible()
    })

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await test.step('Tablet layout', async () => {
      // Verify tablet-specific layout changes
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
    })

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    await test.step('Desktop layout', async () => {
      // Verify full desktop layout
      await expect(page.locator('[data-testid="feed-sidebar"]')).toBeVisible()
      await expect(page.locator('[data-testid="article-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="article-reader"]')).toBeVisible()
    })
  })

  test('performance and caching workflow', async ({ page }) => {
    await test.step('Test caching behavior', async () => {
      // Add feed
      await page.click('[data-testid="add-feed-button"]')
      await page.fill('input[name="url"]', 'https://techblog.example.com/feed.xml')
      await page.click('button[type="submit"]')
      
      // Navigate away and back
      await page.goto('/settings')
      await page.goto('/feeds')
      
      // Verify data loads quickly from cache
      await expect(page.locator('text=Test Tech Blog RSS')).toBeVisible({ timeout: 1000 })
    })

    await test.step('Test background refresh', async () => {
      // Wait for background refresh interval
      await page.waitForTimeout(2000)
      
      // Verify background refresh indicator
      await expect(page.locator('[data-testid="background-sync-indicator"]')).toBeVisible()
    })
  })
})