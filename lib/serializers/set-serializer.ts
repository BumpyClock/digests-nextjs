/**
 * Utility for serializing/deserializing Sets for Zustand persistence
 */

/**
 * Serializes a Set to an Array for JSON storage
 * @param set - Set to serialize
 * @returns Array representation
 */
export function serializeSet<T>(set: Set<T> | undefined | null): T[] {
  if (!set) return [];
  if (set instanceof Set) return Array.from(set);
  // If already an array (shouldn't happen but defensive)
  if (Array.isArray(set)) return set;
  return [];
}

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

/**
 * Zustand persist middleware helpers for Set fields
 */
export const setSerializerMiddleware = {
  /**
   * Called during store.persist() - converts Sets to Arrays
   */
  serialize: <T extends Record<string, unknown>>(state: T, setFields: (keyof T)[]): T => {
    const serialized = { ...state };
    for (const field of setFields) {
      if (state[field] instanceof Set) {
        (serialized as Record<string, unknown>)[field] = Array.from(state[field] as Set<unknown>);
      }
    }
    return serialized;
  },

  /**
   * Called during store.rehydrate() - converts Arrays back to Sets
   */
  deserialize: <T extends Record<string, unknown>>(state: T, setFields: (keyof T)[]): T => {
    const deserialized = { ...state };
    for (const field of setFields) {
      deserialized[field] = deserializeSet(state[field as keyof T]);
    }
    return deserialized;
  },
};
