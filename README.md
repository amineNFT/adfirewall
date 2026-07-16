# Ad Firewall

A decentralized AI ad filter built on **Ritual Chain**. Website owners define ad-safety
rules (no gambling, casino, adult content, scams, political ads, phishing, and more).
Advertisers submit ads. **Ritual's on-chain LLM precompile analyzes each ad inside a TEE
and returns a verdict.** Websites only display ads that pass their policy.

The AI decision is made *on-chain*: the `AdFirewall` contract builds a prompt from the
publisher's policy + the ad content and calls the Ritual LLM precompile (`0x0802`). The
model's verdict is decoded and recorded on-chain — no off-chain oracle, no trusted backend.

```
Publisher ──setPolicy──▶ ┌─────────────┐         ┌──────────────────┐
                         │  AdFirewall │──0x0802─▶│ LLM in TEE       │
Advertiser ──submitAd──▶ │  (on-chain) │◀────────│ (GLM-4.7-FP8)    │
                         └─────────────┘ verdict  └──────────────────┘
Website ──getApprovedAdsForSite──▶ only PASS ads render
```

## How it works on Ritual

- **On-chain AI** via the short-running async LLM precompile `0x0802`. The block builder
  simulates the tx, a TEE executor runs inference, and the tx is replayed with the settled
  output injected — so the precompile "returns" the verdict to the contract in the same tx.
- **Model** is pinned to `zai-org/GLM-4.7-FP8` (`maxTokens ≥ 4096`, `ttl = 300` blocks).
- **Executor** is selected from `TEEServiceRegistry` (LLM capability = 1) — never hardcoded.
- **Fees** are paid from `RitualWallet`; the EOA that triggers moderation must deposit and
  hold an active time-lock covering the settlement window.
- **Fail-closed safety:** if the model errors or returns an inconclusive verdict, the ad is
  marked `Errored` / `Rejected` and never displayed. Ad safety never fails open.

Chain reference: ID `1979`, RPC `https://rpc.ritualfoundation.org`, explorer
`https://explorer.ritualfoundation.org`, faucet `https://faucet.ritualfoundation.org`.

## Layout

```
adfirewall/
├── contracts/   Foundry — AdFirewall.sol, LLMLib.sol, tests, deploy script
├── ops/         TypeScript + viem — executor discovery, RitualWallet funding, keeper, diagnostics
└── frontend/    Next.js + wagmi — publisher / advertiser / moderation / ad-slot UI
```

## Contracts (`contracts/`)

`AdFirewall.sol`
- `setPolicy(bannedCategories, customRules)` — a publisher defines a policy. `bannedCategories`
  is a bitmask over 12 categories; `customRules` is free text.
- `submitAd(site, headline, body, imageUrl, landingUrl)` — an advertiser submits an ad
  targeting a publisher `site`. Starts `Pending`.
- `moderateAd(adId, executor)` — runs on-chain AI moderation and records the verdict.
- Views: `getAd`, `getPolicy`, `getAdsForSite(site, filter)`, `getApprovedAdsForSite(site)`.

Category bits: `0 gambling · 1 casino · 2 adult · 3 scam · 4 political · 5 phishing ·
6 alcohol · 7 drugs · 8 weapons · 9 hate · 10 malware · 11 misinformation`.

### Build, test, deploy

```bash
cd contracts
forge build
forge test -vv                       # precompile mocked with vm.mockCall

cp .env.example .env                 # set PRIVATE_KEY (funded via faucet)
forge script script/Deploy.s.sol:DeployScript --rpc-url https://rpc.ritualfoundation.org --broadcast -vvvv
```

The LLM encode uses the full 30-field ABI, so `via_ir = true` is enabled in `foundry.toml`.

## Ops (`ops/`)

```bash
cd ops
npm install
cp .env.example .env                 # PRIVATE_KEY + AD_FIREWALL_ADDRESS

npm run executors    # list valid LLM executors from the registry
npm run deposit -- 0.5   # deposit + lock RITUAL for fees (a positive value is required to arm the lock)
npm run health       # submit a test ad + moderate it, report if the LLM executor is serving
npm run keeper       # auto-moderate every Pending ad
npm run demo         # end-to-end: policy → ads → moderation → verdicts
```

RitualWallet note: async moderation needs both a balance **and** an active time-lock covering
`commit_block + ttl`. A lock is only created by `deposit(lockDuration)` with a positive value.

## Frontend (`frontend/`)

```bash
cd frontend
npm install
cp .env.local.example .env.local     # NEXT_PUBLIC_AD_FIREWALL_ADDRESS + PRIVATE_KEY (server relayer)
npm run dev                          # http://localhost:3000
```

Tabs: **Publisher** (define policy), **Advertiser** (submit ads), **Moderation** (run on-chain
AI verdicts via a server relayer), **Ad Slots** (renders only firewall-approved ads).

Moderation is submitted by a server-side relayer (`/api/moderate`) because browser wallets
cannot simulate async-precompile transactions. The relayer key must hold a locked RitualWallet
balance.

## Security notes

- Moderation is fail-closed: executor errors or unclear verdicts result in blocking.
- All ad content is escaped before being embedded in the JSON prompt.
- Never commit `.env` files — only `.env.example` templates are included here.
