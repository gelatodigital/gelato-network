// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

import initialState from "./GelatoGasPriceOracle.initialState";

describe("GelatoCore - GelatoGasPriceOracle - Setters:", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoGasPriceOracleFactory;

  let owner;
  let oracle;
  let randomGuy;

  let ownerAddress;
  let oracleAddress;
  let randomGuyAddress;

  let gelatoGasPriceOracle;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoGasPriceOracleFactory = await ethers.getContractFactory(
      "GelatoGasPriceOracle"
    );

    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      initialState.gasPrice
    );

    await gelatoGasPriceOracle.deployed();

    [owner, oracle, randomGuy] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    oracleAddress = await oracle.getAddress();
    randomGuyAddress = await randomGuy.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // setOracle
  describe("GelatoCore.GelatoGasPriceOracle.setOracle", function () {
    it("Should let the owner setOracle", async function () {
      // oracle
      expect(await gelatoGasPriceOracle.oracle()).to.be.equal(ownerAddress);

      // setOracle()
      await expect(gelatoGasPriceOracle.setOracle(oracleAddress))
        .to.emit(gelatoGasPriceOracle, "LogOracleSet")
        .withArgs(ownerAddress, oracleAddress);

      // oracle
      expect(await gelatoGasPriceOracle.oracle()).to.be.equal(oracleAddress);
    });

    it("Should NOT let non-Owners setOracle", async function () {
      // setOracle: revert
      await expect(
        gelatoGasPriceOracle.connect(randomGuy).setOracle(oracleAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // setOracle
      await gelatoGasPriceOracle.setOracle(oracleAddress);

      // setOracle: revert
      await expect(
        gelatoGasPriceOracle.connect(oracle).setOracle(randomGuyAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // setGasPrice
  describe("GelatoCore.GelatoGasPriceOracle.setGasPrice", function () {
    it("Should let the oracle setGasPrice", async function () {
      const newGasPrice = initialState.gasPrice.add(42069);

      // setGasPrice()
      await expect(gelatoGasPriceOracle.setGasPrice(newGasPrice))
        .to.emit(gelatoGasPriceOracle, "LogGasPriceSet")
        .withArgs(initialState.gasPrice, newGasPrice);

      // setOracle()
      await gelatoGasPriceOracle.setOracle(oracleAddress);

      // setGasPrice()
      await expect(
        gelatoGasPriceOracle.connect(oracle).setGasPrice(newGasPrice.add(69420))
      )
        .to.emit(gelatoGasPriceOracle, "LogGasPriceSet")
        .withArgs(newGasPrice, newGasPrice.add(69420));

      // gasPrice
      expect(await gelatoGasPriceOracle.latestAnswer()).to.be.equal(
        newGasPrice.add(69420)
      );
    });

    it("Should NOT let non-Oracles setGasPrice", async function () {
      // setOracle()
      await gelatoGasPriceOracle.setOracle(oracleAddress);

      // setGasPrice: revert
      await expect(
        gelatoGasPriceOracle
          .connect(owner)
          .setGasPrice(initialState.gasPrice.add(42069))
      ).to.be.revertedWith("GelatoGasPriceOracle.onlyOracle");

      // setOracle
      await gelatoGasPriceOracle.setOracle(oracleAddress);

      // setGasPrice: revert
      await expect(
        gelatoGasPriceOracle
          .connect(randomGuy)
          .setGasPrice(initialState.gasPrice.add(42069))
      ).to.be.revertedWith("GelatoGasPriceOracle.onlyOracle");
    });
  });
});
