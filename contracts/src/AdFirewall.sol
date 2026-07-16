// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LLMLib} from "./LLMLib.sol";

/// @title AdFirewall
/// @notice A decentralized AI ad filter on Ritual Chain.
///         - Publishers (website owners) define ad-safety policies.
///         - Advertisers submit ads targeting a publisher.
///         - Anyone can trigger on-chain AI moderation: the ad + the publisher's
///           policy are sent to the Ritual LLM precompile (0x0802), which runs
///           inference inside a TEE and returns a verdict. The contract records
///           whether the ad PASSES or FAILS the policy.
///         - Websites only display ads whose status is Approved for their policy.
contract AdFirewall {
    using LLMLib for *;

    // ---------------------------------------------------------------------
    // Policy categories (bitmask)
    // ---------------------------------------------------------------------
    uint256 internal constant CAT_GAMBLING = 1 << 0;
    uint256 internal constant CAT_CASINO = 1 << 1;
    uint256 internal constant CAT_ADULT = 1 << 2;
    uint256 internal constant CAT_SCAM = 1 << 3;
    uint256 internal constant CAT_POLITICAL = 1 << 4;
    uint256 internal constant CAT_PHISHING = 1 << 5;
    uint256 internal constant CAT_ALCOHOL = 1 << 6;
    uint256 internal constant CAT_DRUGS = 1 << 7;
    uint256 internal constant CAT_WEAPONS = 1 << 8;
    uint256 internal constant CAT_HATE = 1 << 9;
    uint256 internal constant CAT_MALWARE = 1 << 10;
    uint256 internal constant CAT_MISINFO = 1 << 11;
    uint256 internal constant CAT_COUNT = 12;

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------
    enum Status {
        None,
        Pending,
        Approved,
        Rejected,
        Errored // executor/model failure — retryable, never displayed (fail-closed)
    }

    struct Policy {
        bool exists;
        uint256 bannedCategories; // bitmask of CAT_*
        string customRules; // freeform extra rules
        uint256 updatedAt;
    }

    struct Ad {
        uint256 id;
        address advertiser;
        address site; // publisher this ad targets
        string headline;
        string body;
        string imageUrl;
        string landingUrl;
        Status status;
        string verdict; // raw model reasoning / reason
        uint256 createdAt;
        uint256 moderatedAt;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------
    mapping(address => Policy) public policies; // site => policy
    mapping(uint256 => Ad) private ads; // adId => ad
    mapping(address => uint256[]) private siteAdIds; // site => adIds
    uint256 public adCount;

    // Moderation tuning (blocks / tokens). Adjustable by contract deployer.
    address public immutable owner;
    uint256 public ttl = 300; // async commitment window (blocks)
    int256 public maxTokens = 4096; // GLM-4.7-FP8 is a reasoning model
    int256 public temperature = 100; // 0.1 — deterministic-ish classification

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event PolicySet(address indexed site, uint256 bannedCategories, string customRules, uint256 updatedAt);
    event AdSubmitted(uint256 indexed adId, address indexed advertiser, address indexed site);
    event AdModerated(uint256 indexed adId, address indexed site, Status status, string verdict);

    error PolicyNotFound(address site);
    error AdNotFound(uint256 adId);
    error NotPending(uint256 adId);
    error InvalidExecutor();
    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ---------------------------------------------------------------------
    // Publisher: policy management
    // ---------------------------------------------------------------------

    /// @notice Create or update the calling site owner's ad-safety policy.
    /// @param bannedCategories Bitmask of forbidden CAT_* categories.
    /// @param customRules      Freeform additional rules (e.g. "no crypto airdrops").
    function setPolicy(uint256 bannedCategories, string calldata customRules) external {
        Policy storage p = policies[msg.sender];
        p.exists = true;
        p.bannedCategories = bannedCategories;
        p.customRules = customRules;
        p.updatedAt = block.timestamp;
        emit PolicySet(msg.sender, bannedCategories, customRules, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Advertiser: ad submission
    // ---------------------------------------------------------------------

    /// @notice Submit an ad targeting a publisher `site`. Ad starts as Pending.
    function submitAd(
        address site,
        string calldata headline,
        string calldata body,
        string calldata imageUrl,
        string calldata landingUrl
    ) external returns (uint256 adId) {
        if (!policies[site].exists) revert PolicyNotFound(site);

        adId = ++adCount;
        Ad storage a = ads[adId];
        a.id = adId;
        a.advertiser = msg.sender;
        a.site = site;
        a.headline = headline;
        a.body = body;
        a.imageUrl = imageUrl;
        a.landingUrl = landingUrl;
        a.status = Status.Pending;
        a.createdAt = block.timestamp;

        siteAdIds[site].push(adId);
        emit AdSubmitted(adId, msg.sender, site);
    }

    // ---------------------------------------------------------------------
    // Moderation: on-chain AI verdict via Ritual LLM precompile
    // ---------------------------------------------------------------------

    /// @notice Run on-chain AI moderation for a pending ad.
    /// @dev This is a short-running async LLM call. The signing EOA must have a
    ///      RitualWallet deposit that covers the async settlement fee. `executor`
    ///      must be an LLM-capable TEE executor from TEEServiceRegistry.
    /// @param adId     The ad to moderate.
    /// @param executor TEE executor address (LLM capability).
    function moderateAd(uint256 adId, address executor) external {
        Ad storage a = ads[adId];
        if (a.id == 0) revert AdNotFound(adId);
        // Allow moderation of new ads and retry of ads that hit an executor error.
        if (a.status != Status.Pending && a.status != Status.Errored) revert NotPending(adId);
        if (executor == address(0)) revert InvalidExecutor();

        Policy storage p = policies[a.site];
        if (!p.exists) revert PolicyNotFound(a.site);

        string memory messagesJson = _buildMessages(p, a);

        (bool hasError, bytes memory completionData, string memory errorMessage) =
            LLMLib.callLLM(executor, messagesJson, ttl, maxTokens, temperature);

        if (hasError) {
            // Executor/model failure (not a policy decision): mark Errored so it
            // stays blocked (fail-closed) but can be retried once executors recover.
            a.status = Status.Errored;
            a.verdict = string.concat("moderation error: ", errorMessage);
            a.moderatedAt = block.timestamp;
            emit AdModerated(adId, a.site, a.status, a.verdict);
            return;
        }

        string memory content = LLMLib.parseContent(completionData);

        // The model ends its answer with a sentinel line. Default to blocking
        // when the verdict is missing or explicitly FAIL — ad safety fails closed.
        if (LLMLib.contains(content, "VERDICT: FAIL")) {
            a.status = Status.Rejected;
        } else if (LLMLib.contains(content, "VERDICT: PASS")) {
            a.status = Status.Approved;
        } else {
            a.status = Status.Rejected;
            content = string.concat("inconclusive verdict, blocked by default | ", content);
        }

        a.verdict = content;
        a.moderatedAt = block.timestamp;
        emit AdModerated(adId, a.site, a.status, a.verdict);
    }

    // ---------------------------------------------------------------------
    // Prompt building
    // ---------------------------------------------------------------------

    function _buildMessages(Policy storage p, Ad storage a) internal view returns (string memory) {
        string memory system = string.concat(
            "You are Ad Firewall, a strict content-safety classifier for online advertising. ",
            "A publisher forbids advertisements that fall into ANY of these categories: ",
            _bannedList(p.bannedCategories),
            ". "
        );

        if (bytes(p.customRules).length > 0) {
            system = string.concat(system, "Additional publisher rules: ", _escape(p.customRules), ". ");
        }

        system = string.concat(
            system,
            "Analyze the advertisement and decide if it violates any forbidden category or rule. ",
            "Be strict: if you are uncertain, treat it as a violation. ",
            "First give one short line 'REASON: <why>'. ",
            "Then output a final line that is EXACTLY 'VERDICT: PASS' if the ad is safe to display, ",
            "or EXACTLY 'VERDICT: FAIL' if it must be blocked."
        );

        string memory user = string.concat(
            "Advertisement to review:\\n",
            "Headline: ",
            _escape(a.headline),
            "\\n",
            "Body: ",
            _escape(a.body),
            "\\n",
            "Landing URL: ",
            _escape(a.landingUrl),
            "\\n",
            "Image URL: ",
            _escape(a.imageUrl)
        );

        return string.concat(
            '[{"role":"system","content":"',
            system,
            '"},{"role":"user","content":"',
            user,
            '"}]'
        );
    }

    /// @notice Human-readable comma list of banned categories for the prompt.
    function _bannedList(uint256 mask) internal pure returns (string memory list) {
        bool first = true;
        for (uint256 i = 0; i < CAT_COUNT; i++) {
            if (mask & (1 << i) != 0) {
                if (!first) list = string.concat(list, ", ");
                list = string.concat(list, _label(i));
                first = false;
            }
        }
        if (first) list = "(no specific categories, use general safety judgment)";
    }

    function _label(uint256 i) internal pure returns (string memory) {
        if (i == 0) return "gambling";
        if (i == 1) return "casino";
        if (i == 2) return "adult / sexual content";
        if (i == 3) return "scams / fraud";
        if (i == 4) return "political ads";
        if (i == 5) return "phishing";
        if (i == 6) return "alcohol";
        if (i == 7) return "illegal drugs";
        if (i == 8) return "weapons";
        if (i == 9) return "hate speech";
        if (i == 10) return "malware";
        if (i == 11) return "misinformation";
        return "unknown";
    }

    /// @notice Escape a string so it is safe to embed inside a JSON string literal.
    function _escape(string memory input) internal pure returns (string memory) {
        bytes memory b = bytes(input);
        // Worst case each char becomes 2 (\\ + char) plus control-char expansions.
        bytes memory out = new bytes(b.length * 2);
        uint256 k = 0;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (c == '"') {
                out[k++] = "\\";
                out[k++] = '"';
            } else if (c == "\\") {
                out[k++] = "\\";
                out[k++] = "\\";
            } else if (c == 0x0a) {
                out[k++] = "\\";
                out[k++] = "n";
            } else if (c == 0x0d) {
                out[k++] = "\\";
                out[k++] = "r";
            } else if (c == 0x09) {
                out[k++] = "\\";
                out[k++] = "t";
            } else if (uint8(c) < 0x20) {
                // drop other control chars
                continue;
            } else {
                out[k++] = c;
            }
        }
        bytes memory trimmed = new bytes(k);
        for (uint256 j = 0; j < k; j++) {
            trimmed[j] = out[j];
        }
        return string(trimmed);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getAd(uint256 adId) external view returns (Ad memory) {
        if (ads[adId].id == 0) revert AdNotFound(adId);
        return ads[adId];
    }

    function getPolicy(address site) external view returns (Policy memory) {
        return policies[site];
    }

    function getAdIdsForSite(address site) external view returns (uint256[] memory) {
        return siteAdIds[site];
    }

    /// @notice All ads for a site, optionally filtered by status.
    /// @param site        The publisher.
    /// @param filter      Status to filter by, or Status.None for all.
    function getAdsForSite(address site, Status filter) external view returns (Ad[] memory result) {
        uint256[] storage ids = siteAdIds[site];
        uint256 n;
        for (uint256 i = 0; i < ids.length; i++) {
            if (filter == Status.None || ads[ids[i]].status == filter) n++;
        }
        result = new Ad[](n);
        uint256 k;
        for (uint256 i = 0; i < ids.length; i++) {
            if (filter == Status.None || ads[ids[i]].status == filter) {
                result[k++] = ads[ids[i]];
            }
        }
    }

    /// @notice Convenience: only the approved ads a website is allowed to display.
    function getApprovedAdsForSite(address site) external view returns (Ad[] memory result) {
        return this.getAdsForSite(site, Status.Approved);
    }

    // ---------------------------------------------------------------------
    // Admin: moderation parameter tuning
    // ---------------------------------------------------------------------

    function setModerationParams(uint256 _ttl, int256 _maxTokens, int256 _temperature) external onlyOwner {
        ttl = _ttl;
        maxTokens = _maxTokens;
        temperature = _temperature;
    }
}
