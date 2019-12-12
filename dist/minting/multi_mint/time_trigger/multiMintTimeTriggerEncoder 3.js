"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMultiMintForTimeTriggerPayloadWithSelector = getMultiMintForTimeTriggerPayloadWithSelector;

var _ethers = require("ethers");

// Javascript Ethereum API Library
function getMultiMintForTimeTriggerPayloadWithSelector(selectedExecutor, timeTrigger, startTime, action, actionPayloadWithSelector, intervalSpan, numberOfMints) {
  var multiMintABI = [{
    name: "action",
    type: "function",
    inputs: [{
      type: "address",
      name: "_selectedExecutor"
    }, {
      type: "address",
      name: "_timeTrigger"
    }, {
      type: "uint256",
      name: "_startTime"
    }, {
      type: "address",
      name: "_action"
    }, {
      type: "bytes",
      name: "_actionPayloadWithSelector"
    }, {
      type: "uint256",
      name: "_intervalSpan"
    }, {
      type: "uint256",
      name: "_numberOfMints"
    }]
  }];
  var iFace = new _ethers.utils.Interface(multiMintABI);
  var encodedMultiMintPayloadWithSelector = iFace.functions.action.encode([selectedExecutor, timeTrigger, startTime, action, actionPayloadWithSelector, intervalSpan, numberOfMints]);
  return encodedMultiMintPayloadWithSelector;
}