import { StatusBadge } from './StatusBadge';

export interface AdView {
  id: bigint;
  advertiser: `0x${string}`;
  site: `0x${string}`;
  headline: string;
  body: string;
  imageUrl: string;
  landingUrl: string;
  status: number;
  verdict: string;
  createdAt: bigint;
  moderatedAt: bigint;
}

export function AdCard({ ad, children }: { ad: AdView; children?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">#{ad.id.toString()}</span>
            <StatusBadge status={ad.status} />
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-zinc-100">{ad.headline}</h3>
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-xs text-zinc-400">{ad.body}</p>
      {ad.landingUrl && (
        <p className="mt-2 truncate text-[11px] text-ember/80">{ad.landingUrl}</p>
      )}
      {ad.verdict && (
        <div className="mt-3 rounded border border-ink-600 bg-ink-900 p-2">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">AI verdict</p>
          <p className="whitespace-pre-wrap break-words text-[11px] text-zinc-400">{ad.verdict}</p>
        </div>
      )}
      {children}
    </div>
  );
}
