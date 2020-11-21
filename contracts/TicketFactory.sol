//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// TODO: had to remove safeMath in require checks. add back

contract TicketFactory is IERC721Metadata, ERC721, Ownable, ReentrancyGuard {
  using Counters for Counters.Counter;

  Counters.Counter private tokenIds; // to keep track of the number of NFTs we have minted

  // if you are wondering how you can call functions that use Solidity enums,
  // then these enums get converted into uint. So twoMins is 0, fiveMins is 1 and so on
  enum Duration { twoMins, fiveMins, tenMins }

  mapping(uint256 => bool) public expiredExperience;
  mapping(uint256 => uint256) public ticketsToTemplates;

  struct ExperienceTemplate {
    address payable creator;
    string props;
  }

  ExperienceTemplate[] public experienceTemplates;

  event ExperienceEnded(uint256 experienceId);

  // we have xpCollector that later distributes the Host"s reward share so
  // that noone tries to hack us by calling functions that redirect the reward
  // to them. We control where it goes at all times
  constructor(string memory _name, string memory _symbol)
    public
    ERC721(_name, _symbol) {
      // Invalidate first position of array so it can't be accessed
      ExperienceTemplate memory expTemp = ExperienceTemplate({
        creator: address(0),
        props: ""
      });

      experienceTemplates.push(expTemp);
    }

  function createTicketTemplate(string memory _props)
    external
    nonReentrant
    returns (uint256)
  {
    ExperienceTemplate memory expTemp = ExperienceTemplate({
      creator: msg.sender,
      props: _props
    });

    experienceTemplates.push(expTemp);

    return experienceTemplates.length - 1;
  }

  // this function is responsible for minting the ticket NFT
  // it is the responsibility of the caller to pass the props json schema for ERC721Metadata (_props argument)
  // _props must include 4 things:
  // 1. guest avatar (host is not available at this point)
  // 2. title
  // 3. description
  // 4. duration (enum Duration)
  // find the schema definition to conform to here: https://eips.ethereum.org/EIPS/eip-721
  function createTicket(string memory _props, int256 _templateIndex)
    external
    payable
    nonReentrant
    returns (uint256)
  {
    address _ticketCreator = msg.sender;

    tokenIds.increment();
    uint256 newItemId = tokenIds.current();

    _mint(_ticketCreator, newItemId);

    if(_templateIndex < 0) {
      _setTokenURI(newItemId, _props);
    } else if (uint256(_templateIndex) < experienceTemplates.length) {
      _setTokenURI(newItemId, experienceTemplates[uint256(_templateIndex)].props);
      ticketsToTemplates[newItemId] = uint256(_templateIndex);
    } else {
      revert("Invalid template index provided");
    }

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

  function expireExperience(uint256 _ticketId)
    external
    nonReentrant
  {
    require(_ticketId < tokenIds.current(), "no such experience token");
    require(expiredExperience[_ticketId] == false, "experience already expired");

    expiredExperience[_ticketId] = true;

    if(ticketsToTemplates[_ticketId] != 0) {
      address payable _addressToPay = experienceTemplates[ticketsToTemplates[_ticketId]].creator;
      _payout(_addressToPay, 1 * 1e18);
    }

    emit ExperienceEnded(_ticketId);
  }

  // This same contract is used as a treasury: DAI are sent to this contract which are
  // in turn sent as royalties to templates creators
  function _payout(address _addressToPay, uint256 _amountToPay) internal {
    ERC20 dai = ERC20(0xc7cC3413f169a027dccfeffe5208Ca4f38eF0c40); // Kovan DAI

    dai.transfer(_addressToPay, _amountToPay);
  }
}
