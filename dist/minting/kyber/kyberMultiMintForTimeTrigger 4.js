"use strict";

var _ethers = require("ethers");

var _sleep = require("../../helpers/sleep.js");

var _path = require("path");

var _actionKyberTradeEncoder = require("./kyber_encoders/actionKyberTradeEncoder.js");

var _multiMintTimeTriggerEncoder = require("../multi_mint/time_trigger/multiMintTimeTriggerEncoder.js");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

require("dotenv").config({
  path: (0, _path.resolve)(__dirname, "../../../.env")
});

var DEV_MNEMONIC = process.env.DEV_MNEMONIC;
var INFURA_ID = process.env.INFURA_ID;
console.log("\n\t\t env variables configured: ".concat(DEV_MNEMONIC !== undefined && INFURA_ID !== undefined)); // Contract Addresses

var actionMultiMintTimeTriggerAddress;
var triggerTimestampPassedAddress;
var actionKyberTradeAddress;
var src;
var dest; // Contract Addresses for instantiation

var gelatoCoreAddress;
var kyberProxyAddress;
var userProxyAddress; // Setting up Provider and getting network-specific variables

var provider;

if (process.env.ROPSTEN) {
  console.log("\n\t\t \u2705 connected to ROPSTEN \u2705 \n");
  provider = new _ethers.providers.InfuraProvider("ropsten", INFURA_ID);
  gelatoCoreAddress = process.env.GELATO_CORE_ADDRESS_ROPSTEN;
  kyberProxyAddress = "0x818E6FECD516Ecc3849DAf6845e3EC868087B755";
  userProxyAddress = process.env.USER_PROXY_ADDRESS_ROPSTEN;
  actionMultiMintTimeTriggerAddress = process.env.ACTION_MULTI_MINT_TIME_TRIGGER_ADDRESS_ROPSTEN;
  triggerTimestampPassedAddress = process.env.TRIGGER_TIMESTAMP_PASSED_ROPSTEN;
  actionKyberTradeAddress = process.env.ACTION_KYBER_TRADE_ROPSTEN;
  src = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6"; // Ropsten KNC

  dest = "0xaD6D458402F60fD3Bd25163575031ACDce07538D"; // Ropsten DAI
} else {
  console.error("\n\t\t \u2757NO NETWORK DEFINED \u2757\n");
}

provider.getBlockNumber().then(function (blocknumber) {
  return console.log("\n\t\t Current block number: ".concat(blocknumber));
}); // Signer (wallet)

var wallet = _ethers.Wallet.fromMnemonic(DEV_MNEMONIC);

var connectedWallet = wallet.connect(provider); // Read Instance of KyberContract

var kyberABI = ["function getExpectedRate(address src, address dest, uint srcQty) view returns(uint,uint)"];
var kyberContract = new _ethers.Contract(kyberProxyAddress, kyberABI, provider); // ReadInstance of GelatoCore

var gelatoCoreABI = ["function getMintingDepositPayable(address _selectedExecutor, address _action) view returns(uint)"];
var gelatoCoreContract = new _ethers.Contract(gelatoCoreAddress, gelatoCoreABI, provider); // Read-Write Instance of UserProxy

var userProxyABI = ["function execute(address _action, bytes _actionPayload) payable returns(bool success, bytes returndata)"];
var userProxyContract = new _ethers.Contract(userProxyAddress, userProxyABI, connectedWallet); // Arguments for userProxy.execute(address target, bytes memory data)

var TARGET_ADDRESS = actionMultiMintTimeTriggerAddress; // Arguments for function call to multiMintProxy.multiMint()

var START_TIME = Math.floor(Date.now() / 1000); // Specific Action Params: encoded during main() execution

var USER = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";

var SRC_AMOUNT = _ethers.utils.parseUnits("10", 18); // minConversionRate async fetched from KyberNetwork during main() execution


var SELECTED_EXECUTOR_ADDRESS = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
var INTERVAL_SPAN = "120"; // 300 seconds

var NUMBER_OF_MINTS = "2"; // ABI encoding function

