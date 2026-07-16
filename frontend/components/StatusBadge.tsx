import { STATUS } from '@/lib/categories';

const styles: Record<number, string> = {
  0: 'border-zinc-600 text-zinc-400',
  1: 'border-amber-500/50 text-amber-400',
  2: 'border-emerald-500/50 text-emerald-400',
  3: 'border-red-500/50 text-red-400',
  4: 'border-orange-500/50 text-orange-400',
};

export function StatusBadge({ status }: { status: number }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${styles[status] ?? styles[0]}`}
    >
      {STATUS[status] ?? 'Unknown'}
    </span>
  );
}
