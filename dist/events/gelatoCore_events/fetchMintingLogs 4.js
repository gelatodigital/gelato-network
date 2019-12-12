"use strict";

var _ethers = require("ethers");

var _sleep = require("../../helpers/sleep.js");

var _path = require("path");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

require("dotenv").config({
  path: (0, _path.resolve)(__dirname, "../../../.env")
});

var DEV_MNEMONIC = process.env.DEV_MNEMONIC;
var INFURA_ID = process.env.INFURA_ID;
console.log("\n\t\t env variables configured: ".concat(DEV_MNEMONIC !== undefined && INFURA_ID !== undefined)); // Contract Addresses for instantiation

var gelatoCoreAddress; // Setting up Provider and Signer (wallet)

var provider; // The block from which we start

var searchFromBlock;

if (process.env.ROPSTEN) {
  console.log("\n\t\t \u2705 connected to ROPSTEN \u2705 \n");
  provider = new _ethers.providers.InfuraProvider("ropsten", INFURA_ID);
  searchFromBlock = process.env.ROPSTEN_BLOCK;
  gelatoCoreAddress = process.env.GELATO_CORE_ADDRESS_ROPSTEN;
} else {
  console.log("\n\t\t \u2757NO NETWORK DEFINED \u2757\n");
}

console.log("\n\t\t Starting from block number: ".concat(searchFromBlock));

if (searchFromBlock === "" || searchFromBlock === undefined) {
  throw new Error("You must have a block number set in your env;'");
} // Read Instance of GelatoCore


var gelatoCoreContractABI = ["event LogNewExecutionClaimMinted(address indexed selectedExecutor, uint256 indexed executionClaimId, address indexed userProxy, address trigger, bytes triggerPayloadWithSelector, address action, bytes actionPayloadWithSelector, uint256 executeGas, uint256 executionClaimExpiryDate, uint256 mintingDeposit)"];

function main() {
  var currentBlock, iface, topicExecutionClaimMinted, filterExecutionClaimMinted, logsExecutionClaimMinted, executionClaimsMinted, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, obj, _i, _Object$entries, _Object$entries$_i, key, value;

  return regeneratorRuntime.async(function main$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(provider.getBlockNumber());

        case 2:
          currentBlock = _context.sent;
          console.log("\n\t\t Current block number:     ".concat(currentBlock)); // Log Parsing

          iface = new _ethers.utils.Interface(gelatoCoreContractABI); // LogNewExecutionClaimMinted

          topicExecutionClaimMinted = _ethers.utils.id("LogExecutionClaimMinted(address,uint256,address,address,bytes,address,bytes,uint256,uint256,uint256)");
          filterExecutionClaimMinted = {
            address: gelatoCoreAddress,
            fromBlock: parseInt(searchFromBlock),
            topics: [topicExecutionClaimMinted]
          };
          _context.prev = 7;
          _context.next = 10;
          return regeneratorRuntime.awrap(provider.getLogs(filterExecutionClaimMinted));

        case 10:
          logsExecutionClaimMinted = _context.sent;
          executionClaimsMinted = logsExecutionClaimMinted.reduce(function (acc, log, i) {
            var parsedLog = iface.parseLog(log);

            if (!acc[i]) {
              acc[i] = [];
            }

            acc[i] = {
              selectedExecutor: parsedLog.values.selectedExecutor,
              executionClaimId: parsedLog.values.executionClaimId,
              userProxy: parsedLog.values.userProxy,
              trigger: parsedLog.values.trigger,
              triggerPayloadWithSelector: parsedLog.values.triggerPayloadWithSelector,
              action: parsedLog.values.action,
              actionPayloadWithSelector: parsedLog.values.actionPayloadWithSelector,
              executeGas: parsedLog.values.executeGas,
              executionClaimExpiryDate: parsedLog.values.executionClaimExpiryDate,
              mintingDeposit: parsedLog.values.mintingDeposit
            };
            return acc;
          }, []); // Log The Event Values

          if (!(executionClaimsMinted.length === 0)) {
            _context.next = 16;
            break;
          }

          console.log("\n\n\t\t Minting Logs: NONE");
          _context.next = 35;
          break;

        case 16:
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context.prev = 19;

          for (_iterator = executionClaimsMinted[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            obj = _step.value;

            for (_i = 0, _Object$entries = Object.entries(obj); _i < _Object$entries.length; _i++) {
              _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2), key = _Object$entries$_i[0], value = _Object$entries$_i[1];
              console.dir("".concat(key, ": ").concat(value));
            }

            console.log("\n");
          }

          _context.next = 27;
          break;

        case 23:
          _context.prev = 23;
          _context.t0 = _context["catch"](19);
          _didIteratorError = true;
          _iteratorError = _context.t0;

        case 27:
          _context.prev = 27;
          _context.prev = 28;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 30:
          _context.prev = 30;

          if (!_didIteratorError) {
            _context.next = 33;
            break;
          }

          throw _iteratorError;

        case 33:
          return _context.finish(30);

        case 34:
          return _context.finish(27);

        case 35:
          _context.next = 40;
          break;

        case 37:
          _context.prev = 37;
          _context.t1 = _context["catch"](7);
          console.log(_context.t1);

        case 40:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[7, 37], [19, 23, 27, 35], [28,, 30, 34]]);
}

main()["catch"](function (err) {
  return console.error(err);
});