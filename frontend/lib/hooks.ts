'use client';

import { useReadContract } from 'wagmi';
import { AD_FIREWALL, Capability, RITUAL_WALLET, TEE_SERVICE_REGISTRY } from './chain';
import { ritualWalletAbi, teeRegistryAbi } from './abi';

export function useConfigured() {
  return AD_FIREWALL !== '0x0000000000000000000000000000000000000000';
}

/** Discover a valid LLM executor from the TEEServiceRegistry. */
export function useLLMExecutor() {
  const { data, isLoading, error } = useReadContract({
    address: TEE_SERVICE_REGISTRY,
    abi: teeRegistryAbi,
    functionName: 'getServicesByCapability',
    args: [Capability.LLM, true],
  });

  const valid = (data ?? []).filter((s) => s.isValid && s.node.teeAddress);
  const executor = valid.length > 0 ? valid[0].node.teeAddress : undefined;

  return { executor, count: valid.length, isLoading, error };
}

/** RitualWallet fee balance for the signing EOA. */
export function useWalletBalance(account?: `0x${string}`) {
  return useReadContract({
    address: RITUAL_WALLET,
    abi: ritualWalletAbi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: !!account, refetchInterval: 8000 },
  });
}

import { adFirewallAbi } from './abi';
import type { AdView } from '@/components/AdCard';

/** All ads for a site (filter 0 = None = all). */
export function useSiteAds(site?: `0x${string}`, enabled = true) {
  const q = useReadContract({
    address: AD_FIREWALL,
    abi: adFirewallAbi,
    functionName: 'getAdsForSite',
    args: site ? [site, 0] : undefined,
    query: { enabled: enabled && !!site, refetchInterval: 6000 },
  });
  return { ...q, ads: (q.data ?? []) as unknown as AdView[] };
}
