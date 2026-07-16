import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Ad Firewall — decentralized AI ad filter on Ritual',
  description:
    'Publishers define ad-safety policies. Advertisers submit ads. Ritual on-chain AI decides what passes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-mono">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
