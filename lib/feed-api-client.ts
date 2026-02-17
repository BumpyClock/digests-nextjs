import { getApiUrl } from "@/lib/config";
import { transformFeedResponse } from "@/lib/feed-transformer";
import type { FetchFeedsResponse, Feed, FeedItem, ReaderViewResponse } from "@/types";
import { Logger } from "@/utils/logger";

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, "");
const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const toHttpUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const decoded = decodeURIComponent(trimmed);
  if (/^https?:\/\//i.test(decoded)) {
    return decoded;
  }
  if (decoded.startsWith("//")) {
    return `https:${decoded}`;
  }

  return `https://${decoded}`;
};

const normalizeRequestUrls = (urls: string[]): string[] => {
  return urls
    .map((url) => toHttpUrl(url))
    .filter((url) => url.length > 0 && isValidHttpUrl(url));
};

const resolveEndpoint = (path: "/parse" | "/getreaderview", apiBaseUrl?: string): string => {
  if (apiBaseUrl) {
    return `${normalizeBaseUrl(apiBaseUrl)}${path}`;
  }

  return getApiUrl(path);
};

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = new Error(`HTTP error! status: ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as TResponse;
}

export async function fetchParseFeeds(
  urls: string[],
  apiBaseUrl?: string
): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
  const normalizedUrls = normalizeRequestUrls(urls);
  if (normalizedUrls.length === 0) {
    throw new Error("No valid feed URLs were provided");
  }
  if (normalizedUrls.length < urls.length) {
    Logger.warn(
      `[feed-api-client] Skipping invalid feed URLs (${urls.length - normalizedUrls.length} dropped)`
    );
  }

  const endpoint = resolveEndpoint("/parse", apiBaseUrl);
  let data: FetchFeedsResponse;
  try {
    data = await postJson<FetchFeedsResponse>(endpoint, { urls: normalizedUrls });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status !== 400 || normalizedUrls.length <= 1) {
      throw error;
    }

    Logger.warn(
      `[feed-api-client] Batch parse failed with 400; retrying per URL (count=${urls.length})`
    );

    const settled = await Promise.allSettled(
      normalizedUrls.map((url) => postJson<FetchFeedsResponse>(endpoint, { urls: [url] }))
    );
    const mergedFeeds: Feed[] = [];
    const mergedItems: FeedItem[] = [];

    for (const result of settled) {
      if (result.status === "fulfilled") {
        const transformed = transformFeedResponse(result.value);
        mergedFeeds.push(...transformed.feeds);
        mergedItems.push(...transformed.items);
      }
    }

    if (mergedFeeds.length > 0 || mergedItems.length > 0) {
      return { feeds: mergedFeeds, items: mergedItems };
    }

    throw error;
  }

  if (!data || !Array.isArray(data.feeds)) {
    throw new Error("Invalid response from API");
  }

  return transformFeedResponse(data);
}

export async function fetchReaderViewData(
  urls: string[],
  apiBaseUrl?: string
): Promise<ReaderViewResponse[]> {
  const normalizedUrls = normalizeRequestUrls(urls);
  if (normalizedUrls.length === 0) {
    throw new Error("No valid reader-view URLs were provided");
  }

  const data = await postJson<unknown>(resolveEndpoint("/getreaderview", apiBaseUrl), {
    urls: normalizedUrls,
  });

  if (!Array.isArray(data)) {
    throw new Error("Invalid response from API");
  }

  return data as ReaderViewResponse[];
}
