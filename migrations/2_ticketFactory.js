const TicketFactory = artifacts.require('TicketFactory');

const gsnTrustedForwarderAddress = '0x100549F0bccC2eC5De62D7f85919399D7332FCdb';

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(
    TicketFactory,
    'ExperienceNftFactory',
    'XPFCT',
    gsnTrustedForwarderAddress
  );
};
