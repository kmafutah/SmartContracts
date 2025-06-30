import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { NotificationProvider } from '../components/Notification';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { polygonZkEvm } from 'wagmi/chains';
import { WagmiConfig } from 'wagmi';

const config = getDefaultConfig({
  appName: 'ZiGVerse',
  projectId: '98776ce17d99f3300c323b5711a91e24',
  chains: [polygonZkEvm],
});

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <RainbowKitProvider>
          <NotificationProvider>
            <Component {...pageProps} />
          </NotificationProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}