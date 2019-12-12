"use strict";

var _ethers = require("ethers");

var _sleep = require("../helpers/sleep.js");

var _path = require("path");

// Javascript Ethereum API Library
// Helpers
// ENV VARIABLES
require("dotenv").config({
  path: (0, _path.resolve)(__dirname, "../../.env")
});

var DEV_MNEMONIC = process.env.DEV_MNEMONIC;
var INFURA_ID = process.env.INFURA_ID;
console.log("\n\t\t env variables configured: ".concat(DEV_MNEMONIC !== undefined && INFURA_ID !== undefined)); // Contract Addresses

var erc20Address = process.env.ERC20; // Setting up Provider and getting network-specific variables

var provider;

if (process.env.ROPSTEN) {
  console.log("\n\t\t \u2705 connected to ROPSTEN \u2705 \n");
  provider = new _ethers.providers.InfuraProvider("ropsten", INFURA_ID);
} else if (process.env.RINKEBY && !process.env.ROPSTEN) {
  console.log("\n\t\t \u2705 connected to RINKEBY \u2705 \n");
  provider = new _ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
} else {
  console.log("\n\t\t \u2757NO NETWORK DEFINED \u2757\n");
} // Signer (wallet)


var wallet = _ethers.Wallet.fromMnemonic(DEV_MNEMONIC);

var connectedWallet = wallet.connect(provider);
var ierc20ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
var erc20Contract = new _ethers.Contract(erc20Address, ierc20ABI, connectedWallet); // Arguments for erc20.contract.approve

var SPENDER = process.env.SPENDER;
var AMOUNT = process.env.AMOUNT;

function main() {
  var tx, txReceipt;
  return regeneratorRuntime.async(function main$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(erc20Contract.approve(SPENDER, AMOUNT));

        case 3:
          tx = _context.sent;
          console.log("\n\t\t approve tx hash:\n\t ".concat(tx.hash));
          _context.next = 7;
          return regeneratorRuntime.awrap(tx.wait());

        case 7:
          txReceipt = _context.sent;
          console.dir(txReceipt);
          _context.next = 14;
          break;

        case 11:
          _context.prev = 11;
          _context.t0 = _context["catch"](0);
          console.error(_context.t0);

        case 14:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 11]]);
}

main()["catch"](function (err) {
  return console.error(err);
});