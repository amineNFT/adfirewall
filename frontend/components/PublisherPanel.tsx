'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { AD_FIREWALL } from '@/lib/chain';
import { adFirewallAbi } from '@/lib/abi';
import { CATEGORIES, categoriesToMask, maskToCategories } from '@/lib/categories';

export function PublisherPanel() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [selected, setSelected] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [rules, setRules] = useState('');
  const [msg, setMsg] = useState('');

  const { data: policy, refetch } = useReadContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'getPolicy',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (policy?.exists) {
      setSelected(maskToCategories(policy.bannedCategories).map((c) => c.bit));
      setRules(policy.customRules);
    }
  }, [policy]);

  function toggle(bit: number) {
    setSelected((s) => (s.includes(bit) ? s.filter((b) => b !== bit) : [...s, bit]));
  }

  async function save() {
    setMsg('');
    try {
      await writeContractAsync({
        address: AD_FIREWALL,
        abi: adFirewallAbi,
        functionName: 'setPolicy',
        args: [categoriesToMask(selected), rules],
      });
      setMsg('Policy submitted. It will update after the transaction confirms.');
      setTimeout(() => refetch(), 3000);
    } catch (e) {
      setMsg(`Error: ${(e as Error).message.split('\n')[0]}`);
    }
  }

  if (!isConnected) {
    return <p className="text-sm text-zinc-500">Connect your wallet to define a policy for your site.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="label">Your site address (policy owner)</p>
        <p className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-xs text-ember">{address}</p>
        <p className="mt-1 text-xs text-zinc-600">
          Advertisers target this address. Only ads that pass this policy can be displayed.
        </p>
      </div>

      <div>
        <p className="label">Forbidden categories</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const on = selected.includes(c.bit);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggle(c.bit)}
                className={`flex items-start gap-2 rounded-md border p-2 text-left transition ${
                  on ? 'border-ember bg-ember/10' : 'border-ink-600 bg-ink-900 hover:border-ink-500'
                }`}
              >
                <span className={`mt-0.5 text-xs ${on ? 'text-ember' : 'text-zinc-600'}`}>{on ? '■' : '□'}</span>
                <span>
                  <span className="block text-xs text-zinc-200">{c.label}</span>
                  <span className="block text-[10px] text-zinc-600">{c.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label">Custom rules (free text)</p>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          rows={3}
          placeholder="e.g. no crypto airdrops, no ads targeting minors, no exaggerated health claims"
          className="input"
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-ember" onClick={save} disabled={isPending}>
          {isPending ? 'Saving…' : policy?.exists ? 'Update policy' : 'Create policy'}
        </button>
        {policy?.exists && <span className="text-xs text-emerald-500">● policy active</span>}
      </div>
      {msg && <p className="text-xs text-zinc-400">{msg}</p>}
    </div>
  );
}
