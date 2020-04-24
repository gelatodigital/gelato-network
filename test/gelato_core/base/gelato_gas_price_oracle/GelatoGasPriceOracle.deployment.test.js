// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

import initialState from "./GelatoGasPriceOracle.initialState";

describe("GelatoCore - GelatoSysAdmin - Deployment", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCoreFactory;
  let GelatoGasPriceOracleFactory;

  let gelatoCore;
  let gelatoGasPriceOracle;

  let owner;
  let ownerAddress;

  before(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoGasPriceOracleFactory = await ethers.getContractFactory(
      "GelatoGasPriceOracle"
    );

    gelatoCore = await GelatoCoreFactory.deploy();
    gelatoGasPriceOracle = await GelatoCoreFactory.deploy();
    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      gelatoCore.address,
      initialState.gasPrice
    );

    await gelatoCore.deployed();
    await gelatoGasPriceOracle.deployed();
    await gelatoGasPriceOracle.deployed();

    [owner] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("Should initialize only the creation time state variables", async function () {
    expect(await gelatoGasPriceOracle.owner()).to.equal(ownerAddress);
    expect(await gelatoGasPriceOracle.oracle()).to.equal(ownerAddress);
    expect(await gelatoGasPriceOracle.gelatoCore()).to.equal(
      gelatoCore.address
    );
    await expect(gelatoGasPriceOracle.getGasPrice()).to.be.revertedWith(
      "GelatoGasPriceOracle.onlyGelatoCore"
    );
  });
});
