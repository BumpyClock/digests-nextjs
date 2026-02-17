import type { QueryKey } from "@tanstack/react-query";
import type { Subscription } from "@/types/subscription";
import { stableKey } from "@/utils/hash";
import { normalizeUrl } from "@/utils/url";

type FeedUrlInput = string | null | undefined;

export const normalizeFeedUrl = (url: FeedUrlInput): string => normalizeUrl(url);

export const normalizeFeedUrls = (urls: ReadonlyArray<FeedUrlInput>): string[] =>
  Array.from(new Set(urls.map((url) => normalizeFeedUrl(url)).filter(Boolean))).sort();

export const getSubscriptionUrls = (
  subscriptions: ReadonlyArray<Pick<Subscription, "feedUrl"> | undefined>
): string[] =>
  normalizeFeedUrls((subscriptions ?? []).map((subscription) => subscription?.feedUrl));

export const feedsKeys = {
  all: ["feeds"] as const,
  list: (urls: ReadonlyArray<FeedUrlInput>): QueryKey =>
    ["feeds", "list", stableKey(normalizeFeedUrls(urls))] as const,
  isList: (queryKey: QueryKey): queryKey is readonly ["feeds", "list", string] =>
    queryKey.length >= 2 && queryKey[0] === "feeds" && queryKey[1] === "list",
  details: (id: string) => ["feeds", "detail", id] as const,
} as const;

export const readerViewKeys = {
  all: ["readerView"] as const,
  byUrl: (url: string) => [...readerViewKeys.all, normalizeFeedUrl(url)] as const,
} as const;
