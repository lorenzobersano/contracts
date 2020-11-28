//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@opengsn/gsn/contracts/BaseRelayRecipient.sol';

import './ProvableAPI.sol';

import './StringLibrary.sol';
import './AddressLibrary.sol';
import './WadRayMath.sol';

contract PassThroughWallet is BaseRelayRecipient, ReentrancyGuard, usingProvable {
  using WadRayMath for uint256;
  using StringLibrary for string;
  using AddressLibrary for address payable;

  string public override versionRecipient = "2.0.0";

  constructor(address _forwarder)
    public
  {
    trustedForwarder = _forwarder;
  }

  /// @notice Logs the address of the address that withdraws and amounts paid by the contract
  event Withdraw(address indexed to, uint256 value);
  event Paid(address indexed from, uint256 value);

  event LogNewProvableQuery(string description);
  event LogProvableQueryCallbackResult(
    address requestor,
    uint256 requestorBalance,
    uint256 amountRequested
  );
  event LogProvableQueryCallbackError(string description);

  struct WithdrawalRequest {
    address payable requestor;
    uint256 amountRequested;
  }

  mapping(bytes32 => WithdrawalRequest) validRequests;
  mapping(address => uint256) lastRequestTime;

  uint256 constant SECONDS_IN_A_DAY = 86400;

  receive() external payable {
    emit Paid(msg.sender, msg.value);
  }

  function _withdraw(uint256 amount, address payable to)
    internal
    nonReentrant
    returns (bool transferSuccess)
  {
    IERC20 dai = IERC20(0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD); // Kovan DAI

    uint256 daisToTransfer = amount.wadMul(98).wadDiv(100);
    require(dai.balanceOf(address(this)) >= daisToTransfer, 'insufficient balance');

    dai.transfer(to, daisToTransfer);

    emit Withdraw(to, daisToTransfer);

    transferSuccess = true;
  }

  function __callback(bytes32 _queryId, string memory _result) public override {
    require(_msgSender() == provable_cbAddress());

    uint256 requestorBalance = parseInt(_result);

    address payable requestor = validRequests[_queryId].requestor;
    uint256 amountRequested = validRequests[_queryId].amountRequested;

    delete validRequests[_queryId];

    if (requestorBalance >= amountRequested) {
      emit LogProvableQueryCallbackResult(
        requestor,
        requestorBalance,
        amountRequested
      );

      _withdraw(amountRequested, requestor);
    } else {
      emit LogProvableQueryCallbackError(
        "Requested withdrawal is higher than requestors' balance"
      );
    }
  }

  function requestWithdrawal(uint256 _amount) public {
    require(
      now - lastRequestTime[_msgSender()] >= SECONDS_IN_A_DAY,
      'You can only request withdrawals once a day'
    );

    lastRequestTime[_msgSender()] = now;

    if (provable_getPrice('URL') > address(this).balance) {
      emit LogNewProvableQuery(
        'Provable query was NOT sent, please add some ETH to cover for the query fee!'
      );
    } else {
      emit LogNewProvableQuery(
        'Provable query was sent, standing by for the answer...'
      );


        string memory apiUrlPrefix
       = 'json(https://5qijf.sse.codesandbox.io/users/';
      string memory apiUrl = apiUrlPrefix.append(_msgSender().toString()).append(
        '/balance).balance'
      );

      bytes32 queryId = provable_query('URL', apiUrl);

      validRequests[queryId] = WithdrawalRequest(_msgSender(), _amount);
    }
  }
}
