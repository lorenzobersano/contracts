const TicketFactory = artifacts.require('TicketFactory');

const gsnTrustedForwarderAddress = process.env.GSN_FORWARDER_ADDRESS;

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(
    TicketFactory,
    'ExperienceNftFactory',
    'XPFCT',
    gsnTrustedForwarderAddress
  );
};
