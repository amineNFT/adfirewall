import { formatEther } from 'viem';
import { getWalletClient, publicClient, AD_FIREWALL, RITUAL_WALLET } from './chain.js';
import { adFirewallAbi, ritualWalletAbi, STATUS_LABELS } from './abis.js';
import { pickLLMExecutor } from './executor.js';

/**
 * Auto-moderation keeper: scans all ads, and runs on-chain AI moderation for
 * every Pending ad. Runs sequentially because each moderation is a short-running
 * async precompile call (one async commit per sender per block).
 *
 * Requires: AD_FIREWALL_ADDRESS set, PRIVATE_KEY funded in RitualWallet.
 */
if (AD_FIREWALL === '0x0000000000000000000000000000000000000000') {
  throw new Error('Set AD_FIREWALL_ADDRESS in .env');
}

const wallet = getWalletClient();
const keeper = wallet.account.address;

const bal = await publicClient.readContract({
  address: RITUAL_WALLET,
  abi: ritualWalletAbi,
  functionName: 'balanceOf',
  args: [keeper],
});
console.log(`Keeper ${keeper} RitualWallet balance: ${formatEther(bal)} RITUAL`);
if (bal === 0n) {
  console.warn('Warning: RitualWallet balance is 0. Run `npm run deposit` first, or moderation will revert.');
}

const executor = await pickLLMExecutor();
console.log(`Using LLM executor: ${executor}`);

const count = await publicClient.readContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'adCount',
});
console.log(`Total ads: ${count}`);

for (let id = 1n; id <= count; id++) {
  const ad = await publicClient.readContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'getAd',
    args: [id],
  });

  if (ad.status !== 1) {
    console.log(`Ad #${id} "${ad.headline}" -> ${STATUS_LABELS[ad.status]} (skip)`);
    continue;
  }

  console.log(`Ad #${id} "${ad.headline}" -> moderating...`);
  try {
    const hash = await wallet.writeContract({
      address: AD_FIREWALL,
      abi: adFirewallAbi,
      functionName: 'moderateAd',
      args: [id, executor],
      gas: 6_000_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    const updated = await publicClient.readContract({
      address: AD_FIREWALL,
      abi: adFirewallAbi,
      functionName: 'getAd',
      args: [id],
    });
    console.log(`  -> ${STATUS_LABELS[updated.status]}: ${updated.verdict.slice(0, 160)}`);
  } catch (err) {
    console.error(`  -> failed:`, (err as Error).message.split('\n')[0]);
  }
}

console.log('Keeper run complete.');
