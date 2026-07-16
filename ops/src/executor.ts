import { publicClient, TEE_SERVICE_REGISTRY, Capability } from './chain.js';
import { teeRegistryAbi } from './abis.js';

/**
 * Fetch a valid LLM-capable TEE executor from the TEEServiceRegistry.
 * We use only the teeAddress; do not use the registry endpoint field for this flow.
 */
export async function pickLLMExecutor(): Promise<`0x${string}`> {
  const services = await publicClient.readContract({
    address: TEE_SERVICE_REGISTRY,
    abi: teeRegistryAbi,
    functionName: 'getServicesByCapability',
    args: [Capability.LLM, true],
  });

  const valid = services.filter((s) => s.isValid && s.node.teeAddress);
  if (valid.length === 0) {
    throw new Error('No valid LLM executors found in TEEServiceRegistry');
  }
  // Simple selection: first valid executor. Rotate/randomize in production.
  return valid[0].node.teeAddress;
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const services = await publicClient.readContract({
    address: TEE_SERVICE_REGISTRY,
    abi: teeRegistryAbi,
    functionName: 'getServicesByCapability',
    args: [Capability.LLM, true],
  });
  const valid = services.filter((s) => s.isValid);
  console.log(`Found ${services.length} LLM services (${valid.length} valid).`);
  for (const s of valid) {
    console.log(`  teeAddress=${s.node.teeAddress} payment=${s.node.paymentAddress}`);
  }
  if (valid.length > 0) {
    console.log(`\nRecommended executor: ${valid[0].node.teeAddress}`);
  }
}
