import { decodeAbiParameters, encodeAbiParameters, keccak256, parseAbiParameters, toHex } from 'viem';
import type { Hex } from 'viem';
import { getWalletClient, publicClient } from './chain.js';
import { pickLLMExecutor } from './executor.js';

/**
 * Minimal direct LLM precompile (0x0802) call — no AdFirewall involved.
 * Isolates whether the TEE executor itself can serve inference.
 */
const LLM = '0x0000000000000000000000000000000000000802' as const;
const PRECOMPILE_CALLED_TOPIC = keccak256(toHex('PrecompileCalled(address,bytes,bytes)'));

const wallet = getWalletClient();
const executor = await pickLLMExecutor();
console.log('executor:', executor);

const messages = JSON.stringify([{ role: 'user', content: 'Reply with the single word: OK' }]);

const input = encodeAbiParameters(
  parseAbiParameters(
    [
      'address, bytes[], uint256, bytes[], bytes,',
      'string, string, int256, string, bool, int256, string, string,',
      'uint256, bool, int256, string, bytes, int256, string, string, bool,',
      'int256, bytes, bytes, int256, int256, string, bool,',
      '(string,string,string)',
    ].join(''),
  ),
  [
    executor,
    [],
    300n,
    [],
    '0x',
    messages,
    'zai-org/GLM-4.7-FP8',
    0n, '', false, 4096n, '', '',
    1n, true, 0n, 'medium', '0x', -1n, 'auto', '',
    false,
    100n, '0x', '0x', -1n, 1000n, '',
    false,
    ['', '', ''],
  ],
);

console.log('submitting direct LLM call...');
const hash = await wallet.sendTransaction({ to: LLM, data: input, gas: 3_000_000n });
console.log('tx:', hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log('receipt status:', receipt.status);

// Extract settled result from the PrecompileCalled event.
let resultHex: Hex | null = null;
for (const log of receipt.logs) {
  if (log.topics[0] !== PRECOMPILE_CALLED_TOPIC) continue;
  const [addr, , output] = decodeAbiParameters(parseAbiParameters('address, bytes, bytes'), log.data);
  if ((addr as string).toLowerCase() !== LLM) continue;
  try {
    const [, actual] = decodeAbiParameters(parseAbiParameters('bytes, bytes'), output as Hex);
    resultHex = actual as Hex;
  } catch {
    resultHex = output as Hex;
  }
}

if (!resultHex) {
  console.log('No settled result in receipt yet (still in commitment phase?).');
  process.exit(0);
}

const [hasError, completionData, , errorMessage] = decodeAbiParameters(
  parseAbiParameters('bool, bytes, bytes, string, (string,string,string)'),
  resultHex,
);

console.log('hasError:', hasError);
if (hasError) {
  console.log('errorMessage:', errorMessage);
} else {
  const [, , , , , , choicesCount, choicesData] = decodeAbiParameters(
    parseAbiParameters('string, string, uint256, string, string, string, uint256, bytes[], bytes'),
    completionData as Hex,
  );
  if ((choicesCount as bigint) > 0n && (choicesData as Hex[]).length > 0) {
    const [, , messageData] = decodeAbiParameters(parseAbiParameters('uint256, string, bytes'), (choicesData as Hex[])[0]);
    const [, content] = decodeAbiParameters(parseAbiParameters('string, string, string, uint256, bytes[]'), messageData as Hex);
    console.log('content:', content);
  }
}
