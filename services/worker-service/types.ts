import type { WorkerMessage as SharedWorkerMessage, WorkerResponse as SharedWorkerResponse } from "@/types/worker-contracts";

export type WorkerKind = "rss" | "shadow";

export type WorkerMessage = SharedWorkerMessage;
export type WorkerResponse = SharedWorkerResponse;
