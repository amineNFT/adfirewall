import { getWalletClient, publicClient, AD_FIREWALL } from './chain.js';
import { adFirewallAbi, STATUS_LABELS } from './abis.js';

/**
 * Submit a fresh ad and moderate it with a SPECIFIED executor address, to test
 * whether a given executor can actually serve LLM inference.
 *
 * Usage: npx tsx src/try-executor.ts <executorAddress>
 */
const executor = process.argv[2] as `0x${string}` | undefined;
if (!executor) throw new Error('Usage: npx tsx src/try-executor.ts <executorAddress>');
if (AD_FIREWALL === '0x0000000000000000000000000000000000000000') throw new Error('Set AD_FIREWALL_ADDRESS');

const wallet = getWalletClient();
const site = wallet.account.address;

// Ensure a policy exists for the signer (as publisher).
const policy = await publicClient.readContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'getAd', // placeholder to keep import; real check below
  args: [1n],
}).catch(() => null);
void policy;

console.log('setting policy (idempotent)...');
const BANNED = (1n << 0n) | (1n << 1n) | (1n << 2n) | (1n << 3n) | (1n << 4n) | (1n << 5n);
let hash = await wallet.writeContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'setPolicy',
  args: [BANNED, 'no crypto airdrops'],
});
await publicClient.waitForTransactionReceipt({ hash });

console.log('submitting a fresh test ad...');
hash = await wallet.writeContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'submitAd',
  args: [site, 'Executor health test', 'A neutral, safe advertisement for testing.', '', 'https://example.test'],
});
await publicClient.waitForTransactionReceipt({ hash });
const adId = await publicClient.readContract({ address: AD_FIREWALL, abi: adFirewallAbi, functionName: 'adCount' });
console.log('new ad id:', adId);

console.log(`moderating ad #${adId} with executor ${executor}...`);
try {
  hash = await wallet.writeContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'moderateAd',
    args: [adId, executor],
    gas: 6_000_000n,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  const ad = await publicClient.readContract({ address: AD_FIREWALL, abi: adFirewallAbi, functionName: 'getAd', args: [adId] });
  console.log(`result: ${STATUS_LABELS[ad.status]}`);
  console.log(`verdict: ${ad.verdict}`);
} catch (e) {
  const err = e as { details?: string; shortMessage?: string; message?: string };
  console.error('SUBMIT FAILED:', err.details || err.shortMessage || err.message);
}
