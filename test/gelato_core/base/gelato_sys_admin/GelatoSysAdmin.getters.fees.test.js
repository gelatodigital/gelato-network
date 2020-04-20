// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// Libraries
import { utils } from "ethers";

// GelatoSysAdmin creation time variable values
import initialState from "./GelatoSysAdmin.initialState";

const GAS = utils.bigNumberify(1000000); // 1 mio GAS
const GAS_PRICE = utils.parseUnits("9", "gwei");

describe("GelatoCore - GelatoSysAdmin - Getters: FEES", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // executorSuccessFee
  describe("GelatoCore.GelatoSysAdmin.executorSuccessFee", function () {
    it("Should return the correct executorSuccessFee", async function () {
      const estExecCostBN = GAS.mul(GAS_PRICE);
      const numeratorBN = estExecCostBN.mul(initialState.executorSuccessShare);
      const expectedFee = estExecCostBN.add(numeratorBN.div(100));
      expect(await gelatoCore.executorSuccessFee(GAS, GAS_PRICE)).to.be.equal(
        expectedFee
      );
    });
  });

  // executorSuccessFee
  describe("GelatoCore.GelatoSysAdmin.sysAdminSuccessFee", function () {
    it("Should return the correct sysAdminSuccessFee", async function () {
      const estExecCostBN = GAS.mul(GAS_PRICE);
      const numeratorBN = estExecCostBN.mul(initialState.sysAdminSuccessShare);
      const expectedFee = numeratorBN.div(100);
      expect(await gelatoCore.sysAdminSuccessFee(GAS, GAS_PRICE)).to.be.equal(
        expectedFee
      );
    });
  });
});
