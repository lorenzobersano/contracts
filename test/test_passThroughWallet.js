var assert = require("assert");
const {convertTypeAcquisitionFromJson} = require("typescript");
const {default: Web3} = require("web3");

const PassThroughWallet = artifacts.require("PassThroughWallet.sol");

contract("PassThroughWallet", ([owner, ...accounts]) => {
  beforeEach(async () => {
    this.passThroughWalletCreator = accounts[0];
    this.wallet = await PassThroughWallet.new();

    await web3.eth.sendTransaction({
      from: accounts[1],
      to: this.wallet.address,
      value: web3.utils.toWei("1", "ether")
    });
  });

  it("stores eth", async () => {
    const walletBalance = await web3.eth.getBalance(this.wallet.address);
    assert.strictEqual(
      walletBalance.toString(),
      web3.utils.toWei("1", "ether")
    );
  });

  it("does not allow non-owners to withdraw", async () => {
    const walletBalance = await web3.eth.getBalance(this.wallet.address);
    assert.strictEqual(
      walletBalance.toString(),
      web3.utils.toWei("1", "ether")
    );
    try {
      await this.wallet.withdraw("1000000", accounts[1], {from: accounts[1]});
    } catch (e) {
      assert.strictEqual(e.reason, "Ownable: caller is not the owner");
    }
  });

  it("allows owner to withdraw", async () => {
    const walletBalance = await web3.eth.getBalance(this.wallet.address);
    assert.strictEqual(
      walletBalance.toString(),
      web3.utils.toWei("1", "ether").toString()
    );

    await this.wallet.withdraw(
      String(web3.utils.toWei("0.6", "ether")),
      accounts[0]
    );
    assert.strictEqual(
      await web3.eth.getBalance(this.wallet.address),
      web3.utils.toWei("0.4", "ether")
    );
  });

  it("does not allow to withdraw more than there is", async () => {
    const walletBalance = await web3.eth.getBalance(this.wallet.address);
    assert.strictEqual(
      walletBalance.toString(),
      web3.utils.toWei("1", "ether").toString()
    );

    try {
      await this.wallet.withdraw(
        String(web3.utils.toWei("1.01", "ether")),
        accounts[0]
      );
    } catch (e) {
      assert.strictEqual(e.reason, "insufficient balance");
    }
  });
});
