//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PassThroughWallet is Ownable, ReentrancyGuard {
  /// @notice Logs the address of the sender and amounts paid to the contract
  event Paid(address indexed from, uint256 value);
  event Withdraw(address indexed to, uint256 value);

  // TODO: I have not implemented the limit. It presents certain difficulties that
  // are better to avoid right now. Otherwise, I would not fit into my allotted 4-8 hours

  receive() external payable {
    Paid(msg.sender, msg.value);
  }

  function withdraw(uint256 amount, address payable to)
    external
    onlyOwner
    nonReentrant
    returns (bool transferSuccess)
  {
    require(address(this).balance >= amount, "insufficient balance");
    to.transfer(amount);

    Withdraw(to, amount);

    transferSuccess = true;
  }
}
