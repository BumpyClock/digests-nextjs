import type { Feed, FeedItem, ReaderViewResponse } from "@/types";

export type RssWorkerMessage =
  | { type: "FETCH_FEEDS"; payload: { urls: string[]; apiBaseUrl?: string }; requestId?: string }
  | {
      type: "FETCH_READER_VIEW";
      payload: { urls: string[]; apiBaseUrl?: string };
      requestId?: string;
    }
  | {
      type: "REFRESH_FEEDS";
      payload: { urls: string[]; apiBaseUrl?: string };
      requestId?: string;
    }
  | {
      type: "CHECK_UPDATES";
      payload: { urls: string[]; apiBaseUrl?: string };
      requestId?: string;
    }
  | { type: "SET_API_URL"; payload: { url: string }; requestId?: string }
  | { type: "SET_CACHE_TTL"; payload: { ttl: number }; requestId?: string };

export type ShadowWorkerMessage = {
  type: "GENERATE_SHADOWS";
  payload: {
    id: string;
    color: { r: number; g: number; b: number };
    isDarkMode: boolean;
  };
  requestId?: string;
};

export type WorkerMessage = RssWorkerMessage | ShadowWorkerMessage;

export type RssWorkerResponse =
  | {
      type: "FEEDS_RESULT";
      success: boolean;
      feeds: Feed[];
      items: FeedItem[];
      message?: string;
      requestId?: string;
    }
  | {
      type: "READER_VIEW_RESULT";
      success: boolean;
      data: ReaderViewResponse[];
      message?: string;
      requestId?: string;
    }
  | { type: "ERROR"; message: string; requestId?: string };

export type ShadowWorkerResponse = {
  type: "SHADOWS_RESULT";
  payload: {
    id: string;
    shadows: { restShadow: string; hoverShadow: string; pressedShadow: string };
  };
  requestId?: string;
};

export type WorkerResponse = RssWorkerResponse | ShadowWorkerResponse;
