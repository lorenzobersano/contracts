var assert = require("assert");

const TicketFactory = artifacts.require("TicketFactory.sol");
const TestXP = artifacts.require("TestXP.sol");

// note this is rinkeby DAI for now. We need this to be XP tokens address
// const xpTokenAddr = "0xf80a32a835f79d7787e8a8ee5721d0feafd78108";
// not this is my address
// const xpCollector = "0x50c3374fd62dd09f18ccc01e1c20f5de66cd6dea";
// const ticketCreator = "0xF2CfffD0D154805503E9D16C4832f960DEDa03fF";

contract("TicketFactory", ([owner, ...accounts]) => {
  beforeEach(async () => {
    this.ticketCreator = accounts[0];
    this.xpCollector = accounts[1];

    // minting our fake (because we are testing) XP tokens
    this.xpToken = await TestXP.new("Experience", "XP", {from: accounts[0]});

    this.factory = await TicketFactory.new(
      this.xpToken.address,
      this.xpCollector,
      "XPFactory",
      "XPF"
    );

    // this ensures that ticket creator has 100 XP tokens
    const account0XpBal = await this.xpToken.balanceOf(accounts[0]);
    assert.strictEqual(account0XpBal.toString(), String(100 * 1e18));
  });

  it("initialized correctly", async () => {
    const contractOwner = await this.factory.owner();
    assert.strictEqual(contractOwner, owner);
  });

  it("creates nft ticket correctly", async () => {
    // ticket creator approves our smart contract to spend up to 20 of its XP tokens
    const approveResult = await this.xpToken.approve(
      this.factory.address,
      String(20 * 1e18),
      {from: accounts[0]}
    );

    // before this can be invoked, we need to approve this contract to spend our xpTokens
    // 0 denotes 2mins. 1 denotes 5mins and 2 denotes 10mins
    const ticketReceipt = await this.factory.createTicket(0, "{}", {
      from: accounts[0]
    });

    // this means our contract took 2 XP from creator and forwarded it
    // to xpCollector. Which is account 1 here
    const account0XpBal = await this.xpToken.balanceOf(accounts[0]);
    assert.strictEqual(account0XpBal.toString(), String(98 * 1e18));
    const account1XpBal = await this.xpToken.balanceOf(accounts[1]);
    assert.strictEqual(account1XpBal.toString(), String(2 * 1e18));
  });
});

// todo:
// 1. ensure ticket creator receives an nft
// 2. the id counter is incremented correctly (obsolete, but just check once)
// 3. host/guest access nft
