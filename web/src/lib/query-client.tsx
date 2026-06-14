/* =====================================================================
   TanStack Query client + provider. Sensible defaults for an auth'd app:
   retry once, 30s stale time, no refetch-on-focus storms.
   ===================================================================== */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "./api";
import type { ReactNode } from "react";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry auth/permission/not-found errors — only transient ones.
        if (error instanceof ApiError && [400, 401, 403, 404, 409].includes(error.status)) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