// The execution logic
function main() {
  var minConversionRate, _ref, _ref2, ACTION_KYBER_PAYLOAD_WITH_SELECTOR, MULTI_MINT_PAYLOAD_WITH_SELECTOR, etherscanProvider, ethUSDPrice, MINTING_DEPOSIT_PER_MINT, MSG_VALUE, tx, txReceipt;

  return regeneratorRuntime.async(function main$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(kyberContract.getExpectedRate(src, dest, SRC_AMOUNT));

        case 2:
          _ref = _context.sent;
          _ref2 = _slicedToArray(_ref, 2);
          _ = _ref2[0];
          minConversionRate = _ref2[1];
          console.log("\n\t\t minConversionRate: ".concat(_ethers.utils.formatUnits(minConversionRate, 18), "\n")); // Encode the specific params for ActionKyberTrade

          ACTION_KYBER_PAYLOAD_WITH_SELECTOR = (0, _actionKyberTradeEncoder.getActionKyberTradePayloadWithSelector)(USER, src, SRC_AMOUNT, dest, minConversionRate);
          console.log("\t\t ActionKyber Payload With Selector: \n ".concat(ACTION_KYBER_PAYLOAD_WITH_SELECTOR, "\n")); // Encode the payload for the call to MultiMintForTimeTrigger.multiMint

          MULTI_MINT_PAYLOAD_WITH_SELECTOR = (0, _multiMintTimeTriggerEncoder.getMultiMintForTimeTriggerPayloadWithSelector)(SELECTED_EXECUTOR_ADDRESS, triggerTimestampPassedAddress, START_TIME.toString(), actionKyberTradeAddress, ACTION_KYBER_PAYLOAD_WITH_SELECTOR, INTERVAL_SPAN, NUMBER_OF_MINTS);
          console.log("\t\t Encoded Payload With Selector for multiMint:\n ".concat(MULTI_MINT_PAYLOAD_WITH_SELECTOR, "\n")); // Getting the current Ethereum price

          etherscanProvider = new _ethers.providers.EtherscanProvider();
          _context.next = 14;
          return regeneratorRuntime.awrap(etherscanProvider.getEtherPrice());

        case 14:
          ethUSDPrice = _context.sent;
          console.log("\n\t\t Ether price in USD: ".concat(ethUSDPrice));
          _context.next = 18;
          return regeneratorRuntime.awrap(gelatoCoreContract.getMintingDepositPayable(SELECTED_EXECUTOR_ADDRESS, actionKyberTradeAddress));

        case 18:
          MINTING_DEPOSIT_PER_MINT = _context.sent;
          console.log("\n\t\t Minting Deposit Per Mint: ".concat(_ethers.utils.formatUnits(MINTING_DEPOSIT_PER_MINT, "ether"), " ETH \t\t").concat(ethUSDPrice * parseFloat(_ethers.utils.formatUnits(MINTING_DEPOSIT_PER_MINT, "ether")), " $"));
          MSG_VALUE = MINTING_DEPOSIT_PER_MINT.mul(NUMBER_OF_MINTS);
          console.log("\n\t\t Minting Deposit for ".concat(NUMBER_OF_MINTS, " mints: ").concat(_ethers.utils.formatUnits(MSG_VALUE, "ether"), " ETH \t ").concat(ethUSDPrice * parseFloat(_ethers.utils.formatUnits(MSG_VALUE, "ether")), " $")); // send tx to PAYABLE contract method

          _context.prev = 22;
          _context.next = 25;
          return regeneratorRuntime.awrap(userProxyContract.execute(TARGET_ADDRESS, MULTI_MINT_PAYLOAD_WITH_SELECTOR, {
            value: MSG_VALUE,
            gasLimit: 2000000
          }));

        case 25:
          tx = _context.sent;
          console.log("\n\t\t userProxy.execute(multiMintForTimeTrigger) txHash:\n \t".concat(tx.hash));
          console.log("\n\t\t waiting for transaction to get mined \n");
          _context.next = 30;
          return regeneratorRuntime.awrap(tx.wait());

        case 30:
          txReceipt = _context.sent;
          console.log("\n\t\t minting tx mined in block ".concat(txReceipt.blockNumber));
          _context.next = 37;
          break;

        case 34:
          _context.prev = 34;
          _context.t0 = _context["catch"](22);
          console.log(_context.t0);

        case 37:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[22, 34]]);
} // What to execute when running node


main()["catch"](function (err) {
  return console.log(err);
});