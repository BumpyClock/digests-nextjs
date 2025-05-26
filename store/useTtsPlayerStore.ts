// ABOUTME: Legacy TTS player store - now redirects to unified store via migration helpers
// ABOUTME: This file maintains backward compatibility while code migrates to useUnifiedAudioStore

"use client";

/**
 * @deprecated Use useUnifiedAudioStore instead
 * This file now re-exports from migration helpers for backward compatibility
 */
export * from './migration-helpers';
export { useTtsPlayerStore as default } from './migration-helpers';