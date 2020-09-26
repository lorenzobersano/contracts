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

  // if you are wondering how you can call functions that use Solidity enums,
  // then these enums get converted into uint. So twoMins is 0, fiveMins is 1 and so on
  enum Duration {twoMins, fiveMins, tenMins}

  mapping(uint256 => bool) public expiredExperience;

  // we have xpCollector that later distributes the Host's reward share so
  // that noone tries to hack us by calling functions that redirect the reward
  // to them. We control where it goes at all times
  constructor(
    address _xpToken,
    address _xpCollector,
    string memory _name,
    string memory _symbol
  ) public ERC721(_name, _symbol) {
    xpToken = _xpToken;
    // we avoid directly sending them the host the xp tokens
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
  function createTicket(Duration _duration, string memory _props)
    external
    payable
    nonReentrant
    returns (uint256)
  {
    address _ticketCreator = msg.sender;
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

    tokenIds.increment();
    uint256 newItemId = tokenIds.current();

    _mint(_ticketCreator, newItemId);
    // we will also need another function to support calling this setTokenURI to be
    // able to set the vrf hash to generate the QR code
    _setTokenURI(newItemId, _props);

    return newItemId;
  }

  // anyone can call this. but! only one person at a time can do this
  // this is a limitation right now. we can fix it later, such that
  // we will have an array of people interested in hosting
  // and we then get the guest to pick (based on reputation, for example)
  // who to go with. They then mint the access tokens
  // -----
  // once again, the client is responsible for creating the properties (as per)
  // schema mentioned earlier, and passing it to this method
  function createAccessToEvent(
    uint256 _ticketId,
    string memory _props,
    address host
  ) external nonReentrant returns (bool) {
    require(_ticketId < tokenIds.current(), "no such experience token");
    require(expiredExperience[_ticketId] == false, "experience expired");

    _mint(host, 1);
    // this is the original creator of the ticket
    _mint(ownerOf(_ticketId), 2);

    // right now the properties are the same for both the guest and the host
    // we may want to change this in the future
    // also, it is not quite economically sensible to mint two NFTs. After all,
    // the creator of the original ticket can use that as authorization
    // from collectible pov, it makes sense to mint two NFTs here
    _setTokenURI(1, _props);
    _setTokenURI(2, _props);

    return true;
  }
}
