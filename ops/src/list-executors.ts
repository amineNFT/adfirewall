import { publicClient, TEE_SERVICE_REGISTRY, Capability } from './chain.js';
import { teeRegistryAbi } from './abis.js';

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

async function listCapability(name: string, cap: number) {
  const services = await publicClient.readContract({
    address: TEE_SERVICE_REGISTRY,
    abi: teeRegistryAbi,
    functionName: 'getServicesByCapability',
    args: [cap, false],
  });
  const valid = services.filter((s) => s.isValid);
  console.log(`\n=== ${name} (capability ${cap}) — ${services.length} total, ${valid.length} valid ===`);
  for (const s of services) {
    const hasCert = s.node.certPubKeyHash && s.node.certPubKeyHash !== ZERO_HASH;
    console.log(
      `  tee=${s.node.teeAddress} valid=${s.isValid} cert=${hasCert ? 'yes' : 'MISSING'} endpoint=${s.node.endpoint || '(none)'}`,
    );
  }
}

// LLM = 1 is what our dapp uses; also show related capabilities for context.
await listCapability('LLM', Capability.LLM);
await listCapability('STREAMING', 3);
await listCapability('VLLM_PROXY', 4);
