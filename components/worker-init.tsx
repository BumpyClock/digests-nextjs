"use client";

import { useEffect } from "react";
import { workerService } from "@/services/worker-service";
import { useApiConfigStore } from "@/store/useApiConfigStore";
import { Logger } from "@/utils/logger";

/**
 * React component that initializes and cleans up the worker service on the client side.
 *
 * This component should be included in the application's root layout to ensure the worker service is started when the app loads and terminated when the component unmounts.
 *
 * @remark Registers a service worker from `/sw.js` if supported by the browser. Logs an error to the console if registration fails.
 * For non-React hosts, use `workerService.start()` and `workerService.stop()` directly.
 */
export function WorkerInitializer() {
  const apiBaseUrl = useApiConfigStore((state) => state.config.baseUrl);

  useEffect(() => {
    // Initialize worker service
    Logger.debug("Initializing worker service");
    workerService.start();

    // Register PWA service worker if supported
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Service worker registration failed", err));
    }

    // Cleanup on unmount
    return () => {
      workerService.stop();
    };
  }, []);

  useEffect(() => {
    workerService.updateApiUrl(apiBaseUrl);
  }, [apiBaseUrl]);

  return null;
}
