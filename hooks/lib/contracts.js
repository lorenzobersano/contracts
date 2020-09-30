"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.passThroughWalletContract = void 0;

var Web3 = require("web3");

var _require = require("web3-eth-contract"),
    Contract = _require.Contract;

var _require2 = require("./abis"),
    abis = _require2.abis;

var _require3 = require("./addresses"),
    addresses = _require3.addresses; // export type passThroughWalletType = (web3: Web3) => Contract;


var passThroughWalletContract = function passThroughWalletContract(web3) {
  return new web3.eth.Contract(abis.passThroughWallet, addresses.passThroughWallet);
};

exports.passThroughWalletContract = passThroughWalletContract;