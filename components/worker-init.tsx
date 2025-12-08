"use client";

import { useEffect } from "react";
import { workerService } from "@/services/worker-service";
import { Logger } from "@/utils/logger";

/**
 * React component that initializes and cleans up the worker service on the client side.
 *
 * This component should be included in the application's root layout to ensure the worker service is started when the app loads and terminated when the component unmounts.
 *
 * @remark Registers a service worker from `/sw.js` if supported by the browser. Logs an error to the console if registration fails.
 */
export function WorkerInitializer() {
  useEffect(() => {
    // Initialize worker service
    Logger.debug("Initializing worker service");
    workerService.initialize();

    // Register PWA service worker if supported
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Service worker registration failed", err));
    }

    // Cleanup on unmount
    return () => {
      workerService.terminate();
    };
  }, []);

  return null;
}
