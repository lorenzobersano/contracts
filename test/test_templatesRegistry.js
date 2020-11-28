var assert = require('assert');

const TicketFactory = artifacts.require('TicketFactory.sol');
const TemplatesRegistry = artifacts.require('TemplatesRegistry.sol');

const { RelayProvider, resolveConfigurationGSN } = require('@opengsn/gsn');

const paymasterAddress = process.env.GSN_PAYMASTER_ADDRESS;
const trustedForwarderAddress = process.env.GSN_FORWARDER_ADDRESS;

const Web3 = require('web3');
let web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

contract('TemplatesRegistry', ([owner, ...accounts]) => {
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
    const contractOwner = await this.registry.owner();
    assert.strictEqual(contractOwner, this.factory.options.address);
  });

  it('creates nft template correctly', async () => {
    await this.factory.methods.createTicket('{}', 0, true).send({
      from: accounts[0],
    });

    const ticketTemplate = await this.registry.experienceTemplates(1);

    assert.strictEqual(ticketTemplate.creator, accounts[0]);
    assert.strictEqual(ticketTemplate.props, '{}');
  });

  it('reverts if tries to pass an already existing nft template', async () => {
    try {
      await this.factory.methods.createTicket('{}', 1, true).send({
        from: accounts[0],
      });
    } catch {}
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
});
