"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var Web3 = require("web3");

var _require = require("../index"),
    payEth = _require.payEth,
    createTable = _require.createTable,
    putUserExpBalance = _require.putUserExpBalance,
    getUserBalance = _require.getUserBalance;

var payIntoWallet = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var provider, web3, privateKey, account;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            provider = new Web3.providers.HttpProvider("https://kovan.infura.io/v3/".concat(process.env.INFURA_KEY));
            web3 = new Web3(provider); // * this is how to set up web3 with a private key for automatic ECDSA
            // * signing of the messages
            // ! this may be quite dangerous to do in the mobile app
            // ! if your phone is compromised through a hack, your funds are lost
            // !!! This is a fake private key for testing purposes. do not use

            privateKey = process.env.PRIVATE_KEY;
            account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
            web3.eth.accounts.wallet.add(account);
            web3.eth.defaultAccount = account.address; // -------- PAYING INTO OUR CONTRACT ---------------- //

            _context.next = 8;
            return payEth({
              ethAmount: 0.01,
              senderAddress: web3.defaultAccount,
              senderUserId: 0,
              web3: web3
            });

          case 8:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function payIntoWallet() {
    return _ref.apply(this, arguments);
  };
}();

var createDbTable = function createDbTable() {
  createTable();
}; // to update, you would just call this same function, but with a
// different expBalance value


var updateUserBalance = function updateUserBalance() {
  putUserExpBalance({
    userId: 0,
    expBalance: 20
  });
};

var getUserExpBalance = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
    var data;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return getUserBalance(0);

          case 2:
            data = _context2.sent;
            console.debug(data);

          case 4:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function getUserExpBalance() {
    return _ref2.apply(this, arguments);
  };
}();

payIntoWallet(); // createDbTable();
// updateUserBalance();
// getUserExpBalance();