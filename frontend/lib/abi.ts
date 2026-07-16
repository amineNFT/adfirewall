// AdFirewall ABI (generated from the compiled Foundry artifact).
export const adFirewallAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'adCount', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  {
    type: 'function',
    name: 'getAd',
    inputs: [{ name: 'adId', type: 'uint256' }],
    outputs: [
      {
        name: '',
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
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAdIdsForSite',
    inputs: [{ name: 'site', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAdsForSite',
    inputs: [
      { name: 'site', type: 'address' },
      { name: 'filter', type: 'uint8' },
    ],
    outputs: [
      {
        name: 'result',
        type: 'tuple[]',
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
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPolicy',
    inputs: [{ name: 'site', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'exists', type: 'bool' },
          { name: 'bannedCategories', type: 'uint256' },
          { name: 'customRules', type: 'string' },
          { name: 'updatedAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'moderateAd',
    inputs: [
      { name: 'adId', type: 'uint256' },
      { name: 'executor', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setPolicy',
    inputs: [
      { name: 'bannedCategories', type: 'uint256' },
      { name: 'customRules', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitAd',
    inputs: [
      { name: 'site', type: 'address' },
      { name: 'headline', type: 'string' },
      { name: 'body', type: 'string' },
      { name: 'imageUrl', type: 'string' },
      { name: 'landingUrl', type: 'string' },
    ],
    outputs: [{ name: 'adId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'AdModerated',
    inputs: [
      { name: 'adId', type: 'uint256', indexed: true },
      { name: 'site', type: 'address', indexed: true },
      { name: 'status', type: 'uint8', indexed: false },
      { name: 'verdict', type: 'string', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'AdSubmitted',
    inputs: [
      { name: 'adId', type: 'uint256', indexed: true },
      { name: 'advertiser', type: 'address', indexed: true },
      { name: 'site', type: 'address', indexed: true },
    ],
    anonymous: false,
  },
] as const;

// RitualWallet — deposit fees for the signing EOA.
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

// TEEServiceRegistry — discover LLM executors.
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
