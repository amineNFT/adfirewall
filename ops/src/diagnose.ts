import { encodeFunctionData } from 'viem';
import { getWalletClient, publicClient, AD_FIREWALL } from './chain.js';
import { adFirewallAbi, STATUS_LABELS } from './abis.js';
import { pickLLMExecutor } from './executor.js';

/**
 * Diagnose why moderateAd is rejected. Prints the FULL RPC error and every
 * relevant precondition. Usage: npm run diagnose [adId]
 */
if (AD_FIREWALL === '0x0000000000000000000000000000000000000000') {
  throw new Error('Set AD_FIREWALL_ADDRESS in ops/.env');
}

const wallet = getWalletClient();
console.log('signer:', wallet.account.address);
console.log('AdFirewall:', AD_FIREWALL);

// 1) Is the contract actually deployed at this address?
const code = await publicClient.getCode({ address: AD_FIREWALL });
console.log('contract bytecode present:', !!code && code !== '0x', `(len ${code ? code.length : 0})`);
if (!code || code === '0x') {
  throw new Error('No contract at AD_FIREWALL_ADDRESS — wrong/old address or not deployed.');
}

// 2) Pending job on this sender? (async sender lock)
try {
  const tracker = '0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5' as const;
  const pending = await publicClient.readContract({
    address: tracker,
    abi: [
      {
        type: 'function',
        name: 'hasPendingJobForSender',
        stateMutability: 'view',
        inputs: [{ name: 'sender', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
      },
    ] as const,
    functionName: 'hasPendingJobForSender',
    args: [wallet.account.address],
  });
  console.log('sender has pending async job (locked):', pending);
} catch {
  console.log('sender lock check: unavailable');
}

// 3) Pick an executor
const executor = await pickLLMExecutor();
console.log('executor:', executor);

// 4) Choose an ad
const adId = process.argv[2] ? BigInt(process.argv[2]) : 1n;
const ad = await publicClient.readContract({
  address: AD_FIREWALL,
  abi: adFirewallAbi,
  functionName: 'getAd',
  args: [adId],
});
console.log(`ad #${adId}: "${ad.headline}" status=${STATUS_LABELS[ad.status]}`);

// 5) Attempt the tx and print the FULL error surface
const data = encodeFunctionData({
  abi: adFirewallAbi,
  functionName: 'moderateAd',
  args: [adId, executor],
});
console.log('calldata bytes:', (data.length - 2) / 2);

try {
  const hash = await wallet.sendTransaction({ to: AD_FIREWALL, data, gas: 6_000_000n });
  console.log('SUBMITTED OK. tx:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('receipt status:', receipt.status);
} catch (e) {
  const err = e as Record<string, unknown>;
  console.error('\n=== FULL ERROR ===');
  console.error('name:', err.name);
  console.error('shortMessage:', err.shortMessage);
  console.error('details:', err.details);
  console.error('metaMessages:', err.metaMessages);
  console.error('cause:', (err.cause as { message?: string })?.message);
  console.error('==================\n');
}
