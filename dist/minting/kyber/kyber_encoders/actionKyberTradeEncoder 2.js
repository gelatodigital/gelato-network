"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getEncodedActionKyberTradeParams = getEncodedActionKyberTradeParams;
exports.getActionKyberTradePayloadWithSelector = getActionKyberTradePayloadWithSelector;

var _ethers = require("ethers");

// Javascript Ethereum API Library
function getEncodedActionKyberTradeParams(user, src, dest, srcAmount, minConversionRate) {
  var abiCoder = _ethers.utils.defaultAbiCoder;
  var encodedActionParams = abiCoder.encode(["address", "address", "address", "uint256", "uint256"], [user, src, dest, srcAmount, minConversionRate]);
  return encodedActionParams;
}

function getActionKyberTradePayloadWithSelector( // action params
_user, _src, _srcAmt, _dest, _minConversionRate) {
  var actionKyberTradeABI = [{
    name: "action",
    type: "function",
    inputs: [{
      type: "address",
      name: "_user"
    }, {
      type: "address",
      name: "_src"
    }, {
      type: "uint256",
      name: "_srcAmt"
    }, {
      type: "address",
      name: "_dest"
    }, {
      type: "uint256",
      name: "_minConversionRate"
    }]
  }];
  var iFace = new _ethers.utils.Interface(actionKyberTradeABI);
  var actionPayloadWithSelector = iFace.functions.action.encode([_user, _src, _srcAmt, _dest, _minConversionRate]);
  return actionPayloadWithSelector;
}