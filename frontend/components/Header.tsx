'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { useWriteContract } from 'wagmi';
import { ritualChain, RITUAL_WALLET } from '@/lib/chain';
import { ritualWalletAbi } from '@/lib/abi';
import { useWalletBalance } from '@/lib/hooks';

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';
}

export function Header() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance, refetch } = useWalletBalance(address);
  const { writeContractAsync } = useWriteContract();
  const [depositing, setDepositing] = useState(false);
  const [amount, setAmount] = useState('0.5');

  const wrongChain = isConnected && chainId !== ritualChain.id;
  const injectedConnector = connectors.find((c) => c.type === 'injected') ?? connectors[0];

  async function deposit() {
    setDepositing(true);
    try {
      await writeContractAsync({
        address: RITUAL_WALLET,
        abi: ritualWalletAbi,
        functionName: 'deposit',
        args: [100_000n],
        value: parseEther(amount || '0'),
      });
      setTimeout(() => refetch(), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setDepositing(false);
    }
  }

  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-ink-600 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-ember">
          <span className="text-xl">▚</span>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            Ad<span className="text-ember">Firewall</span>
          </h1>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Decentralized AI ad filter · on-chain moderation via Ritual LLM precompile (0x0802)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isConnected && (
          <div className="flex items-center gap-2 rounded-md border border-ink-600 bg-ink-800 px-3 py-1.5 text-xs">
            <span className="text-zinc-500">fees</span>
            <span className="text-ember">{balance != null ? Number(formatEther(balance)).toFixed(4) : '—'}</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-14 rounded border border-ink-600 bg-ink-900 px-1 text-right text-[11px] text-zinc-200 outline-none focus:border-ember"
            />
            <button onClick={deposit} disabled={depositing} className="text-ember hover:text-ember-soft disabled:opacity-40">
              {depositing ? '…' : '+ deposit'}
            </button>
          </div>
        )}

        {wrongChain && (
          <button className="btn-ghost" onClick={() => switchChain({ chainId: ritualChain.id })}>
            Switch to Ritual
          </button>
        )}

        {isConnected ? (
          <button className="btn-ghost" onClick={() => disconnect()}>
            {short(address)}
          </button>
        ) : (
          <button className="btn-ember" onClick={() => connect({ connector: injectedConnector })} disabled={isPending}>
            {isPending ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
}
