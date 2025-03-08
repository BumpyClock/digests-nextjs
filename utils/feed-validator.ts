import type { Feed, Result } from '@/types'
import { Logger } from '../utils/logger'

export class FeedValidator {
  validateFeed(feed: unknown): Result<Omit<Feed, 'items'>> {
    try {
      if (!feed || typeof feed !== 'object') {
        return {
          success: false,
          error: new Error('Feed must be an object')
        }
      }

      const requiredFields = [
        'type',
        'guid',
        'status',
        'siteTitle',
        'feedTitle',
        'feedUrl',
        'description',
        'link',
        'lastUpdated',
        'lastRefreshed',
        'published',
        'language',
        'favicon',
        'categories'
      ]

      for (const field of requiredFields) {
        if (!(field in feed)) {
          return {
            success: false,
            error: new Error(`Missing required field: ${field}`)
          }
        }
      }

      return {
        success: true,
        data: feed as Omit<Feed, 'items'>
      }
    } catch (error) {
      Logger.error('Feed validation error:', error as Error)
      return {
        success: false,
        error: new Error('Feed validation failed')
      }
    }
  }
}

export const feedValidator = new FeedValidator()