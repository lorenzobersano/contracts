const TicketFactory = artifacts.require('TicketFactory');

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(TicketFactory, 'ExperienceNftFactory', 'XPFCT');
};
