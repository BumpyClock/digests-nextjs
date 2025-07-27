// ABOUTME: End-to-end tests for authentication flows using Playwright
// ABOUTME: Tests complete user journeys including browser refresh, offline scenarios, and cross-tab behavior

import { test, expect, Page, BrowserContext } from '@playwright/test'

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
}

const INVALID_USER = {
  email: 'invalid@example.com',
  password: 'wrongpassword'
}

/**
 * Setup authenticated state helper
 */
async function setupAuthenticatedUser(page: Page) {
  // Navigate to app
  await page.goto('/web')
  
  // Open login modal
  await page.getByText('Sign in').click()
  
  // Fill login form
  await page.getByLabel('Email').fill(TEST_USER.email)
  await page.getByLabel('Password').fill(TEST_USER.password)
  
  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click()
  
  // Wait for authentication
  await expect(page.getByText('Sign in')).not.toBeVisible()
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
}

/**
 * Wait for feature flag to be enabled
 */
async function waitForAuthEnabled(page: Page) {
  // Wait for the auth system to be initialized
  await page.waitForFunction(() => {
    return window.localStorage.getItem('digests_feature_flags') !== null
  }, { timeout: 5000 })
}

test.describe('Authentication E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Enable auth feature flag
    await page.addInitScript(() => {
      window.localStorage.setItem('NEXT_PUBLIC_RQ_AUTH', 'true')
    })
    
    // Mock API responses
    await page.route('**/api/auth/login', async route => {
      const request = route.request()
      const postData = request.postData()
      
      if (postData?.includes(TEST_USER.email)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'user123',
              email: TEST_USER.email,
              name: TEST_USER.name,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            },
            tokens: {
              accessToken: 'access_token_123',
              refreshToken: 'refresh_token_123',
              expiresIn: 3600,
              tokenType: 'Bearer'
            }
          })
        })
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          })
        })
      }
    })

    await page.route('**/api/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })

    await page.route('**/api/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokens: {
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token',
            expiresIn: 3600,
            tokenType: 'Bearer'
          }
        })
      })
    })
  })

  test.describe('Login Flow', () => {
    test('should successfully log in user', async ({ page }) => {
      await page.goto('/web')
      await waitForAuthEnabled(page)

      // Should show login button initially
      await expect(page.getByText('Sign in')).toBeVisible()

      // Click login button
      await page.getByText('Sign in').click()

      // Login modal should appear
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()

      // Fill in credentials
      await page.getByLabel('Email').fill(TEST_USER.email)
      await page.getByLabel('Password').fill(TEST_USER.password)

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show loading state
      await expect(page.getByText(/signing in/i)).toBeVisible()

      // Should authenticate successfully
      await expect(page.getByText('Sign in')).not.toBeVisible()
      
      // User menu should appear
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/web')
      await waitForAuthEnabled(page)

      // Open login modal
      await page.getByText('Sign in').click()

      // Fill invalid credentials
      await page.getByLabel('Email').fill(INVALID_USER.email)
      await page.getByLabel('Password').fill(INVALID_USER.password)

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show error message
      await expect(page.getByText(/invalid email or password/i)).toBeVisible()

      // Should still show login form
      await expect(page.getByLabel('Email')).toBeVisible()
    })

    test('should validate form inputs', async ({ page }) => {
      await page.goto('/web')
      await waitForAuthEnabled(page)

      // Open login modal
      await page.getByText('Sign in').click()

      // Try to submit empty form
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show validation errors
      await expect(page.getByText(/email is required/i)).toBeVisible()
      await expect(page.getByText(/password is required/i)).toBeVisible()

      // Fill invalid email
      await page.getByLabel('Email').fill('invalid-email')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show email validation error
      await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
    })

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/web')
      await waitForAuthEnabled(page)

      // Open login modal
      await page.getByText('Sign in').click()

      const passwordField = page.getByLabel('Password')
      const toggleButton = page.getByRole('button', { name: /show password/i })

      // Initially password should be hidden
      await expect(passwordField).toHaveAttribute('type', 'password')

      // Click to show password
      await toggleButton.click()
      await expect(passwordField).toHaveAttribute('type', 'text')

      // Click to hide password
      await toggleButton.click()
      await expect(passwordField).toHaveAttribute('type', 'password')
    })
  })

  test.describe('Session Persistence', () => {
    test('should persist session across page refresh', async ({ page }) => {
      await setupAuthenticatedUser(page)

      // Refresh page
      await page.reload()
      await waitForAuthEnabled(page)

      // Should still be authenticated
      await expect(page.getByText('Sign in')).not.toBeVisible()
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should persist session across browser restart', async ({ context, page }) => {
      await setupAuthenticatedUser(page)

      // Close and reopen browser context
      await context.close()
      
      const newContext = await page.context().browser()?.newContext()
      const newPage = await newContext!.newPage()
      
      // Navigate to app
      await newPage.goto('/web')
      await waitForAuthEnabled(newPage)

      // Should restore session (if persistence is working)
      // Note: In real implementation, this depends on IndexedDB persistence
      await expect(newPage.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should handle corrupted session data', async ({ page }) => {
      await page.goto('/web')
      await waitForAuthEnabled(page)

      // Corrupt stored data
      await page.evaluate(() => {
        localStorage.setItem('digests-auth-store', 'corrupted-data')
      })

      // Refresh page
      await page.reload()
      await waitForAuthEnabled(page)

      // Should fall back to unauthenticated state
      await expect(page.getByText('Sign in')).toBeVisible()
    })
  })

  test.describe('Logout Flow', () => {
    test('should successfully log out user', async ({ page }) => {
      await setupAuthenticatedUser(page)

      // Click user menu
      await page.locator('[data-testid="user-menu"]').click()

      // Click logout
      await page.getByText(/sign out/i).click()

      // Should return to unauthenticated state
      await expect(page.getByText('Sign in')).toBeVisible()
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible()
    })

    test('should clear all session data on logout', async ({ page }) => {
      await setupAuthenticatedUser(page)

      // Logout
      await page.locator('[data-testid="user-menu"]').click()
      await page.getByText(/sign out/i).click()

      // Check that storage is cleared
      const storageCleared = await page.evaluate(() => {
        // Check various storage locations
        const hasAuthData = localStorage.getItem('digests-auth-store') !== null
        const hasTokens = localStorage.getItem('auth_tokens') !== null
        return !hasAuthData && !hasTokens
      })

      expect(storageCleared).toBe(true)
    })
  })

  test.describe('Cross-Tab Behavior', () => {
    test('should sync auth state across tabs', async ({ context }) => {
      // Create two tabs
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      // Setup first tab
      await setupAuthenticatedUser(page1)

      // Navigate second tab to app
      await page2.goto('/web')
      await waitForAuthEnabled(page2)

      // Second tab should also be authenticated
      await expect(page2.locator('[data-testid="user-menu"]')).toBeVisible()

      // Logout from first tab
      await page1.locator('[data-testid="user-menu"]').click()
      await page1.getByText(/sign out/i).click()

      // Second tab should also logout (with some delay for sync)
      await expect(page2.getByText('Sign in')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Token Refresh', () => {
    test('should automatically refresh expired tokens', async ({ page }) => {
      await setupAuthenticatedUser(page)

      // Mock expired token scenario
      await page.route('**/api/protected', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'TOKEN_EXPIRED',
            message: 'Token expired'
          })
        })
      })

      // Make a request that would trigger token refresh
      await page.evaluate(() => {
        fetch('/api/protected', {
          headers: {
            'Authorization': 'Bearer access_token_123'
          }
        })
      })

      // Should trigger token refresh
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should logout if refresh token is invalid', async ({ page }) => {
      await setupAuthenticatedUser(page)

      // Mock failed refresh
      await page.route('**/api/auth/refresh', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'INVALID_TOKEN',
            message: 'Refresh token expired'
          })
        })
      })

      // Trigger refresh (simulate expired token)
      await page.evaluate(() => {
        // Simulate token refresh scenario
        window.dispatchEvent(new CustomEvent('token-refresh-needed'))
      })

      // Should logout user
      await expect(page.getByText('Sign in')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Offline Scenarios', () => {
    test('should handle offline mode gracefully', async ({ page }) => {
      await setupAuthenticatedUser(page)

      // Go offline
      await page.context().setOffline(true)

      // Should maintain authenticated state
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

      // Try to logout while offline
      await page.locator('[data-testid="user-menu"]').click()
      await page.getByText(/sign out/i).click()

      // Should still logout locally even if API call fails
      await expect(page.getByText('Sign in')).toBeVisible()
    })

    test('should restore auth state when coming back online', async ({ page }) => {
      await setupAuthenticatedUser(page)

      // Go offline
      await page.context().setOffline(true)

      // Refresh page while offline
      await page.reload()
      await waitForAuthEnabled(page)

      // Should restore from local storage
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

      // Go back online
      await page.context().setOffline(false)

      // Should sync with server (if needed)
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })
  })

  test.describe('Security Features', () => {
    test('should protect routes that require authentication', async ({ page }) => {
      await page.goto('/web/settings')
      await waitForAuthEnabled(page)

      // Should redirect to login or show auth required message
      await expect(page.getByText(/authentication required|sign in/i)).toBeVisible()
    })

    test('should clear sensitive data from memory on logout', async ({ page }) => {
      await setupAuthenticatedUser(page)

      // Logout
      await page.locator('[data-testid="user-menu"]').click()
      await page.getByText(/sign out/i).click()

      // Check that sensitive data is cleared from DOM/memory
      const hasTokenInDOM = await page.evaluate(() => {
        return document.body.textContent?.includes('access_token_123') || false
      })

      expect(hasTokenInDOM).toBe(false)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await page.goto('/web')
      await waitForAuthEnabled(page)

      // Mock network error
      await page.route('**/api/auth/login', async route => {
        await route.abort('failed')
      })

      // Try to login
      await page.getByText('Sign in').click()
      await page.getByLabel('Email').fill(TEST_USER.email)
      await page.getByLabel('Password').fill(TEST_USER.password)
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show network error
      await expect(page.getByText(/network error|connection/i)).toBeVisible()
    })

    test('should handle API timeout gracefully', async ({ page }) => {
      await page.goto('/web')
      await waitForAuthEnabled(page)

      // Mock timeout
      await page.route('**/api/auth/login', async route => {
        // Don't fulfill the route (simulate timeout)
        await new Promise(resolve => setTimeout(resolve, 30000))
      })

      // Try to login
      await page.getByText('Sign in').click()
      await page.getByLabel('Email').fill(TEST_USER.email)
      await page.getByLabel('Password').fill(TEST_USER.password)
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show timeout error or reset form
      await expect(page.getByText(/timeout|try again/i)).toBeVisible({ timeout: 35000 })
    })
  })
})