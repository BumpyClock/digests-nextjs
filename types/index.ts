/**
 * Barrel file for exporting all types
 */

export * from './feed'
export * from './api'
export * from './storage'

// Add any shared types here
export interface Timestamp {
  createdAt: number
  updatedAt: number
}

export interface Result<T, E = Error> {
  success: boolean
  data?: T
  error?: E
}