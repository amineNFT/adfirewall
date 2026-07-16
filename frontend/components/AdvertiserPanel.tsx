'use client';

import { useState } from 'react';
import { isAddress } from 'viem';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { AD_FIREWALL } from '@/lib/chain';
import { adFirewallAbi } from '@/lib/abi';
import { maskToCategories } from '@/lib/categories';

export function AdvertiserPanel() {
  const { isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [site, setSite] = useState('');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [msg, setMsg] = useState('');

  const validSite = isAddress(site);

  const { data: policy } = useReadContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'getPolicy',
    args: validSite ? [site as `0x${string}`] : undefined,
    query: { enabled: validSite },
  });

  async function submit() {
    setMsg('');
    try {
      await writeContractAsync({
        address: AD_FIREWALL,
        abi: adFirewallAbi,
        functionName: 'submitAd',
        args: [site as `0x${string}`, headline, body, imageUrl, landingUrl],
      });
      setMsg('Ad submitted as Pending. Head to the Moderation tab to run the AI verdict.');
      setHeadline('');
      setBody('');
      setImageUrl('');
      setLandingUrl('');
    } catch (e) {
      setMsg(`Error: ${(e as Error).message.split('\n')[0]}`);
    }
  }

  if (!isConnected) {
    return <p className="text-sm text-zinc-500">Connect your wallet to submit an ad.</p>;
  }

  const canSubmit = validSite && policy?.exists && headline.trim() && body.trim();

  return (
    <div className="space-y-5">
      <div>
        <p className="label">Target site (publisher address)</p>
        <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="0x…" className="input" />
        {site && !validSite && <p className="mt-1 text-xs text-red-400">Not a valid address.</p>}
        {validSite && !policy?.exists && (
          <p className="mt-1 text-xs text-red-400">This site has no policy yet — ads cannot be submitted.</p>
        )}
        {validSite && policy?.exists && (
          <p className="mt-1 text-xs text-zinc-500">
            Forbidden: {maskToCategories(policy.bannedCategories).map((c) => c.label).join(', ') || 'general safety'}
            {policy.customRules ? ` · ${policy.customRules}` : ''}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="label">Headline</p>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="input" />
        </div>
        <div className="sm:col-span-2">
          <p className="label">Body</p>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="input" />
        </div>
        <div>
          <p className="label">Image URL</p>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="input" />
        </div>
        <div>
          <p className="label">Landing URL</p>
          <input value={landingUrl} onChange={(e) => setLandingUrl(e.target.value)} placeholder="https://…" className="input" />
        </div>
      </div>

      <button className="btn-ember" onClick={submit} disabled={!canSubmit || isPending}>
        {isPending ? 'Submitting…' : 'Submit ad for review'}
      </button>
      {msg && <p className="text-xs text-zinc-400">{msg}</p>}
    </div>
  );
}
