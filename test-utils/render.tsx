import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

// Create a custom render function that includes all providers
interface CustomRenderOptions extends Omit<RenderOptions, "queries"> {
  // Add any additional provider props here
  initialTheme?: string;
}

// Create a test query client with default options
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Turn off retries for tests
        retry: false,
        // Set a shorter cache time for tests
        gcTime: 1000 * 60 * 5, // 5 minutes
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// All the providers for the app
export function AllTheProviders({
  children,
  queryClient = createTestQueryClient(),
  theme = "light",
}: {
  children: React.ReactNode;
  queryClient?: QueryClient;
  theme?: string;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme={theme}
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { initialTheme = "light", ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders theme={initialTheme}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  });
};

// re-export everything
export * from "@testing-library/react";

// override render method
export { customRender as render };
