'use client';

import { useEffect } from 'react';
import { workerService } from '@/services/worker-service';
import { Logger } from '@/utils/logger';

/**
 * Component that initializes the worker service on the client side
 * This should be included in the root layout
 */
export function WorkerInitializer() {
  useEffect(() => {
    // Initialize worker service
    Logger.debug('Initializing worker service');
    workerService.initialize();

    // Register PWA service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(err => console.error('Service worker registration failed', err));
    }
    
    // Cleanup on unmount
    return () => {
      workerService.terminate();
    };
  }, []);
  
  return null;
}