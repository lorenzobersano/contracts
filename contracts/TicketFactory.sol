//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketFactory is IERC721Metadata, ERC721, Ownable, ReentrancyGuard {
  using SafeERC20 for ERC20;
  using SafeMath for uint256;
  using Counters for Counters.Counter;

  address public xpToken; // this is the ERC20 address of our XP token
  address public xpCollector; // when guest pays for ticket, XP tokens get sent here
  Counters.Counter private tokenIds; // to keep track of the number of NFTs we have minted

  enum Duration {twoMins, fiveMins, tenMins}

  constructor(
    address _xpToken,
    address _xpCollector,
    string memory _name,
    string memory _symbol
  ) public ERC721(_name, _symbol) {
    xpToken = _xpToken;
    xpCollector = _xpCollector;
  }

  // this function is responsible for minting the ticket NFT
  // it is the responsibility of the caller to pass the props json schema for ERC721Metadata (_props argument)
  // _props must include 4 things:
  // 1. guest avatar (host is not available at this point)
  // 2. title
  // 3. description
  // 4. duration (enum Duration)
  // find the schema definition to conform to here: https://eips.ethereum.org/EIPS/eip-721
  function createTicket(
    Duration _duration,
    string memory _props,
    address _ticketCreator
  ) external payable nonReentrant returns (uint256) {
    uint256 balanceBefore = ERC20(xpToken).balanceOf(xpCollector);
    uint256 balanceAfter;

    if (_duration == Duration.twoMins) {
      ERC20(xpToken).safeTransferFrom(_ticketCreator, xpCollector, 2 * 1e18);
      balanceAfter = ERC20(xpToken).balanceOf(xpCollector);
      require(
        balanceAfter.sub(balanceBefore) == 2 * 1e18,
        "failed transaction"
      );
    } else if (_duration == Duration.fiveMins) {
      ERC20(xpToken).safeTransferFrom(_ticketCreator, xpCollector, 5 * 1e18);
      balanceAfter = ERC20(xpToken).balanceOf(xpCollector);
      require(
        balanceAfter.sub(balanceBefore) == 5 * 1e18,
        "failed transaction"
      );
    } else if (_duration == Duration.tenMins) {
      ERC20(xpToken).safeTransferFrom(_ticketCreator, xpCollector, 10 * 1e18);
      balanceAfter = ERC20(xpToken).balanceOf(xpCollector);
      require(
        balanceAfter.sub(balanceBefore) == 10 * 1e18,
        "failed transaction"
      );
    } else {
      require(false, "exhaustive check");
    }

    uint256 newItemId = tokenIds.current();
    _mint(_ticketCreator, newItemId);
    // we will also need another function to support calling this setTokenURI to be
    // able to set the vrf hash to generate the QR code
    _setTokenURI(newItemId, _props);

    return newItemId;
  }
}

// TODO: minting of the access tokens based off the above created token
// to: enable the guest and the host to access the event