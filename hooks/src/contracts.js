const Web3 = require("web3");
const {Contract} = require("web3-eth-contract");
const {abis} = require("./abis");
const {addresses} = require("./addresses");

// export type passThroughWalletType = (web3: Web3) => Contract;

export const passThroughWalletContract = (web3) =>
  new web3.eth.Contract(abis.passThroughWallet, addresses.passThroughWallet);
