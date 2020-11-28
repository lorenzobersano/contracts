//SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

import "./AcceptEverythingPaymaster.sol";

import "../IntooTVWhitelist.sol";

///a sample paymaster that has whitelists for senders and targets.
/// - if at least one sender is whitelisted, then ONLY whitelisted senders are allowed.
/// - if at least one target is whitelisted, then ONLY whitelisted targets are allowed.
contract IntooTVWhitelistPaymaster is AcceptEverythingPaymaster {
    IntooTVWhitelist intooTVWhitelist;

    constructor (address intooTVWhitelistAddress) public {
        intooTVWhitelist = IntooTVWhitelist(intooTVWhitelistAddress);
    }

    function preRelayedCall(
        GsnTypes.RelayRequest calldata relayRequest,
        bytes calldata signature,
        bytes calldata approvalData,
        uint256 maxPossibleGas
    )
        external
        virtual
        override
        returns (bytes memory context, bool revertOnRecipientRevert)
    {
        (relayRequest, signature, approvalData, maxPossibleGas);

        bool isSenderInWhitelist = intooTVWhitelist.whitelist(
            relayRequest.request.from
        );

        require(
            isSenderInWhitelist == true,
            "Sender is not part of IntooTV"
        );

        return ("", false);
    }
}