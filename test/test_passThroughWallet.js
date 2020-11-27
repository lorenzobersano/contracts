var assert = require('assert');

const Web3 = require('web3');
const { waitForEvent } = require('./utils');
const web3 = new Web3(
  new Web3.providers.WebsocketProvider('ws://localhost:7545')
);

const PassThroughWallet = artifacts.require('PassThroughWallet.sol');

contract('PassThroughWallet', ([owner, ...accounts]) => {
  let contractEvents;

  beforeEach(async () => {
    this.passThroughWalletCreator = accounts[0];
    this.wallet = await PassThroughWallet.new();

    const { events } = new web3.eth.Contract(
      this.wallet.abi,
      this.wallet.address
    );

    contractEvents = events;

    await web3.eth.sendTransaction({
      from: accounts[1],
      to: this.wallet.address,
      value: web3.utils.toWei('1', 'ether'),
    });
  });

  it('stores eth', async () => {
    const walletBalance = await web3.eth.getBalance(this.wallet.address);
    assert.strictEqual(
      walletBalance.toString(),
      web3.utils.toWei('1', 'ether')
    );
  });

  it("doesn't withdraw correctly if requested withdrawal balance is > than actual balance", async () => {
    await this.wallet.requestWithdrawal(100, {
      from: accounts[0],
    });

    const currBlock = await web3.eth.getBlock('latest');

    const withdrawErrEvent = await waitForEvent(
      contractEvents.LogProvableQueryCallbackError,
      currBlock.number
    );

    assert.strictEqual(
      withdrawErrEvent.returnValues.description,
      "Requested withdrawal is higher than requestors' balance"
    );
  });

  it('withdraws correctly if requested withdrawal balance is <= than actual balance', async () => {
    await this.wallet.requestWithdrawal(5, {
      from: accounts[0],
    });

    const currBlock = await web3.eth.getBlock('latest');

    const withdrawOkEvent = await waitForEvent(
      contractEvents.LogProvableQueryCallbackResult,
      currBlock.number
    );

    assert.strictEqual(withdrawOkEvent.returnValues.requestor, accounts[0]);
    assert.strictEqual(withdrawOkEvent.returnValues.requestorBalance, 10);
    assert.strictEqual(withdrawOkEvent.returnValues.amountRequested, 5);
  });

  it("doesn't withdraw if requested twice or more in a day", async () => {
    try {
      await this.wallet.requestWithdrawal(100, {
        from: accounts[0],
      });
      await this.wallet.requestWithdrawal(100, {
        from: accounts[0],
      });
    } catch {}
  });
});
