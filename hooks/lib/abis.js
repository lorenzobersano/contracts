"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.abis = void 0;

var _web3Utils = require("web3-utils");

var _PassThroughWallet = _interopRequireDefault(require("../build/contracts/PassThroughWallet.json"));

var _TicketFactory = _interopRequireDefault(require("../build/contracts/TicketFactory.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

// type abisType = {
//   passThroughWallet: AbiItem,
//   ticketFactory: AbiItem
// };
// TODO: hacking with ignore. this is a common problem with string
// how to solve it?
var abis = {
  // @ts-ignore
  passThroughWallet: _PassThroughWallet["default"].abi,
  // @ts-ignore
  ticketFactory: _TicketFactory["default"].abi
};
exports.abis = abis;