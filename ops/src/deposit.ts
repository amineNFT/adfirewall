import { formatEther, parseEther } from 'viem';
import { getWalletClient, publicClient, RITUAL_WALLET } from './chain.js';
import { ritualWalletAbi } from './abis.js';

/**
 * Deposit RITUAL into RitualWallet for the signing EOA. Async LLM settlement
 * fees are charged against the signing EOA, so whoever triggers moderation
 * must have a deposit here.
 *
 * Usage: npm run deposit -- <amountInRitual> [lockDurationBlocks]
 * Default: 0.5 RITUAL, lock 100000 blocks (~generous for dev).
 */
const amount = process.argv[2] ? process.argv[2] : '0.5';
const lock = process.argv[3] ? BigInt(process.argv[3]) : 100_000n;

// RitualWallet.deposit reverts (0xf4d678b8) on a 0 value — you cannot arm the
// lock without depositing something. Require a small positive amount.
if (Number(amount) <= 0) {
  throw new Error(
    'Deposit amount must be > 0. RitualWallet cannot set a lock with a 0-value deposit — ' +
      'use e.g. `npm run deposit -- 0.2`.',
  );
}

const wallet = getWalletClient();
const account = wallet.account.address;

const before = await publicClient.readContract({
  address: RITUAL_WALLET,
  abi: ritualWalletAbi,
  functionName: 'balanceOf',
  args: [account],
});
console.log(`RitualWallet balance before: ${formatEther(before)} RITUAL`);

const hash = await wallet.writeContract({
  address: RITUAL_WALLET,
  abi: ritualWalletAbi,
  functionName: 'deposit',
  args: [lock],
  value: parseEther(amount),
});
console.log(`Deposit tx: ${hash}`);
await publicClient.waitForTransactionReceipt({ hash });

const after = await publicClient.readContract({
  address: RITUAL_WALLET,
  abi: ritualWalletAbi,
  functionName: 'balanceOf',
  args: [account],
});
console.log(`RitualWallet balance after:  ${formatEther(after)} RITUAL`);
