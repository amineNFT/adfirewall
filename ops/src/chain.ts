import 'dotenv/config';
import { createPublicClient, createWalletClient, defineChain, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const RITUAL_RPC_URL = process.env.RITUAL_RPC_URL || 'https://rpc.ritualfoundation.org';

export const ritualChain = defineChain({
  id: 1979,
  name: 'Ritual',
  nativeCurrency: { name: 'Ritual', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: {
    default: {
      http: [RITUAL_RPC_URL],
      webSocket: [process.env.RITUAL_WS_URL || 'wss://rpc.ritualfoundation.org/ws'],
    },
  },
  blockExplorers: {
    default: { name: 'Ritual Explorer', url: 'https://explorer.ritualfoundation.org' },
  },
});

export const publicClient = createPublicClient({ chain: ritualChain, transport: http() });

export function getWalletClient() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY is not set in .env');
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({ account, chain: ritualChain, transport: http() });
}

// System + contract addresses
export const RITUAL_WALLET = '0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948' as const;
export const TEE_SERVICE_REGISTRY = '0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F' as const;

export const AD_FIREWALL = (process.env.AD_FIREWALL_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

// TEE capability codes
export const Capability = { HTTP_CALL: 0, LLM: 1 } as const;
