// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AdFirewall} from "../src/AdFirewall.sol";

contract AdFirewallTest is Test {
    address constant LLM = 0x0000000000000000000000000000000000000802;

    AdFirewall firewall;

    address publisher = makeAddr("publisher");
    address advertiser = makeAddr("advertiser");
    address executor = makeAddr("executor");

    // Same shape as the precompile's convoHistory tuple, so mock data decodes cleanly.
    struct Convo {
        string a;
        string b;
        string c;
    }

    // Common category set: no gambling, casino, adult, scams, political, phishing.
    uint256 constant BANNED = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5);

    function setUp() public {
        firewall = new AdFirewall();
    }

    // ------------------------------------------------------------------
    // Mock helpers
    // ------------------------------------------------------------------

    function _completionData(string memory content) internal pure returns (bytes memory) {
        bytes memory messageData = abi.encode("assistant", content, "", uint256(0), new bytes[](0));
        bytes memory choice = abi.encode(uint256(0), "stop", messageData);
        bytes[] memory choices = new bytes[](1);
        choices[0] = choice;
        bytes memory usage = abi.encode(uint256(10), uint256(20), uint256(30));
        return abi.encode(
            "cmpl-1", "chat.completion", uint256(1), "zai-org/GLM-4.7-FP8", "fp", "auto", uint256(1), choices, usage
        );
    }

    function _mockLLM(string memory content, bool hasError, string memory errMsg) internal {
        bytes memory completionData = hasError ? bytes("") : _completionData(content);
        bytes memory actualOutput =
            abi.encode(hasError, completionData, bytes(""), errMsg, Convo("", "", ""));
        bytes memory envelope = abi.encode(bytes(""), actualOutput);
        vm.mockCall(LLM, bytes(""), envelope);
    }

    function _setupPendingAd() internal returns (uint256 adId) {
        vm.prank(publisher);
        firewall.setPolicy(BANNED, "no crypto airdrops");

        vm.prank(advertiser);
        adId = firewall.submitAd(
            publisher, "Win big at LuckyPlay", "Deposit now and double your money", "https://img", "https://lp"
        );
    }

    // ------------------------------------------------------------------
    // Policy + submission
    // ------------------------------------------------------------------

    function test_setPolicy() public {
        vm.prank(publisher);
        firewall.setPolicy(BANNED, "no crypto");
        AdFirewall.Policy memory p = firewall.getPolicy(publisher);
        assertTrue(p.exists);
        assertEq(p.bannedCategories, BANNED);
        assertEq(p.customRules, "no crypto");
    }

    function test_submitAd_revertsWithoutPolicy() public {
        vm.prank(advertiser);
        vm.expectRevert(abi.encodeWithSelector(AdFirewall.PolicyNotFound.selector, publisher));
        firewall.submitAd(publisher, "h", "b", "i", "l");
    }

    function test_submitAd_setsPending() public {
        uint256 adId = _setupPendingAd();
        AdFirewall.Ad memory a = firewall.getAd(adId);
        assertEq(uint256(a.status), uint256(AdFirewall.Status.Pending));
        assertEq(a.advertiser, advertiser);
        assertEq(a.site, publisher);
    }

    // ------------------------------------------------------------------
    // Moderation verdicts
    // ------------------------------------------------------------------

    function test_moderate_pass() public {
        uint256 adId = _setupPendingAd();
        _mockLLM("REASON: clean\nVERDICT: PASS", false, "");

        firewall.moderateAd(adId, executor);

        AdFirewall.Ad memory a = firewall.getAd(adId);
        assertEq(uint256(a.status), uint256(AdFirewall.Status.Approved));
    }

    function test_moderate_fail() public {
        uint256 adId = _setupPendingAd();
        _mockLLM("REASON: gambling ad\nVERDICT: FAIL", false, "");

        firewall.moderateAd(adId, executor);

        AdFirewall.Ad memory a = firewall.getAd(adId);
        assertEq(uint256(a.status), uint256(AdFirewall.Status.Rejected));
    }

    function test_moderate_inconclusive_failsClosed() public {
        uint256 adId = _setupPendingAd();
        _mockLLM("I am not sure about this ad.", false, "");

        firewall.moderateAd(adId, executor);

        AdFirewall.Ad memory a = firewall.getAd(adId);
        assertEq(uint256(a.status), uint256(AdFirewall.Status.Rejected));
    }

    function test_moderate_executorError_marksErrored() public {
        uint256 adId = _setupPendingAd();
        _mockLLM("", true, "HTTP request failed with status 400");

        firewall.moderateAd(adId, executor);

        AdFirewall.Ad memory a = firewall.getAd(adId);
        assertEq(uint256(a.status), uint256(AdFirewall.Status.Errored));
        assertTrue(bytes(a.verdict).length > 0);
    }

    function test_moderate_retryAfterError() public {
        uint256 adId = _setupPendingAd();

        // First attempt: executor error -> Errored.
        _mockLLM("", true, "Failed to get vLLM client");
        firewall.moderateAd(adId, executor);
        assertEq(uint256(firewall.getAd(adId).status), uint256(AdFirewall.Status.Errored));

        // Retry once the executor recovers: a clean PASS -> Approved.
        _mockLLM("REASON: clean\nVERDICT: PASS", false, "");
        firewall.moderateAd(adId, executor);
        assertEq(uint256(firewall.getAd(adId).status), uint256(AdFirewall.Status.Approved));
    }

    function test_moderate_revertsOnZeroExecutor() public {
        uint256 adId = _setupPendingAd();
        vm.expectRevert(AdFirewall.InvalidExecutor.selector);
        firewall.moderateAd(adId, address(0));
    }

    function test_moderate_revertsIfNotPending() public {
        uint256 adId = _setupPendingAd();
        _mockLLM("VERDICT: PASS", false, "");
        firewall.moderateAd(adId, executor);

        vm.expectRevert(abi.encodeWithSelector(AdFirewall.NotPending.selector, adId));
        firewall.moderateAd(adId, executor);
    }

    // ------------------------------------------------------------------
    // Views + display filtering
    // ------------------------------------------------------------------

    function test_getApprovedAdsForSite_filters() public {
        vm.prank(publisher);
        firewall.setPolicy(BANNED, "");

        vm.prank(advertiser);
        uint256 goodAd = firewall.submitAd(publisher, "Eco water bottle", "Reusable and clean", "https://i1", "https://l1");
        vm.prank(advertiser);
        uint256 badAd = firewall.submitAd(publisher, "Casino jackpot", "Bet now", "https://i2", "https://l2");

        _mockLLM("VERDICT: PASS", false, "");
        firewall.moderateAd(goodAd, executor);

        _mockLLM("VERDICT: FAIL", false, "");
        firewall.moderateAd(badAd, executor);

        AdFirewall.Ad[] memory approved = firewall.getApprovedAdsForSite(publisher);
        assertEq(approved.length, 1);
        assertEq(approved[0].id, goodAd);
    }

    function test_escapesQuotesInContent() public {
        vm.prank(publisher);
        firewall.setPolicy(BANNED, 'no "special" offers');

        vm.prank(advertiser);
        uint256 adId = firewall.submitAd(
            publisher, 'Buy "now"', "line1\nline2 with \\ backslash", "https://i", "https://l"
        );

        _mockLLM("REASON: ok\nVERDICT: PASS", false, "");
        firewall.moderateAd(adId, executor);

        AdFirewall.Ad memory a = firewall.getAd(adId);
        assertEq(uint256(a.status), uint256(AdFirewall.Status.Approved));
    }
}
