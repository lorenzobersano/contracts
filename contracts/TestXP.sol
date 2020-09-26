//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract TestXP is ERC20 {
  using SafeERC20 for ERC20;

  constructor(string memory _name, string memory _symbol)
    public
    ERC20(_name, _symbol)
  {
    _mint(msg.sender, 100 * 1e18);
  }
}
