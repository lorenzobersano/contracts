//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@opengsn/gsn/contracts/BaseRelayRecipient.sol';

import './TemplatesRegistry.sol';
import './IntooTVRoyalty.sol';

/**
 * @title IntooTV TicketFactory
 *
 * @dev Implementation of the TicketFactory contract, which is a Factory and Registry of NFT XP Cards and XP Tickets
 * @author IntooTV
 */
contract TicketFactory is BaseRelayRecipient, Ownable, IERC721Metadata, ERC721, ReentrancyGuard {
  string public override versionRecipient = "2.0.0";

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
  constructor(string memory _name, string memory _symbol, address _forwarder)
    public
    ERC721(_name, _symbol)
  {
    trustedForwarder = _forwarder;
      
    templatesRegistry = new TemplatesRegistry();
    royaltiesToken = new IntooTVRoyalty(100000000);
  }

      /**
     * return the sender of this call.
     * if the call came through our trusted forwarder, return the original sender.
     * otherwise, return `msg.sender`.
     * should be used in the contract anywhere instead of msg.sender
     */
    function _msgSender() internal override (BaseRelayRecipient, Context) view returns (address payable ret) {
        if (msg.data.length >= 24 && isTrustedForwarder(msg.sender)) {
            // At this point we know that the sender is a trusted forwarder,
            // so we trust that the last bytes of msg.data are the verified sender address.
            // extract sender address from the end of msg.data
            assembly {
                ret := shr(96,calldataload(sub(calldatasize(),20)))
            }
        } else {
            return msg.sender;
        }
    }

    /**
     * return the msg.data of this call.
     * if the call came through our trusted forwarder, then the real sender was appended as the last 20 bytes
     * of the msg.data - so this method will strip those 20 bytes off.
     * otherwise, return `msg.data`
     * should be used in the contract instead of msg.data, where the difference matters (e.g. when explicitly
     * signing or hashing the
     */
    function _msgData() internal override (BaseRelayRecipient, Context) virtual view returns (bytes memory ret) {
        if (msg.data.length >= 24 && isTrustedForwarder(msg.sender)) {
            // At this point we know that the sender is a trusted forwarder,
            // we copy the msg.data , except the last 20 bytes (and update the total length)
            assembly {
                let ptr := mload(0x40)
                // copy only size-20 bytes
                let size := sub(calldatasize(),20)
                // structure RLP data as <offset> <length> <bytes>
                mstore(ptr, 0x20)
                mstore(add(ptr,32), size)
                calldatacopy(add(ptr,64), 0, size)
                return(ptr, add(size,64))
            }
        } else {
            return msg.data;
        }
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

    address _ticketCreator = _msgSender();

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
      templatesRegistry.createTicketTemplate(_msgSender(), _props);
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
      ownerOf(_ticketId) == _msgSender(),
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
