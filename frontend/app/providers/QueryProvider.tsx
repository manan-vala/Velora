"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { SESSION_KEY } from "@/hooks/useSession";
import { UnauthorizedError } from "@/lib/client";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => {
    // The cache handler needs the client it belongs to, which doesn't exist yet.
    const holder: { client?: QueryClient } = {};

    // A 401 from any call (e.g. polling with an expired session) drops the session,
    // which sends the guards to the login page instead of retrying forever.
    const queryCache = new QueryCache({
      onError: (error, query) => {
        if (error instanceof UnauthorizedError && query.queryKey[0] !== SESSION_KEY[0]) {
          holder.client?.setQueryData(SESSION_KEY, null);
        }
      },
    });

    holder.client = new QueryClient({
      queryCache,
      defaultOptions: {
        queries: {
          retry: (failureCount, error) =>
            !(error instanceof UnauthorizedError) && failureCount < 3,
        },
      },
    });
    return holder.client;
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
