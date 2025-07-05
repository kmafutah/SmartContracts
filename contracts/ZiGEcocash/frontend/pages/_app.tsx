import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { NotificationProvider } from '../components/Notification';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import Menu from '../components/Menu';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <Menu />
          <Component {...pageProps} />
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}