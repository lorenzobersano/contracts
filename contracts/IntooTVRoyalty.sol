// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract IntooTVRoyalty is ERC20 {
    constructor(uint256 initialSupply) public ERC20("IntooTV Royalty", "RLTY") {
        _mint(msg.sender, initialSupply);
    }
}