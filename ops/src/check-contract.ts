import { publicClient, AD_FIREWALL } from './chain.js';
import { adFirewallAbi } from './abis.js';

console.log('Checking AD_FIREWALL_ADDRESS =', AD_FIREWALL);

const code = await publicClient.getCode({ address: AD_FIREWALL });
console.log('has bytecode:', !!code && code !== '0x', `(len ${code ? code.length : 0})`);

// Try AdFirewall view functions. If these revert, it's not an AdFirewall contract.
try {
  const count = await publicClient.readContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'adCount',
  });
  console.log('adCount() =>', count.toString(), '  ✓ looks like AdFirewall');
} catch (e) {
  console.log('adCount() REVERTED — this is NOT an AdFirewall contract at this address.');
}

// Also probe an owner() view (present on AdFirewall) via raw ABI.
try {
  const owner = await publicClient.readContract({
    address: AD_FIREWALL,
    abi: [{ type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }] as const,
    functionName: 'owner',
  });
  console.log('owner() =>', owner);
} catch {
  console.log('owner() reverted / absent.');
}

// Probe leaderboard signature to detect a mixup.
try {
  const total = await publicClient.readContract({
    address: AD_FIREWALL,
    abi: [{ type: 'function', name: 'totalSubmissions', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }] as const,
    functionName: 'totalSubmissions',
  });
  console.log('totalSubmissions() =>', total.toString(), '  ⚠ this address is the LEADERBOARD, not AdFirewall!');
} catch {
  console.log('totalSubmissions() absent (good — not the leaderboard).');
}
