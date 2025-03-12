'use client';

import { useEffect } from 'react';
import { workerService } from '@/services/worker-service';

/**
 * Component that initializes the worker service on the client side
 * This should be included in the root layout
 */
export function WorkerInitializer() {
  useEffect(() => {
    // Initialize worker service
    console.log("Initializing worker service");
    workerService.initialize();
    
    // Cleanup on unmount
    return () => {
      workerService.terminate();
    };
  }, []);
  
  return null;
}