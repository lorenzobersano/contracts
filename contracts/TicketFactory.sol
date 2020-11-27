//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import './TemplatesRegistry.sol';
import './IntooTVRoyalty.sol';

/**
 * @title IntooTV TicketFactory
 *
 * @dev Implementation of the TicketFactory contract, which is a Factory and Registry of NFT XP Cards and XP Tickets
 * @author IntooTV
 */
contract TicketFactory is IERC721Metadata, ERC721, Ownable, ReentrancyGuard {
  using Counters for Counters.Counter;

  Counters.Counter private tokenIds; // to keep track of the number of NFTs we have minted

  mapping(uint256 => bool) public expiredExperience;
  mapping(uint256 => uint256) public ticketsToCards;
  mapping(uint256 => uint256) public cardsToTemplates;
  mapping(uint256 => bool) isHost;

  event TicketCreated(
    uint256 ticketId,
    address ticketCreator,
    string props,
    int256 templateIndex
  );
  event ExperienceMatchingCreated(
    uint256 ticketId,
    address host,
    address guest,
    uint256 hostExperienceAccessId,
    uint256 guestExperienceAccessId
  );
  event ExperienceEnded(uint256 experienceId);
  event PayoutSent(address addressToPay, uint256 amountToPay);

  TemplatesRegistry public templatesRegistry;
  IntooTVRoyalty public royaltiesToken;

  // we have xpCollector that later distributes the Host"s reward share so
  // that noone tries to hack us by calling functions that redirect the reward
  // to them. We control where it goes at all times
  constructor(string memory _name, string memory _symbol)
    public
    ERC721(_name, _symbol)
  {
    templatesRegistry = new TemplatesRegistry();
    royaltiesToken = new IntooTVRoyalty(100000000);
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
    string memory _props,
    int256 _templateIndex,
    bool _saveAsTemplate
  ) external payable nonReentrant returns (uint256) {
    if (_templateIndex > 0 && _saveAsTemplate == true)
      revert("You can't save a card as a template if it's already a template");

    address _ticketCreator = msg.sender;

    tokenIds.increment();
    uint256 newItemId = tokenIds.current();

    _mint(_ticketCreator, newItemId);

    if (_templateIndex <= 0) {
      _setTokenURI(newItemId, _props);
    } else if (
      uint256(_templateIndex) < templatesRegistry.getNumOfTemplates()
    ) {
      (, string memory props) = templatesRegistry.experienceTemplates(
        uint256(_templateIndex)
      );

      _setTokenURI(newItemId, props);

      cardsToTemplates[newItemId] = uint256(_templateIndex);
    } else {
      revert('Invalid template index provided');
    }

    if (_saveAsTemplate == true) {
      templatesRegistry.createTicketTemplate(msg.sender, _props);
    }

    emit TicketCreated(newItemId, _ticketCreator, _props, _templateIndex);

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
    require(_ticketId < tokenIds.current(), 'no such experience token');
    require(expiredExperience[_ticketId] == false, 'experience expired');

    tokenIds.increment();
    uint256 hostItemId = tokenIds.current();
    tokenIds.increment();
    uint256 guestItemId = tokenIds.current();

    _mint(host, hostItemId);
    // this is the original creator of the ticket
    _mint(ownerOf(_ticketId), guestItemId);

    ticketsToCards[guestItemId] = _ticketId;

    // right now the properties are the same for both the guest and the host
    // we may want to change this in the future
    // also, it is not quite economically sensible to mint two NFTs. After all,
    // the creator of the original ticket can use that as authorization
    // from collectible pov, it makes sense to mint two NFTs here
    _setTokenURI(hostItemId, _props);
    _setTokenURI(guestItemId, _props);

    emit ExperienceMatchingCreated(
      _ticketId,
      host,
      ownerOf(_ticketId),
      hostItemId,
      guestItemId
    );

    return true;
  }

  function expireExperience(uint256 _ticketId) external nonReentrant {
    require(_ticketId < tokenIds.current(), 'no such experience token');
    require(
      expiredExperience[_ticketId] == false,
      'experience already expired'
    );
    require(
      ownerOf(_ticketId) == msg.sender,
      'Only owner of NFT can expire it'
    );

    expiredExperience[_ticketId] = true;

    if (cardsToTemplates[ticketsToCards[_ticketId]] != 0) {
      (address creator, ) = templatesRegistry.experienceTemplates(
        cardsToTemplates[ticketsToCards[_ticketId]]
      );
      _payout(creator, 1 * 1e18);
    }

    emit ExperienceEnded(_ticketId);
  }

  // This same contract is used as a treasury: DAI are sent to this contract which are
  // in turn sent as royalties to templates creators
  function _payout(address _addressToPay, uint256 _amountToPay) internal {
    royaltiesToken.transfer(_addressToPay, _amountToPay);

    emit PayoutSent(_addressToPay, _amountToPay);
  }
}
