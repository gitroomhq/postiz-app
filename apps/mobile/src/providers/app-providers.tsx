import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { useQueryFocusBridge } from '@/src/hooks/use-query-focus-bridge';
import { queryClient } from '@/src/providers/query-client';

export function AppProviders({ children }: PropsWithChildren) {
  useQueryFocusBridge();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
