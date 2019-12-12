"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sleep = sleep;

function sleep(ms) {
  return new Promise(function (resolve) {
    console.log("\n\tSleeping for ".concat(ms / 1000, " seconds\n"));
    setTimeout(resolve, ms);
  });
}