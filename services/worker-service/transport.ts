import { Logger } from "@/utils/logger";
import type { WorkerKind, WorkerMessage, WorkerResponse } from "./types";

interface SendWorkerRequestOptions {
  worker: WorkerKind;
  message: WorkerMessage;
  expectedResponseType: WorkerResponse["type"];
  timeoutMs: number;
  ensureInitialized: () => void;
  getWorker: (worker: WorkerKind) => Worker | null;
  postMessage: (message: WorkerMessage) => void;
  onMessage: <T extends WorkerResponse["type"]>(
    type: T,
    handler: (data: Extract<WorkerResponse, { type: T }>) => void
  ) => () => void;
  createRequestId: () => string;
  fallbackFn?: () => Promise<WorkerResponse>;
  responseFilter?: (response: WorkerResponse) => boolean;
}

export function sendWorkerRequest(options: SendWorkerRequestOptions): Promise<WorkerResponse> {
  const {
    worker,
    message,
    expectedResponseType,
    timeoutMs,
    ensureInitialized,
    getWorker,
    postMessage,
    onMessage,
    createRequestId,
    fallbackFn,
    responseFilter,
  } = options;

  return new Promise((resolve, reject) => {
    const requestId = createRequestId();
    ensureInitialized();

    const workerInstance = getWorker(worker);
    if (!workerInstance) {
      if (fallbackFn) {
        Logger.warn("WorkerService: Worker not available, using fallback");
        fallbackFn().then(resolve).catch(reject);
      } else {
        reject(new Error("Worker not available and no fallback provided"));
      }
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | null = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Worker message timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    unsubscribe = onMessage(expectedResponseType, (response) => {
      if (response.requestId !== requestId) {
        Logger.debug("WorkerService: Ignoring response with mismatched requestId", {
          expectedRequestId: requestId,
          receivedRequestId: response.requestId,
          type: response.type,
        });
        return;
      }

      if (responseFilter && !responseFilter(response)) {
        return;
      }

      cleanup();
      resolve(response);
    });

    postMessage({ ...message, requestId });
  });
}
