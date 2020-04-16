// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

describe("GelatoCore - GelatoSysAdmin - Deployment", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCoreFactory;
  let GelatoGasPriceOracleFactory;

  let owner;
  let ownerAddress;

  let gelatoGasPriceOracle;

  const INITIAL_GAS_PRICE = utils.parseUnits("5", "gwei");

  before(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoGasPriceOracleFactory = await ethers.getContractFactory(
      "GelatoGasPriceOracle"
    );

    gelatoGasPriceOracle = await GelatoCoreFactory.deploy();
    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      gelatoGasPriceOracle.address,
      INITIAL_GAS_PRICE
    );

    await gelatoGasPriceOracle.deployed();
    await gelatoGasPriceOracle.deployed();

    [owner] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("Should initialize only the creation time state variables", async function () {
    expect(await gelatoGasPriceOracle.owner()).to.equal(ownerAddress);
    expect(await gelatoGasPriceOracle.oracleAdmin()).to.equal(ownerAddress);
    await expect(gelatoGasPriceOracle.getGasPrice()).to.be.revertedWith(
      "GelatoGasPriceOracle.onlyGelatoCore"
    );
  });
});
