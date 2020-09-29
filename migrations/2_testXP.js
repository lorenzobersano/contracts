const TestXP = artifacts.require("TestXP");

module.exports = function (deployer) {
  deployer.deploy(TestXP, "Experience", "XP");
};
