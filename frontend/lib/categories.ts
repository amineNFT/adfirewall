// Policy categories — must match the bit order in AdFirewall.sol.
export interface Category {
  bit: number;
  key: string;
  label: string;
  hint: string;
}

export const CATEGORIES: Category[] = [
  { bit: 0, key: 'gambling', label: 'Gambling', hint: 'betting, sports books, lotteries' },
  { bit: 1, key: 'casino', label: 'Casino', hint: 'slots, roulette, poker rooms' },
  { bit: 2, key: 'adult', label: 'Adult content', hint: 'sexual / NSFW material' },
  { bit: 3, key: 'scam', label: 'Scams & fraud', hint: 'get-rich-quick, fake giveaways' },
  { bit: 4, key: 'political', label: 'Political ads', hint: 'candidates, campaigns, issues' },
  { bit: 5, key: 'phishing', label: 'Phishing', hint: 'credential theft, impersonation' },
  { bit: 6, key: 'alcohol', label: 'Alcohol', hint: 'beer, wine, spirits' },
  { bit: 7, key: 'drugs', label: 'Illegal drugs', hint: 'narcotics, paraphernalia' },
  { bit: 8, key: 'weapons', label: 'Weapons', hint: 'firearms, ammunition' },
  { bit: 9, key: 'hate', label: 'Hate speech', hint: 'targeting protected groups' },
  { bit: 10, key: 'malware', label: 'Malware', hint: 'malicious software, exploits' },
  { bit: 11, key: 'misinfo', label: 'Misinformation', hint: 'false or misleading claims' },
];

export function maskToCategories(mask: bigint): Category[] {
  return CATEGORIES.filter((c) => (mask & (1n << BigInt(c.bit))) !== 0n);
}

export function categoriesToMask(bits: number[]): bigint {
  return bits.reduce((acc, b) => acc | (1n << BigInt(b)), 0n);
}

export const STATUS = ['None', 'Pending', 'Approved', 'Rejected', 'Errored'] as const;
export type StatusName = (typeof STATUS)[number];
