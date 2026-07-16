// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title LLMLib
/// @notice Helpers for encoding requests to and decoding responses from the
///         Ritual LLM precompile (0x0802). Kept in a library so the consumer
///         contract stays focused on business logic.
library LLMLib {
    address internal constant LLM_PRECOMPILE = 0x0000000000000000000000000000000000000802;

    /// @notice Model pinned for production usage on Ritual Chain.
    string internal constant MODEL = "zai-org/GLM-4.7-FP8";

    error PrecompileCallFailed();

    /// @notice Off-chain conversation-history storage reference (DA). Unused for
    ///         single-shot moderation but required to decode the response envelope.
    struct ConvoRef {
        string platform;
        string path;
        string keyRef;
    }

    /// @notice Encode the full 30-field LLM request tuple and invoke the precompile.
    /// @dev Short-running async: the builder simulates, an executor runs inference in a
    ///      TEE, and the tx is replayed with the settled output injected. From the
    ///      contract's perspective the call returns synchronously.
    /// @param executor  TEE executor address (LLM capability) from TEEServiceRegistry.
    /// @param messagesJson OpenAI-style chat messages, JSON encoded.
    /// @param ttl       Blocks until the commitment expires (>=60 for reasoning models).
    /// @param maxTokens Max completion tokens (>=4096 for GLM-4.7-FP8 reasoning model).
    /// @param temperature Sampling temperature scaled x1000 (e.g. 200 = 0.2).
    /// @return hasError       True if the executor reported an error.
    /// @return completionData ABI-encoded CompletionData blob (decode with parseContent).
    /// @return errorMessage   Freeform error string when hasError is true.
    function callLLM(
        address executor,
        string memory messagesJson,
        uint256 ttl,
        int256 maxTokens,
        int256 temperature
    ) internal returns (bool hasError, bytes memory completionData, string memory errorMessage) {
        bytes memory input = abi.encode(
            executor,
            new bytes[](0), // encryptedSecrets
            ttl, // ttl (blocks)
            new bytes[](0), // secretSignatures
            bytes(""), // userPublicKey
            messagesJson, // messagesJson
            MODEL, // model
            int256(0), // frequencyPenalty
            "", // logitBiasJson
            false, // logprobs
            maxTokens, // maxCompletionTokens
            "", // metadataJson
            "", // modalitiesJson
            uint256(1), // n
            true, // parallelToolCalls
            int256(0), // presencePenalty
            "medium", // reasoningEffort
            bytes(""), // responseFormatData
            int256(-1), // seed (null)
            "auto", // serviceTier
            "", // stopJson
            false, // stream
            temperature, // temperature (scaled x1000)
            bytes(""), // toolChoiceData
            bytes(""), // toolsData
            int256(-1), // topLogprobs (null)
            int256(1000), // topP (1.0)
            "", // user
            false, // piiEnabled
            // convoHistory StorageRef: empty tuple = single-shot, no DA history.
            // MUST be encoded as a (string,string,string) tuple, not bytes —
            // encoding it as bytes shifts the payload and the node rejects the
            // async commitment with RPC -32602 "invalid async payload".
            ConvoRef("", "", "")
        );

        (bool success, bytes memory result) = LLM_PRECOMPILE.call(input);
        if (!success) revert PrecompileCallFailed();

        // Short-running async envelope: (bytes simmedInput, bytes actualOutput).
        (, bytes memory actualOutput) = abi.decode(result, (bytes, bytes));

        (hasError, completionData, , errorMessage,) =
            abi.decode(actualOutput, (bool, bytes, bytes, string, ConvoRef));
    }

    /// @notice Extract the assistant message content string from ABI-encoded CompletionData.
    /// @dev CompletionData layout:
    ///      (string id, string object, uint256 created, string model,
    ///       string systemFingerprint, string serviceTier,
    ///       uint256 choicesCount, bytes[] choicesData, bytes usageData)
    ///      choicesData[i]: (uint256 index, string finishReason, bytes messageData)
    ///      messageData: (string role, string content, string refusal,
    ///                    uint256 toolCallsCount, bytes[] toolCallsData)
    function parseContent(bytes memory completionData) internal pure returns (string memory content) {
        if (completionData.length == 0) return "";

        (,,,,,, uint256 choicesCount, bytes[] memory choicesData,) = abi.decode(
            completionData, (string, string, uint256, string, string, string, uint256, bytes[], bytes)
        );

        if (choicesCount == 0 || choicesData.length == 0) return "";

        (,, bytes memory messageData) = abi.decode(choicesData[0], (uint256, string, bytes));
        (, content,,,) = abi.decode(messageData, (string, string, string, uint256, bytes[]));
    }

    /// @notice Case-sensitive substring check. Used to read the model's VERDICT sentinel.
    function contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length == 0) return true;
        if (n.length > h.length) return false;

        for (uint256 i = 0; i <= h.length - n.length; i++) {
            bool matched = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) {
                    matched = false;
                    break;
                }
            }
            if (matched) return true;
        }
        return false;
    }
}
