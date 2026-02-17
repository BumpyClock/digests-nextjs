"use client";

import { useEffect } from "react";
import { workerService } from "@/services/worker-service";
import { useApiConfigStore } from "@/store/useApiConfigStore";
import { Logger } from "@/utils/logger";

/**
 * React component that keeps non-UI worker runtime wiring in sync.
 *
 * This component should be included in the application's root layout.
 * Worker startup is now demand-driven and managed by `WorkerService` itself.
 *
 * @remark Registers a service worker from `/sw.js` if supported by the browser.
 * Logs an error to the console if registration fails.
 * For non-React hosts, use `workerService.start()` and `workerService.stop()` directly.
 */
export function WorkerInitializer() {
  const apiBaseUrl = useApiConfigStore((state) => state.config.baseUrl);

  useEffect(() => {
    // Keep worker runtime configuration synchronized with persisted settings.
    workerService.updateApiUrl(apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    // Register PWA service worker if supported
    Logger.debug("Registering service worker");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Service worker registration failed", err));
    }
  }, []);

  return null;
}
