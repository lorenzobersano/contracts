// SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;

import "@openzeppelin/contracts/access/Ownable.sol";

contract IntooTVWhitelist is Ownable {
    event AddedToWhitelist(address user);
    event RemovedFromWhitelist(address user);

    mapping(address => bool) public whitelist;

    function addToWhitelist(address user) external onlyOwner {
        whitelist[user] = true;

        emit AddedToWhitelist(user);
    }

    function removeFromWhitelist(address user) external onlyOwner {
        whitelist[user] = false;

        emit RemovedFromWhitelist(user);
    }
}