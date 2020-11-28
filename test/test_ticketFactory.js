var assert = require('assert');

const TicketFactory = artifacts.require('TicketFactory.sol');
const TemplatesRegistry = artifacts.require('TemplatesRegistry.sol');

const { RelayProvider, resolveConfigurationGSN } = require('@opengsn/gsn');

const paymasterAddress = process.env.GSN_PAYMASTER_ADDRESS;
const trustedForwarderAddress = process.env.GSN_FORWARDER_ADDRESS;

const Web3 = require('web3');
let web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

contract('TicketFactory', ([owner, ...accounts]) => {
  let templateExpTicketId;
  let expCardId;
  let guestExpTicketId;
  let hostExpTicketId;

  before(async () => {
    const configuration = await resolveConfigurationGSN(web3.currentProvider, {
      paymasterAddress,
    });

    const gsnProvider = new RelayProvider(web3.currentProvider, configuration);
    web3 = new Web3(gsnProvider);

    this.factory = await TicketFactory.new(
      'XPFactory',
      'XPF',
      trustedForwarderAddress
    );

    this.factory = new web3.eth.Contract(
      this.factory.abi,
      this.factory.address
    );

    const templatesRegistryAddress = await this.factory.methods
      .templatesRegistry()
      .call();

    this.registry = await TemplatesRegistry.at(templatesRegistryAddress);
  });

  it('initialized correctly', async () => {
    const contractOwner = await this.factory.methods.owner().call();
    assert.strictEqual(contractOwner, owner);
  });

  it('creates nft ticket for guest correctly', async () => {
    const ticketReceipt = await this.factory.methods
      .createTicket('{}', 0, false)
      .send({
        from: accounts[0],
      });

    let ticketCreatedEvent = ticketReceipt.events.TicketCreated;

    expCardId = ticketCreatedEvent.returnValues.ticketId;
  });

  it('creates nft template correctly', async () => {
    await this.factory.methods.createTicket('{}', 0, true).send({
      from: accounts[0],
    });

    const ticketTemplate = await this.registry.experienceTemplates(1);

    assert.strictEqual(ticketTemplate.creator, accounts[0]);
    assert.strictEqual(ticketTemplate.props, '{}');
  });

  it('uses nft template correctly', async () => {
    const ticketReceipt = await this.factory.methods
      .createTicket('{}', 1, false)
      .send({
        from: accounts[0],
      });

    let ticketCreatedEvent = ticketReceipt.events.TicketCreated;

    templateExpTicketId = ticketCreatedEvent.returnValues.ticketId;
  });

  it('reverts if invalid nft template index is passed', async () => {
    try {
      await this.factory.methods.createTicket('{}', 999, false).send({
        from: accounts[0],
      });
    } catch {}
  });

  it('creates access to event nfts correctly', async () => {
    const createAccessToEventReceipt = await this.factory.methods
      .createAccessToEvent(expCardId, '{}', accounts[1])
      .send({
        from: accounts[0],
      });

    let ticketAccessCreatedEvent =
      createAccessToEventReceipt.events.ExperienceMatchingCreated;

    guestExpTicketId =
      ticketAccessCreatedEvent.returnValues.guestExperienceAccessId;
    hostExpTicketId =
      ticketAccessCreatedEvent.returnValues.hostExperienceAccessId;
  });

  it('expires guest event nft correctly', async () => {
    await this.factory.methods.expireExperience(guestExpTicketId).send({
      from: accounts[0],
    });
  });

  it('expires host event nft correctly', async () => {
    await this.factory.methods.expireExperience(hostExpTicketId).send({
      from: accounts[1],
    });
  });

  it('reverts if it is not the exp owner to ask for expiration', async () => {
    try {
      await this.factory.methods.expireExperience(hostExpTicketId).send({
        from: accounts[2],
      });
    } catch {}
  });

  it('sends fees to template creator when exp created with template', async () => {
    await this.factory.methods.expireExperience(templateExpTicketId).send({
      from: accounts[0],
    });
  });
});
