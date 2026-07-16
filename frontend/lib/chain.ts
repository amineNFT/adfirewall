import { defineChain } from 'viem';

const RPC = process.env.NEXT_PUBLIC_RITUAL_RPC_URL || 'https://rpc.ritualfoundation.org';

export const ritualChain = defineChain({
  id: 1979,
  name: 'Ritual',
  nativeCurrency: { name: 'Ritual', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC] },
  },
  blockExplorers: {
    default: { name: 'Ritual Explorer', url: 'https://explorer.ritualfoundation.org' },
  },
});

// System contracts (fixed across Ritual deployments).
export const RITUAL_WALLET = '0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948' as const;
export const TEE_SERVICE_REGISTRY = '0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F' as const;

// Deployed AdFirewall (from env — never hardcode deployment-specific addresses).
export const AD_FIREWALL = (process.env.NEXT_PUBLIC_AD_FIREWALL_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const EXPLORER = 'https://explorer.ritualfoundation.org';

export const Capability = { HTTP_CALL: 0, LLM: 1 } as const;
