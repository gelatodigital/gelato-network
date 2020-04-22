// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Deployment", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;
  let testAddress;

  before(async function () {
    // Get the ContractFactory and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    const [account] = await ethers.getSigners();
    testAddress = await account.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("Should initialize only the creation time state variables", async function () {
    expect(await gelatoCore.NO_CEIL()).to.equal(initialState.NO_CEIL);
    expect(await gelatoCore.providerFunds(testAddress)).to.equal(
      initialState.providerFunds
    );
    expect(await gelatoCore.executorStake(testAddress)).to.equal(
      initialState.executorStake
    );
    expect(await gelatoCore.executorByProvider(testAddress)).to.equal(
      initialState.executorByProvider
    );
    expect(await gelatoCore.executorProvidersCount(testAddress)).to.equal(
      initialState.executorProvidersCount
    );
    expect(
      await gelatoCore.iceCreamGasPriceCeil(testAddress, constants.HashZero)
    ).to.equal(initialState.iceCreamGasPriceCeil);
  });
});
