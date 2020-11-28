const PassThroughWallet = artifacts.require('PassThroughWallet');

const gsnTrustedForwarderAddress = '0x100549F0bccC2eC5De62D7f85919399D7332FCdb';

module.exports = function (deployer) {
  deployer.deploy(PassThroughWallet, gsnTrustedForwarderAddress);
};
