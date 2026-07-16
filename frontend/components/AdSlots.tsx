'use client';

import { useState } from 'react';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { useSiteAds } from '@/lib/hooks';

/**
 * Simulates a website ad slot: only ads Approved for this site's policy render.
 */
export function AdSlots() {
  const { address, isConnected } = useAccount();
  const [site, setSite] = useState('');
  const validSite = isAddress(site);
  const { ads } = useSiteAds(validSite ? (site as `0x${string}`) : undefined);
  const approved = ads.filter((a) => a.status === 2);

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <p className="label">Website (publisher address)</p>
          <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="0x…" className="input" />
        </div>
        {isConnected && (
          <button className="btn-ghost" onClick={() => address && setSite(address)}>
            Use my address
          </button>
        )}
      </div>

      {validSite && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500">Live ad slots</h3>
            <span className="text-[11px] text-zinc-600">{approved.length} approved</span>
          </div>

          <div className="rounded-lg border border-dashed border-ink-600 p-4">
            <p className="mb-3 text-center text-[10px] uppercase tracking-widest text-zinc-700">
              — your website content —
            </p>
            {approved.length === 0 ? (
              <div className="rounded border border-ink-600 bg-ink-900 p-6 text-center text-xs text-zinc-600">
                No approved ads to display yet. The firewall is blocking everything else.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {approved.map((ad) => (
                  <a
                    key={ad.id.toString()}
                    href={ad.landingUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-md border border-ink-600 bg-ink-800 transition hover:border-ember"
                  >
                    {ad.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ad.imageUrl}
                        alt={ad.headline}
                        className="h-28 w-full bg-ink-900 object-cover"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                      />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center bg-ink-900 text-2xl text-ink-600">
                        ▚
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-[9px] uppercase tracking-wider text-emerald-500">✓ firewall approved</p>
                      <h4 className="mt-1 truncate text-sm font-semibold text-zinc-100 group-hover:text-ember">
                        {ad.headline}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{ad.body}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
            <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-zinc-700">
              — more content —
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
