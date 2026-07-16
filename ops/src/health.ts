import { getWalletClient, publicClient, AD_FIREWALL } from './chain.js';
import { adFirewallAbi, STATUS_LABELS } from './abis.js';
import { pickLLMExecutor } from './executor.js';

/**
 * LLM executor health check. Submits a neutral test ad, moderates it with the
 * current LLM executor, and reports whether inference actually ran.
 *
 * Usage: npm run health
 */
if (AD_FIREWALL === '0x0000000000000000000000000000000000000000') throw new Error('Set AD_FIREWALL_ADDRESS');

const wallet = getWalletClient();
const site = wallet.account.address;
const executor = await pickLLMExecutor();
console.log('LLM executor:', executor);

const BANNED = (1n << 0n) | (1n << 1n) | (1n << 2n) | (1n << 3n) | (1n << 4n) | (1n << 5n);
let hash = await wallet.writeContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'setPolicy',
  args: [BANNED, ''],
});
await publicClient.waitForTransactionReceipt({ hash });

hash = await wallet.writeContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'submitAd',
  args: [site, 'Health check', 'A neutral safe advertisement.', '', 'https://example.test'],
});
await publicClient.waitForTransactionReceipt({ hash });
const adId = await publicClient.readContract({ address: AD_FIREWALL, abi: adFirewallAbi, functionName: 'adCount' });

console.log(`moderating test ad #${adId}...`);
hash = await wallet.writeContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'moderateAd',
  args: [adId, executor],
  gas: 6_000_000n,
});
await publicClient.waitForTransactionReceipt({ hash });

const ad = await publicClient.readContract({ address: AD_FIREWALL, abi: adFirewallAbi, functionName: 'getAd', args: [adId] });
const verdict = ad.verdict.toLowerCase();

if (verdict.includes('failed to get vllm client') || verdict.includes('moderation error')) {
  console.log('\n❌ LLM EXECUTOR DOWN — inference did not run.');
  console.log(`   ${ad.verdict}`);
} else {
  console.log('\n✅ LLM EXECUTOR HEALTHY — real verdict returned.');
  console.log(`   status: ${STATUS_LABELS[ad.status]}`);
  console.log(`   verdict: ${ad.verdict}`);
}
