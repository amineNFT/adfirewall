import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { ritualChain } from '@/lib/chain';

export const config = createConfig({
  chains: [ritualChain],
  connectors: [injected()],
  transports: {
    [ritualChain.id]: http(),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
