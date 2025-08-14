/**
 * Cross-platform UUID generator that works in both browser and Node.js environments
 */
export async function generateUUID(): Promise<string> {
  // Try browser crypto API first
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    window.crypto.randomUUID
  ) {
    return window.crypto.randomUUID();
  }

  // Try Node.js crypto module
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    try {
      const crypto = await import("crypto");
      if (crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch {
      // Fall through to manual implementation
    }
  }

  // Fallback to manual UUID v4 generation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Cross-platform hash function that works in both browser and Node.js environments
 */
export async function createHash(data: string): Promise<string> {
  // Try Node.js crypto module first
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    try {
      const crypto = await import("crypto");
      if (crypto.createHash) {
        return crypto.createHash("sha256").update(data).digest("hex");
      }
    } catch {
      // Fall through to browser implementation
    }
  }

  // Browser fallback using SubtleCrypto (if available)
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    // Note: This would be async, but we need sync for this use case
    // Fall through to simple hash
  }

  // Simple fallback hash function (not cryptographically secure, but sufficient for request deduplication)
  let hash = 0;
  if (data.length === 0) return hash.toString(16);
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
