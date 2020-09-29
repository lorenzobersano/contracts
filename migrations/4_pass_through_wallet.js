const PassThroughWallet = artifacts.require("PassThroughWallet");

module.exports = function (deployer) {
  deployer.deploy(PassThroughWallet);
};
