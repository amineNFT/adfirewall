'use client';

import { useState } from 'react';
import { encodeFunctionData, isAddress } from 'viem';
import { useAccount, useSendTransaction, useSwitchChain } from 'wagmi';
import { AD_FIREWALL, ritualChain } from '@/lib/chain';
import { adFirewallAbi } from '@/lib/abi';
import { useLLMExecutor, useSiteAds } from '@/lib/hooks';
import { AdCard } from './AdCard';

export function ModerationPanel() {
  const { address, isConnected, chainId } = useAccount();
  const [site, setSite] = useState('');
  const [busy, setBusy] = useState<bigint | null>(null);
  const [err, setErr] = useState('');
  const { executor, count, isLoading: exLoading } = useLLMExecutor();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();

  const useMine = () => address && setSite(address);
  const validSite = isAddress(site);
  const { ads, refetch } = useSiteAds(validSite ? (site as `0x${string}`) : undefined);

  // Moderation is signed by the visitor's connected wallet. moderateAd calls the
  // async LLM precompile (0x0802), which browser wallets cannot simulate — so we
  // use sendTransaction + encodeFunctionData with an explicit gas limit to skip
  // gas estimation entirely (Ritual's documented browser pattern). The signing
  // EOA pays the LLM fee, so it must hold a locked RitualWallet deposit.
  async function moderate(id: bigint) {
    setErr('');
    if (!isConnected) {
      setErr('Connect your wallet first (top-right).');
      return;
    }
    if (!executor) {
      setErr('No LLM executor available from TEEServiceRegistry right now.');
      return;
    }
    setBusy(id);
    try {
      if (chainId !== ritualChain.id) {
        await switchChainAsync({ chainId: ritualChain.id });
      }
      const data = encodeFunctionData({
        abi: adFirewallAbi,
        functionName: 'moderateAd',
        args: [id, executor],
      });
      await sendTransactionAsync({ to: AD_FIREWALL, data, gas: 6_000_000n });
      setTimeout(() => refetch(), 3000);
    } catch (e) {
      setErr(`Error: ${(e as Error).message.split('\n')[0]}`);
    } finally {
      setBusy(null);
    }
  }

  // Pending (1) and Errored (4) are both actionable — Errored can be retried
  // once executors recover. Decided = Approved (2) or Rejected (3).
  const pending = ads.filter((a) => a.status === 1 || a.status === 4);
  const decided = ads.filter((a) => a.status === 2 || a.status === 3);

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-ink-600 bg-ink-900 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">LLM executors online (capability 1)</span>
          <span className={count > 0 ? 'text-emerald-400' : 'text-red-400'}>
            {exLoading ? 'checking…' : count}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-zinc-600">
          Moderation is signed by your connected wallet. Your wallet pays the LLM fee, so it needs a
          RitualWallet deposit — use the “+ deposit” control in the header first.
        </p>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <p className="label">Site to moderate</p>
          <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="0x…" className="input" />
        </div>
        {isConnected && (
          <button className="btn-ghost" onClick={useMine}>
            Use my address
          </button>
        )}
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}

      {validSite && (
        <>
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
              Needs moderation ({pending.length})
            </h3>
            {pending.length === 0 ? (
              <p className="text-xs text-zinc-600">Nothing to moderate.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pending.map((ad) => (
                  <AdCard key={ad.id.toString()} ad={ad}>
                    <button
                      className="btn-ember mt-3 w-full"
                      onClick={() => moderate(ad.id)}
                      disabled={busy === ad.id || !isConnected || !executor}
                    >
                      {busy === ad.id
                        ? 'Running on-chain AI…'
                        : ad.status === 4
                          ? 'Retry AI moderation'
                          : 'Run AI moderation'}
                    </button>
                  </AdCard>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Decided ({decided.length})</h3>
            {decided.length === 0 ? (
              <p className="text-xs text-zinc-600">No decisions yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {decided.map((ad) => (
                  <AdCard key={ad.id.toString()} ad={ad} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
