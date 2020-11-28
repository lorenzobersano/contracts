const PassThroughWallet = artifacts.require('PassThroughWallet');

const gsnTrustedForwarderAddress = process.env.GSN_FORWARDER_ADDRESS;

module.exports = function (deployer) {
  deployer.deploy(PassThroughWallet, gsnTrustedForwarderAddress);
};
