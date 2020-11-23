//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

// TODO: had to remove safeMath in require checks. add back

contract TemplatesRegistry is Ownable, ReentrancyGuard {
  mapping(uint256 => bool) public expiredExperience;
  mapping(uint256 => uint256) public ticketsToCards;
  mapping(uint256 => uint256) public cardsToTemplates;

  struct ExperienceTemplate {
    address creator;
    string props;
  }
  ExperienceTemplate[] public experienceTemplates;

  event PayoutSent(address addressToPay, uint256 amountToPay);

  // we have xpCollector that later distributes the Host"s reward share so
  // that noone tries to hack us by calling functions that redirect the reward
  // to them. We control where it goes at all times
  constructor() public {
    // Invalidate first position of array so it can't be accessed
    ExperienceTemplate memory expTemp = ExperienceTemplate({
      creator: address(0),
      props: ''
    });

    experienceTemplates.push(expTemp);
  }

  function getNumOfTemplates() public view returns (uint256) {
    return experienceTemplates.length;
  }

  function getTicketTemplates()
    public
    view
    returns (ExperienceTemplate[] memory)
  {
    ExperienceTemplate[] memory _experienceTemplates = new ExperienceTemplate[](
      experienceTemplates.length - 1
    );

    for (uint256 i = 1; i < experienceTemplates.length; i++) {
      _experienceTemplates[i - 1] = experienceTemplates[i];
    }

    return _experienceTemplates;
  }

  function createTicketTemplate(address _creator, string memory _props)
    external
    onlyOwner
    nonReentrant
    returns (uint256 experienceTemplateId)
  {
    ExperienceTemplate memory expTemp = ExperienceTemplate({
      creator: _creator,
      props: _props
    });

    experienceTemplates.push(expTemp);

    return experienceTemplates.length - 1;
  }
}
