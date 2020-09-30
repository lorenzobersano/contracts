"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.payEth = exports.putUserExpBalance = exports.getUserBalance = exports.createTable = exports.updateAwsConfig = exports.ethToExp = void 0;

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// const Web3 = require("web3");
var AWS = require("aws-sdk");

var _require = require("./addresses"),
    addresses = _require.addresses; // type payEthArgType = {
//   ethAmount: number,
//   senderAddress: string,
//   web3: Web3
// };
// this is our fixed exchange rate for now


var ethToExp = 300;
exports.ethToExp = ethToExp;

var updateAwsConfig = function updateAwsConfig() {
  AWS.config.update({
    region: "eu-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
};

exports.updateAwsConfig = updateAwsConfig;

var createTable = function createTable() {
  updateAwsConfig();
  var dyno = new AWS.DynamoDB();
  var params = {
    TableName: "UserExpBalances",
    KeySchema: [{
      AttributeName: "userId",
      KeyType: "HASH"
    }],
    AttributeDefinitions: [{
      AttributeName: "userId",
      AttributeType: "N"
    }],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  var handleError = function handleError(err) {
    if (err.code === "ResourceInUseException") {
      console.debug("table already created");
      return;
    }

    throw err;
  };

  dyno.createTable(params, function (err, data) {
    if (err) handleError(err);
    console.debug(data);
  });
};

exports.createTable = createTable;

var getUserBalance = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(userId) {
    var docClient, params, data, expBalance;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            updateAwsConfig();
            docClient = new AWS.DynamoDB.DocumentClient();
            params = {
              TableName: "UserExpBalances",
              KeyConditionExpression: "#ui = :uival",
              ExpressionAttributeNames: {
                "#ui": "userId"
              },
              ExpressionAttributeValues: {
                ":uival": Number(userId)
              }
            };
            _context.prev = 3;
            _context.next = 6;
            return docClient.query(params).promise();

          case 6:
            data = _context.sent;
            expBalance = data.Items[0].expBalance;
            return _context.abrupt("return", expBalance);

          case 11:
            _context.prev = 11;
            _context.t0 = _context["catch"](3);
            console.error(_context.t0);
            return _context.abrupt("return");

          case 15:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[3, 11]]);
  }));

  return function getUserBalance(_x) {
    return _ref.apply(this, arguments);
  };
}();

exports.getUserBalance = getUserBalance;

var putUserExpBalance = function putUserExpBalance(_ref2) {
  var userId = _ref2.userId,
      expBalance = _ref2.expBalance;
  updateAwsConfig();
  var docClient = new AWS.DynamoDB.DocumentClient();
  var params = {
    TableName: "UserExpBalances",
    Item: {
      userId: userId,
      expBalance: expBalance
    }
  };
  docClient.put(params, function (err, data) {
    if (err) {
      console.error(err);
      return;
    }

    console.debug(data);
  });
}; // lets the user pay into the wallet
// this invokes the update of their EXP balance in DynamoDB


exports.putUserExpBalance = putUserExpBalance;

var payEth = /*#__PURE__*/function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(_ref3) {
    var ethAmount, senderAddress, senderUserId, web3, receipt, currentExpBalance, expAcquired, newBalance;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            ethAmount = _ref3.ethAmount, senderAddress = _ref3.senderAddress, senderUserId = _ref3.senderUserId, web3 = _ref3.web3;
            _context2.next = 3;
            return web3.eth.sendTransaction({
              from: senderAddress,
              to: addresses.passThroughWallet,
              value: web3.utils.toWei(String(ethAmount), "ether"),
              gas: "5000000"
            });

          case 3:
            receipt = _context2.sent;
            console.debug("-- Receipt PassThroughWallet", receipt); // TODO: assert successful txn before updating the db values

            currentExpBalance = getUserBalance(userId);
            expAcquired = (Number(ethAmount) * ethToExp).toFixed(2);
            newBalance = currentExpBalance + expAcquired; // no checks here to ensure that table exists. Your responsibility to spin up local
            // in prod, we will just have a url, so no need for this check

            putUserExpBalance({
              userId: senderUserId,
              expBalance: newBalance
            });

          case 9:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function payEth(_x2) {
    return _ref4.apply(this, arguments);
  };
}();

exports.payEth = payEth;