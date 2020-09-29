const TicketFactory = artifacts.require("TicketFactory");
const TestXP = artifacts.require("TestXP");

module.exports = async (deployer, network, accounts) => {
  const testXP = await TestXP.deployed();

  await deployer.deploy(
    TicketFactory,
    testXP.address,
    "0x50c3374fd62dd09F18ccc01e1c20f5dE66cD6dEA",
    "ExperienceNftFactory",
    "XPFCT"
  );
};
