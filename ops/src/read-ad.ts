import { publicClient, AD_FIREWALL } from './chain.js';
import { adFirewallAbi, STATUS_LABELS } from './abis.js';

const adId = BigInt(process.argv[2] ?? '1');
const ad = await publicClient.readContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'getAd',
  args: [adId],
});
console.log(`ad #${adId}: "${ad.headline}"`);
console.log(`status: ${STATUS_LABELS[ad.status]}`);
console.log(`verdict: ${ad.verdict}`);
