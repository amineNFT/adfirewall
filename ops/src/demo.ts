import { formatEther } from 'viem';
import { getWalletClient, publicClient, AD_FIREWALL, RITUAL_WALLET } from './chain.js';
import { adFirewallAbi, ritualWalletAbi, STATUS_LABELS } from './abis.js';
import { pickLLMExecutor } from './executor.js';

/**
 * End-to-end demo against a deployed AdFirewall:
 *   1. The signer acts as a publisher and sets a policy.
 *   2. Submits two ads targeting itself (one clean, one gambling).
 *   3. Runs on-chain AI moderation on both.
 *   4. Prints verdicts.
 *
 * Requires AD_FIREWALL_ADDRESS + a PRIVATE_KEY funded in RitualWallet.
 */
if (AD_FIREWALL === '0x0000000000000000000000000000000000000000') {
  throw new Error('Set AD_FIREWALL_ADDRESS in .env');
}

// Banned: gambling, casino, adult, scams, political, phishing
const BANNED = (1n << 0n) | (1n << 1n) | (1n << 2n) | (1n << 3n) | (1n << 4n) | (1n << 5n);

const wallet = getWalletClient();
const site = wallet.account.address;

const bal = await publicClient.readContract({
  address: RITUAL_WALLET,
  abi: ritualWalletAbi,
  functionName: 'balanceOf',
  args: [site],
});
console.log(`Signer RitualWallet balance: ${formatEther(bal)} RITUAL`);

console.log('1) Setting publisher policy...');
let hash = await wallet.writeContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'setPolicy',
  args: [BANNED, 'no crypto airdrops, no get-rich-quick schemes'],
});
await publicClient.waitForTransactionReceipt({ hash });

const ads = [
  {
    headline: 'EcoBottle — reusable water bottle',
    body: 'BPA-free, keeps drinks cold 24h. Free shipping this week.',
    image: 'https://example.com/bottle.png',
    landing: 'https://ecobottle.example',
  },
  {
    headline: 'Win $10,000 at LuckySpin Casino!',
    body: 'Deposit now, spin the roulette and double your money instantly. Bet big!',
    image: 'https://example.com/casino.png',
    landing: 'https://luckyspin.example',
  },
];

const ids: bigint[] = [];
for (const ad of ads) {
  console.log(`2) Submitting ad "${ad.headline}"...`);
  hash = await wallet.writeContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'submitAd',
    args: [site, ad.headline, ad.body, ad.image, ad.landing],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const count = await publicClient.readContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'adCount',
  });
  ids.push(count);
  void receipt;
}

const executor = await pickLLMExecutor();
console.log(`3) Moderating with executor ${executor}...`);

for (const id of ids) {
  console.log(`   moderating ad #${id}...`);
  hash = await wallet.writeContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'moderateAd',
    args: [id, executor],
    gas: 6_000_000n,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  const ad = await publicClient.readContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'getAd',
    args: [id],
  });
  console.log(`   ad #${id} "${ad.headline}" -> ${STATUS_LABELS[ad.status]}`);
  console.log(`      verdict: ${ad.verdict}`);
}

console.log('Demo complete.');
