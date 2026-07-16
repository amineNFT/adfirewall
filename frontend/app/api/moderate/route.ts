import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, encodeFunctionData, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AD_FIREWALL, Capability, ritualChain, TEE_SERVICE_REGISTRY } from '@/lib/chain';
import { adFirewallAbi, teeRegistryAbi } from '@/lib/abi';

// viem + a private key must run on the Node.js runtime, not the edge.
export const runtime = 'nodejs';

/**
 * Server-side moderation relayer.
 *
 * moderateAd() internally calls the async LLM precompile (0x0802). Browser
 * wallets cannot simulate async-precompile transactions (eth_estimateGas
 * reverts), so they disable "Confirm". We submit the tx here with a server
 * key and an explicit gas limit — no wallet simulation involved.
 *
 * SECURITY: this endpoint spends the server key's RitualWallet balance and is
 * unauthenticated. For production, add auth / rate limiting and restrict who
 * can trigger moderation.
 */
export async function POST(req: Request) {
  try {
    const { adId } = await req.json();
    if (adId === undefined || adId === null) {
      return NextResponse.json({ error: 'adId is required' }, { status: 400 });
    }
    if (AD_FIREWALL === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'AdFirewall address not configured' }, { status: 500 });
    }

    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
      return NextResponse.json(
        { error: 'Server PRIVATE_KEY not set. Add it to frontend/.env.local (server-only).' },
        { status: 500 },
      );
    }

    const account = privateKeyToAccount(pk as `0x${string}`);
    const publicClient = createPublicClient({ chain: ritualChain, transport: http() });
    const walletClient = createWalletClient({ account, chain: ritualChain, transport: http() });

    // Pick a valid LLM executor from the registry (server-side).
    const services = await publicClient.readContract({
      address: TEE_SERVICE_REGISTRY,
      abi: teeRegistryAbi,
      functionName: 'getServicesByCapability',
      args: [Capability.LLM, true],
    });
    const valid = services.filter((s) => s.isValid && s.node.teeAddress);
    if (valid.length === 0) {
      return NextResponse.json({ error: 'No LLM executor available in TEEServiceRegistry' }, { status: 503 });
    }
    const executor = valid[0].node.teeAddress;

    const data = encodeFunctionData({
      abi: adFirewallAbi,
      functionName: 'moderateAd',
      args: [BigInt(adId), executor],
    });

    // Explicit gas — never estimate for async precompile calls.
    const hash = await walletClient.sendTransaction({ to: AD_FIREWALL, data, gas: 6_000_000n });
    await publicClient.waitForTransactionReceipt({ hash });

    const ad = await publicClient.readContract({
      address: AD_FIREWALL,
      abi: adFirewallAbi,
      functionName: 'getAd',
      args: [BigInt(adId)],
    });

    return NextResponse.json({
      hash,
      status: Number(ad.status),
      verdict: ad.verdict,
      executor,
    });
  } catch (e) {
    // Surface the full error so RPC-level details (e.g. "invalid async payload")
    // are visible instead of viem's generic wrapper message.
    const err = e as {
      shortMessage?: string;
      details?: string;
      message?: string;
      cause?: { message?: string; data?: unknown };
    };
    console.error('[moderate] error:', e);
    const detail =
      err.details || err.cause?.message || err.shortMessage || err.message || 'unknown error';
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
