//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";

contract RandomNumberConsumer is VRFConsumerBase {
  bytes32 internal keyHash;
  uint256 internal fee;

  uint256 public randomResult;

  /**
   * Constructor inherits VRFConsumerBase
   *
   * Network: Kovan
   * Chainlink VRF Coordinator address: 0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9
   * LINK token address:                0xa36085F69e2889c224210F603D836748e7dC0088
   * Key Hash: 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4
   */
  constructor()
    public
    VRFConsumerBase(
      0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9, // VRF Coordinator
      0xa36085F69e2889c224210F603D836748e7dC0088 // LINK Token
    )
  {
    keyHash = 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4;
    fee = 0.1 * 10**18; // 0.1 LINK
  }

  /**
   * Requests randomness from a user-provided seed
   */
  function getRandomNumber(uint256 userProvidedSeed)
    public
    returns (bytes32 requestId)
  {
    require(
      LINK.balanceOf(address(this)) > fee,
      "Not enough LINK - fill contract with faucet"
    );
    return requestRandomness(keyHash, fee, userProvidedSeed);
  }

  /**
   * Callback function used by VRF Coordinator
   */
  function fulfillRandomness(bytes32 requestId, uint256 randomness)
    internal
    override
  {
    randomResult = randomness;
  }
}

// process
// 1. deploy this contract from an address that has sufficient ether on Kovan (you may ned to use faucet for this)
// 2. get some LINK on Kovan (also faucet)
// 3. send some LINK to this address, since it needs to pay 0.1 LINK per each request
// 4. call getRandomNumber from outside with some of your entropy
// 5. make a call to randomResult in the **NEXT BLOCK**
// 6. use keccak256 or other hashing algorithm to get a hash from 5
// 7. use this hash as a QR code for the event (since we are React Native, where would we use this URL though?)
