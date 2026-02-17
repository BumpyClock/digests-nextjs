// ABOUTME: Unit tests for reader-view query hook and shared query configuration

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { readerViewQueryByUrl, useReaderViewQuery } from "../use-reader-view-query";
import { workerService } from "@/services/worker-service";

jest.mock("@/services/worker-service");

const mockedWorkerService = workerService as jest.Mocked<typeof workerService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function QueryClientTestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  QueryClientTestWrapper.displayName = "QueryClientTestWrapper";

  return QueryClientTestWrapper;
};

describe("reader-view query", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should normalize reader-view query keys by URL", () => {
    const options = readerViewQueryByUrl(" HTTP://Example.COM/Article/ ");
    expect(options.queryKey).toEqual(["readerView", "example.com/article"]);
  });

  it("should fetch reader view through shared query options", async () => {
    mockedWorkerService.fetchReaderView.mockResolvedValueOnce({
      success: true,
      data: [
        {
          url: "https://example.com/articles/1",
          status: "ok",
          content: "<p>Read me</p>",
          title: "Example article",
          siteName: "Example",
          image: "",
          favicon: "",
          textContent: "Read me",
          markdown: "Read me",
        },
      ],
      message: "ok",
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useReaderViewQuery(" https://Example.com/Article/1 "), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedWorkerService.fetchReaderView).toHaveBeenCalledTimes(1);
    expect(mockedWorkerService.fetchReaderView).toHaveBeenCalledWith(" https://Example.com/Article/1 ");
    expect(result.current.data?.url).toBe("https://example.com/articles/1");
    expect(result.current.data?.status).toBe("ok");
  });
});
