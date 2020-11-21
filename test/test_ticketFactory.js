var assert = require('assert');

const TicketFactory = artifacts.require('TicketFactory.sol');

// note this is rinkeby DAI for now. We need this to be XP tokens address
// const xpTokenAddr = "0xf80a32a835f79d7787e8a8ee5721d0feafd78108";
// not this is my address
// const xpCollector = "0x50c3374fd62dd09f18ccc01e1c20f5de66cd6dea";
// const ticketCreator = "0xF2CfffD0D154805503E9D16C4832f960DEDa03fF";

contract('TicketFactory', ([owner, ...accounts]) => {
  let templateExpTicketId;
  let guestExpTicketId;
  let hostExpTicketId;

  before(async () => {
    this.factory = await TicketFactory.new('XPFactory', 'XPF');
  });

  it('initialized correctly', async () => {
    const contractOwner = await this.factory.owner();
    assert.strictEqual(contractOwner, owner);
  });

  it('creates nft ticket for guest correctly', async () => {
    const ticketReceipt = await this.factory.createTicket('{}', -1, {
      from: accounts[0],
    });

    let [ticketCreatedEvent] = ticketReceipt.logs.filter(
      ({ event }) => event === 'TicketCreated'
    );

    guestExpTicketId = ticketCreatedEvent.args.ticketId;
  });

  it('creates nft ticket for host correctly', async () => {
    const ticketReceipt = await this.factory.createTicket('{}', -1, {
      from: accounts[1],
    });

    let [ticketCreatedEvent] = ticketReceipt.logs.filter(
      ({ event }) => event === 'TicketCreated'
    );

    hostExpTicketId = ticketCreatedEvent.args.ticketId;
  });

  it('creates nft template correctly', async () => {
    const ticketTemplateReceipt = await this.factory.createTicketTemplate(
      '{}',
      {
        from: accounts[0],
      }
    );

    const ticketTemplate = await this.factory.experienceTemplates(1);

    assert.strictEqual(ticketTemplate.creator, accounts[0]);
    assert.strictEqual(ticketTemplate.props, '{}');
  });

  it('returns nft templates correctly', async () => {
    const ticketTemplates = await this.factory.getTicketTemplates.call();
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

  it('creates access to event nfts correctly', async () => {
    const createAccessToEventReceipt = await this.factory.createAccessToEvent(
      guestExpTicketId,
      '{}',
      accounts[1],
      {
        from: accounts[0],
      }
    );
  });

  it('expires guest event nft correctly', async () => {
    const expireEventReceipt = await this.factory.expireExperience(
      guestExpTicketId,
      {
        from: accounts[0],
      }
    );
  });

  it('expires host event nft correctly', async () => {
    const expireEventReceipt = await this.factory.expireExperience(
      hostExpTicketId,
      {
        from: accounts[1],
      }
    );
  });

  it('reverts if it is not the exp owner to ask for expiration', async () => {
    try {
      const expireEventReceipt = await this.factory.expireExperience(
        hostExpTicketId,
        {
          from: accounts[2],
        }
      );
    } catch {}
  });

  it('sends fees to template creator when exp created with template', async () => {
    const expireEventReceipt = await this.factory.expireExperience(
      templateExpTicketId,
      {
        from: accounts[0],
      }
    );
  });
});

// todo:
// 1. ensure ticket creator receives an nft
// 2. the id counter is incremented correctly (obsolete, but just check once)
// 3. host/guest access nft
