// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

import initialState from "./GelatoGasPriceOracle.initialState";

describe("GelatoCore - GelatoGasPriceOracle - Deployment", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoGasPriceOracleFactory;

  let gelatoGasPriceOracle;

  let owner;
  let ownerAddress;

  before(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoGasPriceOracleFactory = await ethers.getContractFactory(
      "GelatoGasPriceOracle"
    );

    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      initialState.gasPrice
    );

    await gelatoGasPriceOracle.deployed();

    [owner] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("Should initialize only the creation time state variables", async function () {
    expect(await gelatoGasPriceOracle.owner()).to.equal(ownerAddress);
    expect(await gelatoGasPriceOracle.oracle()).to.equal(ownerAddress);
    expect(await gelatoGasPriceOracle.latestAnswer()).to.be.equal(
      initialState.gasPrice
    );
  });
});
