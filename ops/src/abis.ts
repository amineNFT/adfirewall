// Minimal ABIs used by ops scripts.

export const ritualWalletAbi = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [{ name: 'lockDuration', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const teeRegistryAbi = [
  {
    type: 'function',
    name: 'getServicesByCapability',
    stateMutability: 'view',
    inputs: [
      { name: 'capability', type: 'uint8' },
      { name: 'checkValidity', type: 'bool' },
    ],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          {
            name: 'node',
            type: 'tuple',
            components: [
              { name: 'paymentAddress', type: 'address' },
              { name: 'teeAddress', type: 'address' },
              { name: 'teeType', type: 'uint8' },
              { name: 'publicKey', type: 'bytes' },
              { name: 'endpoint', type: 'string' },
              { name: 'certPubKeyHash', type: 'bytes32' },
              { name: 'capability', type: 'uint8' },
            ],
          },
          { name: 'isValid', type: 'bool' },
          { name: 'workloadId', type: 'bytes32' },
        ],
      },
    ],
  },
] as const;

// AdFirewall — subset needed by ops.
export const adFirewallAbi = [
  {
    type: 'function',
    name: 'setPolicy',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'bannedCategories', type: 'uint256' },
      { name: 'customRules', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'submitAd',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'site', type: 'address' },
      { name: 'headline', type: 'string' },
      { name: 'body', type: 'string' },
      { name: 'imageUrl', type: 'string' },
      { name: 'landingUrl', type: 'string' },
    ],
    outputs: [{ name: 'adId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'moderateAd',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'adId', type: 'uint256' },
      { name: 'executor', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'adCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getAd',
    stateMutability: 'view',
    inputs: [{ name: 'adId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'advertiser', type: 'address' },
          { name: 'site', type: 'address' },
          { name: 'headline', type: 'string' },
          { name: 'body', type: 'string' },
          { name: 'imageUrl', type: 'string' },
          { name: 'landingUrl', type: 'string' },
          { name: 'status', type: 'uint8' },
          { name: 'verdict', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'moderatedAt', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

export const STATUS_LABELS = ['None', 'Pending', 'Approved', 'Rejected'] as const;
