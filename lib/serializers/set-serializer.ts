/**
 * Utility for serializing/deserializing Sets for Zustand persistence
 */

/**
 * Deserializes storage data back to a Set
 * Handles arrays, existing Sets, and null/undefined
 * @param data - Data from storage (could be array, Set, or null)
 * @returns Set instance
 */
export function deserializeSet<T>(data: unknown): Set<T> {
  // Already a Set
  if (data instanceof Set) return data;

  // Array from storage
  if (Array.isArray(data)) return new Set(data);

  // Null, undefined, or invalid
  return new Set();
}
