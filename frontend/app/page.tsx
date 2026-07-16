'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { PublisherPanel } from '@/components/PublisherPanel';
import { AdvertiserPanel } from '@/components/AdvertiserPanel';
import { ModerationPanel } from '@/components/ModerationPanel';
import { AdSlots } from '@/components/AdSlots';
import { AD_FIREWALL } from '@/lib/chain';
import { useConfigured } from '@/lib/hooks';

const TABS = [
  { key: 'publisher', label: 'Publisher', desc: 'Define your ad-safety policy' },
  { key: 'advertiser', label: 'Advertiser', desc: 'Submit an ad for review' },
  { key: 'moderation', label: 'Moderation', desc: 'Run on-chain AI verdicts' },
  { key: 'slots', label: 'Ad Slots', desc: 'What the site displays' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function Home() {
  const [tab, setTab] = useState<TabKey>('publisher');
  const configured = useConfigured();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Header />

      {!configured && (
        <div className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-300">
          <strong>Not configured.</strong> Deploy the AdFirewall contract and set{' '}
          <code className="text-amber-200">NEXT_PUBLIC_AD_FIREWALL_ADDRESS</code> in{' '}
          <code className="text-amber-200">.env.local</code>. Current: {AD_FIREWALL}
        </div>
      )}

      <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md border p-3 text-left transition ${
              tab === t.key ? 'border-ember bg-ember/10' : 'border-ink-600 bg-ink-800 hover:border-ink-500'
            }`}
          >
            <span className={`block text-sm font-medium ${tab === t.key ? 'text-ember' : 'text-zinc-200'}`}>
              {t.label}
            </span>
            <span className="block text-[10px] text-zinc-600">{t.desc}</span>
          </button>
        ))}
      </nav>

      <section className="card p-5 sm:p-6">
        {tab === 'publisher' && <PublisherPanel />}
        {tab === 'advertiser' && <AdvertiserPanel />}
        {tab === 'moderation' && <ModerationPanel />}
        {tab === 'slots' && <AdSlots />}
      </section>

      <footer className="mt-8 border-t border-ink-600 pt-4 text-center text-[11px] text-zinc-600">
        Built on Ritual Chain (ID 1979) · verdicts produced by the LLM precompile inside a TEE ·{' '}
        <a href="https://docs.ritualfoundation.org" target="_blank" rel="noreferrer" className="text-ember/70 hover:text-ember">
          docs
        </a>
      </footer>
    </main>
  );
}
