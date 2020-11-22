var assert = require('assert');
var web3 = require('web3');

const TicketFactory = artifacts.require('TicketFactory.sol');
const TemplatesRegistry = artifacts.require('TemplatesRegistry.sol');

// note this is rinkeby DAI for now. We need this to be XP tokens address
// const xpTokenAddr = "0xf80a32a835f79d7787e8a8ee5721d0feafd78108";
// not this is my address
// const xpCollector = "0x50c3374fd62dd09f18ccc01e1c20f5de66cd6dea";
// const ticketCreator = "0xF2CfffD0D154805503E9D16C4832f960DEDa03fF";

contract('TemplatesRegistry', ([owner, ...accounts]) => {
  before(async () => {
    this.factory = await TicketFactory.new('XPFactory', 'XPF');

    const templatesRegistryAddress = await this.factory.templatesRegistry();
    this.registry = await TemplatesRegistry.at(templatesRegistryAddress);
  });

  it('initialized correctly', async () => {
    const contractOwner = await this.registry.owner();
    assert.strictEqual(contractOwner, this.factory.address);
  });

  it('creates nft template correctly', async () => {
    const ticketTemplateReceipt = await this.registry.createTicketTemplate(
      '{}',
      {
        from: accounts[0],
      }
    );

    const ticketTemplate = await this.registry.experienceTemplates(1);

    assert.strictEqual(ticketTemplate.creator, accounts[0]);
    assert.strictEqual(ticketTemplate.props, '{}');
  });

  it('returns nft templates correctly', async () => {
    const ticketTemplates = await this.registry.getTicketTemplates.call();
  });

  it('returns number nft templates correctly', async () => {
    let numOfticketTemplates = await this.registry.getNumOfTemplates.call();

    numOfticketTemplates = new web3.utils.BN(numOfticketTemplates).toNumber();

    // length 2 because template at position 0 is placeholder "burned" and the one at position 1 is the one we created before
    assert.strictEqual(numOfticketTemplates, 2);
  });

  it('uses nft template correctly', async () => {
    const ticketReceipt = await this.factory.createTicket('{}', 1, {
      from: accounts[0],
    });

    let [ticketCreatedEvent] = ticketReceipt.logs.filter(
      ({ event }) => event === 'TicketCreated'
    );

    templateExpTicketId = ticketCreatedEvent.args.ticketId;
  });

  it('reverts if invalid nft template index is passed', async () => {
    try {
      const ticketReceipt = await this.factory.createTicket('{}', 999, {
        from: accounts[0],
      });
    } catch {}
  });
});

// todo:
// 1. ensure ticket creator receives an nft
// 2. the id counter is incremented correctly (obsolete, but just check once)
// 3. host/guest access nft
