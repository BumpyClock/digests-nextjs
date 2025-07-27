'use client';

import { useEffect } from 'react';
import { Logger } from '@/utils/logger';

/**
 * React component that initializes PWA service worker on the client side.
 *
 * This component should be included in the application's root layout to ensure 
 * the PWA service worker is registered when the app loads.
 *
 * @remark Registers a service worker from `/sw.js` if supported by the browser. 
 * Logs an error to the console if registration fails.
 * 
 * Note: The RSS and shadow workers have been removed in favor of direct API calls
 * for improved performance (4x faster API responses).
 */
export function WorkerInitializer() {
  useEffect(() => {
    // Register PWA service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => Logger.debug('PWA service worker registered'))
        .catch(err => console.error('Service worker registration failed', err));
    }
  }, []);
  
  return null;
}