import type { ReaderViewResponse } from "../../types";

export const READER_VIEW_SUCCESS_STATUS = "ok";

type ReaderViewFetchResult = {
  success: boolean;
  data: ReaderViewResponse[];
  message?: string;
};

export function getValidReaderViewOrThrow(
  result: ReaderViewFetchResult,
  url: string
): ReaderViewResponse {
  if (!result?.success) {
    throw new Error(result?.message || `Failed to load reader view for ${url}`);
  }

  if (!Array.isArray(result.data) || result.data.length === 0) {
    throw new Error(`No reader view payload for ${url}`);
  }

  const readerView = result.data[0];
  if (!readerView || readerView.status !== READER_VIEW_SUCCESS_STATUS) {
    const message =
      (readerView && (readerView as { error?: string }).error) ||
      `Invalid reader view status for ${url}: ${readerView?.status ?? "missing"}`;
    throw new Error(message);
  }

  return readerView;
}
